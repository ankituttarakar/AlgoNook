# AlgoNook code execution architecture

## Production boundary

```text
Browser
  └─ POST /api/code/execute (Clerk session JWT, problemId, Python source, trace flag)
       Vercel API
         ├─ verifies Clerk JWT and validates the request
         ├─ reserves per-user request quota and execution lease in shared Neon state
         ├─ selects the trusted problem registry entry
         └─ signed HTTPS request (problemId + source only; no test payload)
              private AlgoNook execution service
                ├─ verifies HMAC, timestamp, and one-use nonce
                ├─ selects the same trusted problem registry entry
                └─ fixed Docker CLI invocation
                     disposable Python container, no network
              bounded normalized result → Vercel API → existing editor/results/playback
```

The Vercel function never runs Docker or learner code. In production it requires `CODE_RUNNER_URL` and `CODE_RUNNER_SECRET`; if either is absent or invalid, execution fails closed with `SANDBOX_ERROR`. It does not fall back to local Docker in Vercel. Local Vite development may use Docker on the developer machine when `CODE_RUNNER_URL` is not configured.

Coding mission and review submissions through `POST /api/progress/events` use the same per-user admission helper and limits as `/api/code/execute`. Before reserving a lease or running code, the event API checks the authenticated user's current reset generation and existing event idempotency key/reward key. Admission leases also carry those event identities, so concurrent duplicate submissions are rejected without incrementing the quota or starting another runner job. The lease remains held through the idempotent event write; retries of a completed event return the authoritative snapshot without using runner capacity. Final event persistence still enforces idempotency and reset-generation fencing atomically.

## Vercel API contract

`POST /api/code/execute` requires an authenticated Clerk session and accepts exactly:

```json
{
  "language": "python",
  "sourceCode": "def containsDuplicate(nums):\\n    return len(nums) != len(set(nums))",
  "problemId": "contains-duplicate",
  "trace": true
}
```

The request body is limited to 400 KiB by the Vercel function parser; Python source is limited to 64 KiB UTF-8. Unknown fields, including learner-supplied tests, are rejected. The API resolves `problemId` through `server/code/problems/index.mjs`; arbitrary commands, runner image names, shell arguments, and file paths are not accepted.

After authentication and validation, the API admits up to 12 executions per verified Clerk user in a fixed 60-second window and at most 2 concurrent runs for that user. Admission is stored atomically in Neon so separate Vercel instances share the same limits. Execution leases expire after 35 seconds (the remote runner request timeout is 27 seconds) and are released after the request completes. Rejected requests receive HTTP 429 with `Retry-After`. Local development without `DATABASE_URL` uses a bounded process-local fallback; production/Vercel fails closed if shared admission storage is unavailable.

Run `npm run db:migrate` from `app/` against the intended database before enabling this version. The ordered migration is additive and is not applied automatically. Each verified Clerk user has one small admission row; it stores the current request window and at most two short-lived execution leases.

The Vercel function sends only the selected problem ID, source, and trace flag to the execution service. The execution service independently resolves the problem ID using the trusted repository registry and supplies that problem's server-owned test cases to the existing sandbox. This prevents the browser from choosing tests or expected answers. The learning-event function allows up to 60 seconds so the 27-second bounded runner round trip leaves time for admission, trusted verification, persistence, and the authoritative snapshot refresh; configure the Vercel deployment plan to permit that function duration. The runner timeout and sandbox execution limits remain unchanged.

The response shape remains compatible with the coding workspace: `ok`, normalized `status`, `summary`, `tests`, bounded `stdout`/`stderr`, `executionTimeMs`, optional error, and optional trace. The Vercel adapter bounds the response to 512 KiB and rejects malformed results. It does not award XP or mastery; those remain separate client-driven progress records and are not made authoritative by this execution boundary.

## Private execution service

The service entry point is `api/code/runner-service.mjs`, started with `npm run runner:service`. It binds to `127.0.0.1` by default. Put it behind a TLS reverse proxy on the execution host; expose only `POST /internal/execute` through that proxy, apply a request rate limit/body limit there, and firewall the Node listener so it is not directly reachable from the public network. The service additionally requires a shared HMAC secret, so a public request without the Vercel-held secret cannot submit work.

The internal request is HMAC-SHA256 signed over the exact timestamp, nonce, and raw body. The service checks the signature with constant-time comparison, rejects timestamps more than 30 seconds from its clock, and rejects a nonce reused during that window. Keep the service clock synchronized. The nonce cache is in-memory: run one service process/instance; before horizontally scaling, move replay protection to a shared atomic store.

Only the fixed `/internal/execute` path and exact `{ problemId, sourceCode, trace }` body are accepted. The service caps request bodies at 400 KiB, checks the source limit again, uses a trusted problem registry, limits concurrent runs (`RUNNER_MAX_CONCURRENCY`, default 2, maximum 32), and returns a generic 503 on internal runner failures. It does not accept user IDs, credentials, tests, commands, image names, or execution arguments.

## Runner host setup

The execution host needs Node.js, Docker Engine with the Linux container runtime, the matching AlgoNook release checkout, and the runner image. Build the image from the repository root:

```sh
npm run sandbox:build
```

Configure the same randomly generated secret of at least 32 bytes as `CODE_RUNNER_SECRET` on the runner host and the Vercel project. Configure Vercel `CODE_RUNNER_URL` to the HTTPS reverse-proxy origin for the runner service. Keep this secret server-only; do not use a `VITE_` prefix. Start the service under a process supervisor and use the reverse proxy for TLS, request rate limits, and network access control. The service's default listener is loopback; if the proxy runs in a separate container, bind only to the private container network using `RUNNER_BIND_ADDRESS` and keep that network inaccessible to the public internet.

Build the Python sandbox image on every runner host before accepting requests. A missing image or unavailable Docker daemon returns a clean sandbox failure. The runner image tag is pinned in `server/code/pythonRunner.mjs` (`algonook-python-runner:3.12.11`).

## Isolation retained

`server/code/pythonRunner.mjs` uses fixed Docker argument arrays with `shell: false`. The learner container keeps the existing restrictions:

- no network (`--network none`)
- read-only root filesystem and a bounded temporary filesystem
- non-root UID/GID 65532
- all Linux capabilities dropped and `no-new-privileges`
- 128 MiB memory and swap, 0.5 CPU, 32 process limit
- file descriptor and file size limits
- 15-second container execution timeout, per-test process timeout, output caps
- no host mounts, no published ports, and no explicit host environment forwarding
- container cleanup in `finally`, with cleanup of late-created containers as a timeout recovery path

Docker still needs a host-level daemon on the **execution service host**. That requirement has been moved out of the Vercel API runtime, not eliminated. Protect the runner host and Docker daemon as privileged infrastructure.

## Problems, languages, and traces

The trusted registry currently includes the Contains Duplicate, Frequency Map, Two Sum Sorted, and the registered chapter problems in `src/data/codingProblems.js`. The Python harness enforces the expected function signature and compares results against server-selected cases. Learner trace events are bounded to 40 steps and an allowlist of actions; they are visualization data, not grading evidence.

Python is the only runtime execution adapter. Other language IDs may be present in the general language registry, but `/api/code/execute` returns `NOT_IMPLEMENTED` for them. The JavaScript structure check in `DSAProblemFlow` is explicitly a source-shape check, not a runtime judge. The Vercel execution result currently supports the existing UI test list and `ExecutionPlayback` trace display.

## Tests and limits

- `node --test tests/code-runner-service.test.mjs tests/api-auth.test.mjs` checks authenticated API-to-runner signing with a stub executor, trusted-test selection, unauthenticated and invalid requests, API admission and retry behavior, replay rejection, arbitrary command rejection, runner concurrency, runner failure handling, and Vercel fail-closed configuration.
- `npm run test:contains-duplicate` checks trusted Python function execution, wrong answers, syntax errors, and trusted test integrity against the real Docker image.
- `npm run test:sandbox` checks Docker isolation, network and host-file access, time, output, process, and memory limits.
- `npm run build` checks the frontend production build.

The Docker tests require a running Docker daemon and the built runner image. The HMAC gateway tests use a stub executor; they do not prove the external host's TLS, firewall, image provisioning, or Vercel environment configuration. A production smoke test must be run after those external settings are deployed.
