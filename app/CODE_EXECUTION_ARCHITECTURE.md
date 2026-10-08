# AlgoNook multi-language code execution architecture

**Status:** Python has a first sandboxed script runner. C++, Java, JavaScript, and C remain `NOT_IMPLEMENTED`. This document records the current Python boundary and remaining architecture needs; execution is not connected to Mission 1 progression.

## Existing project boundary

- React + Vite frontend; current local `/api/sync-user` and `/api/progress` middleware is registered in `app/vite.config.ts`.
- Server API modules are in `app/api/`; they verify Clerk JWTs and use Neon through `@neondatabase/serverless`. No separate backend package or production deployment manifest is present, so the production API adapter/host must be confirmed before implementation.
- Mission 1’s free-code editor and simulated source-structure validation are in `ImplementationStep` within `app/src/screens/DSAProblemFlow.jsx`. It advances using `onContinue({ firstTry })` and reports mistakes through the existing callback.
- `app/src/challenges/CodeChallenge.jsx` is a separate fill-in-the-blanks challenge, not the Mission 1 editor. Neither component nor the progression system is changed here.
- Neon currently stores user/progression data. There is no clear need to store source code there.

## Architecture

```text
React editor
     │ language + sourceCode + bounded stdin/stdout testCases
     └── POST /api/code/execute
             API: Clerk auth + request validation
               ├── Python → Docker CLI adapter → restricted Python container
               └── other languages → NOT_IMPLEMENTED
                     fixed runner protocol → tests → normalized result
```

The API route is **`app/api/code/execute.ts`**. It verifies Clerk auth, validates the request, and dispatches Python to `app/api/code/pythonRunner.mjs`; that adapter uses fixed Docker argument arrays and never evaluates code in Node. The Vite development route uses the same handler. The runner image is built from `app/api/code/python-runner/Dockerfile`; its fixed harness receives a bounded JSON envelope over container stdin, writes the submission only into the container's temporary filesystem, and launches a fresh Python process for each stdin/stdout case. Source is not copied into the application image, mounted from the project, written to Neon, or logged.

Docker is the isolation boundary. Each execution uses no network, a read-only root filesystem, UID/GID 65532, all capabilities dropped, `no-new-privileges`, 128 MiB memory/swap, 0.5 CPU, 32 PIDs, bounded file limits, a 16 MiB `/tmp` tmpfs, no published ports, no host mounts, no Docker socket, and no host environment forwarding. Docker's default seccomp profile remains enabled. Containers are auto-removed and the adapter also performs cleanup. Docker must be installed and its daemon available; the API fails closed with `SANDBOX_ERROR` otherwise. The Vite middleware caps request bodies at 400 KiB.

Build the pinned image with `npm run sandbox:build`; run the development-only Docker checks with `npm run test:sandbox`. The base is `python:3.12.11-slim-bookworm`; learner code runs with Python isolated/no-site mode and standard-library access only. Runtime code executes in the container's child process, never in Node/Vite.

## Language adapter model

Keep a trusted server-side registry keyed by language ID. API and test-runner logic consume a common interface; only the adapter owns toolchain details. Conceptual configuration:

```ts
type LanguageAdapter = {
  id: string;
  displayName: string;
  extension: string;
  version: string;                 // pinned by the service
  compilation: 'required' | 'runtime';
  compilePlan?: FixedCommandPlan;   // server-owned executable/arguments
  runPlan: FixedCommandPlan;
  defaults: { wallTimeMs: number; cpuTimeMs: number; memoryMb: number };
  starterTemplate(problemId: string): string;
  prepare(source: string, sandbox: SandboxContext): PreparedProgram;
};
```

This is a design shape, not a request-controlled configuration. Never accept executable names, flags, file paths, versions, imports, or commands from the browser. Limits are policy-configured per language and problem, with hard service-wide ceilings.

| Language ID | Display | File | Compilation/runtime plan (pinned server toolchain) |
| --- | --- | --- | --- |
| `cpp` | C++ | `.cpp` | `NOT_IMPLEMENTED`; future fixed `g++` compile/run adapter. |
| `java` | Java | `.java` | `NOT_IMPLEMENTED`; future fixed `javac`/`java` adapter. |
| `python` | Python | `.py` | Implemented with pinned Python 3.12.11 in isolated Docker; current contract is script stdin/stdout. |
| `javascript` | JavaScript | `.js` | `NOT_IMPLEMENTED`; future pinned Node.js adapter. |
| `c` | C | `.c` | `NOT_IMPLEMENTED`; future fixed `gcc` compile/run adapter. |

Compiled-language lifecycle remains future work: write source in the sandbox, compile under limits, classify diagnostics as `COMPILE_ERROR`, then execute the artifact. JavaScript also remains future work. The Python adapter currently runs a standalone script once per testcase with that testcase's string `input` on stdin and compares stdout exactly to its string `expected`. It does **not** implement a function-style LeetCode/Contains Duplicate harness. The API never accepts a learner-provided harness; trusted problem-specific wrappers and server-owned tests are still required before judging Mission 1's function.

## Execution and test lifecycle

1. The frontend sends the selected language explicitly. The API authenticates with Clerk, validates the allowlisted language/problem/mode, enforces source/input size limits, rate/admission limits, and creates a short-lived opaque run ID.
2. The service loads the trusted problem signature, wrapper/harness, constraints, and test-set version. For function-style DSA problems, each language gets a trusted wrapper that calls the learner’s function. Use JSON values as the cross-language input/output contract; C’s trusted harness may use a pinned read-only JSON parser. The problem and tests remain the same across language selections.
3. The runner prepares a fresh sandbox and fixed language compile/run plan. Source and test inputs cross a bounded private protocol; source is never interpolated into a shell command.
4. Compiled languages produce an artifact inside the sandbox. A compile failure ends the job as `COMPILE_ERROR`; otherwise execute the artifact. Runtime languages execute through their pinned runtime. Compile and execution each have independent wall/CPU budgets.
5. Run multiple cases in a trusted test runner. Capture bounded stdout/stderr, exit status, duration, and per-test comparison. Stop or continue according to the trusted problem policy; never let learner output redefine expected results.
6. Kill the full process tree at timeout/cancel, collect a bounded result, destroy temporary files, and return a normalized response. Execution must not award XP, write mastery, or mark a mission complete.

## API contract

`POST /api/code/execute`, JSON, requires a valid Clerk session JWT (`Authorization: Bearer …` or the existing `__session` cookie). Example:

```json
{
  "language": "python",
  "sourceCode": "import sys\\nprint(int(sys.stdin.readline()) + 1)",
  "testCases": [
    { "id": "sample-1", "input": "41\\n", "expected": "42\\n" }
  ]
}
```

The API validates language with `getLanguageById`, non-empty source (maximum 64 KiB UTF-8), 1–20 testcase objects (maximum 16 KiB serialized per case), and allowed fields. For Python, each case must have string `input` and string `expected`; output comparison is exact. The dev middleware caps the full request at 400 KiB. Other supported language IDs are validated but return `NOT_IMPLEMENTED`. This stdin/stdout contract is for controlled script exercises only; it does not represent a function-style problem harness. Test data in the request is caller-provided and is not suitable for hidden tests or authoritative grading.

Expected values and official test cases are trusted server-side data. Visible tests may return expected and actual JSON values; hidden tests later return only aggregate counts and opaque test IDs/statuses. The frontend should never receive hidden inputs, expected values, reference solutions, compiler internals, or sandbox paths.

Example normalized response for completed execution (pass or wrong answer can both be HTTP 200):

```json
{
  "runId": "opaque-short-lived-id",
  "problemId": "contains-duplicate",
  "language": "cpp",
  "status": "WRONG_ANSWER",
  "summary": { "passed": 1, "total": 2 },
  "tests": [
    { "id": "sample-1", "status": "PASSED", "expected": true, "actual": true },
    { "id": "sample-2", "status": "WRONG_ANSWER", "expected": false, "actual": true }
  ],
  "diagnostic": null,
  "stdout": "",
  "stderr": "",
  "exitCode": 0,
  "execution": { "compileMs": 210, "durationMs": 5, "memoryPeakMb": 18 }
}
```

Response schemas must cap diagnostics and output. Hidden cases omit `expected` and `actual`. Use HTTP 400/413 for invalid/oversized input, 401 for missing/invalid Clerk auth, 429 for admission limits, and 5xx for runner/service errors. Frontend must validate both HTTP status and response schema. A browser abort is a request/network state, not evidence that the runner timed out.

## Common result model

The overall status and each test status use the same stable enum where applicable:

| Status | Meaning |
| --- | --- |
| `PASSED` | All required tests completed and matched. |
| `WRONG_ANSWER` | Program ran; at least one output differed from the trusted expected value. |
| `COMPILE_ERROR` | A compiled language failed compilation, or source failed runtime parse/load before tests. |
| `RUNTIME_ERROR` | Program started and threw, crashed, returned an invalid result, or exited unexpectedly. |
| `TIME_LIMIT_EXCEEDED` | Trusted watchdog/CPU accounting stopped compilation or execution for exceeding a time budget. Include phase `compile` or `run`. |
| `MEMORY_LIMIT_EXCEEDED` | OS memory enforcement terminated the process. |
| `OUTPUT_LIMIT_EXCEEDED` | A learner exceeded the per-stream or runner-protocol output cap. |
| `SANDBOX_ERROR` | Sandbox could not be created/verified or runner protocol failed; treat as infrastructure failure, not learner error. |
| `SECURITY_REJECTED` | Policy denied the job/operation, e.g. forbidden network or filesystem access; return a generic safe diagnostic. |

Keep phase, exit code/signal, and sanitized bounded diagnostics as fields, not ad hoc status strings. When an individual test is not reached because compilation or process execution failed, report it as `NOT_RUN` with the overall failure explaining why. stdout/stderr are captured independently, bounded, and truncated; learner output is never interpreted as control data.

## Sandbox and security

Every run gets a fresh disposable sandbox, separate from both the browser and main API process:

- Dedicated non-root identity, no capabilities, no secrets/environment inheritance, no host process visibility, and bounded process count; prevent fork bombs and kill/reap the entire process group.
- Enforced CPU and wall-clock budgets for compilation and runtime, memory limits, file descriptor limits, output quotas, and reliable forced termination.
- No network namespace/connectivity, including internet, loopback services, DNS, cloud metadata, API host, and Neon. Deny at OS/network boundary, not only in application code.
- Minimal read-only toolchain/runtime mounts; isolated writable temp directory only; no production filesystem, home directory, source tree, shared writable directory, or credentials. Delete artifacts after the run.
- OS-level syscall and filesystem policy (e.g. rootless container plus seccomp and an LSM policy where available); fail closed if isolation cannot be verified. Containers reduce attack surface but do not by themselves guarantee safety.
- Fixed executable paths and fixed argument vectors, no shell interpolation, arbitrary package installation, dynamic user-selected flags, or runtime loading from writable host paths.
- Bounded request/response, diagnostics, stdout/stderr, test count, concurrency/admission, and runner queue depth if a queue is ever introduced. Authentication does not make source trustworthy.

These boundaries mitigate infinite loops, process spawning, filesystem reads/writes, command execution, malicious imports, environment-variable/secret access, database access, network exfiltration/SSRF, resource exhaustion, and sandbox escape risk. Keep Clerk secrets and Neon credentials solely in the API process and never in runner environment, mounts, logs, or job payloads.

Do not persist source in Neon or application logs. No new persistence is needed to run code. If later abuse analysis needs records, retain only minimal metadata (verified user ID, problem/language/test version, status, resource totals, timestamp) under an explicit retention policy; source retention requires a separate decision.

## Frontend and existing progression compatibility

Future editor UI should keep language selection as independent state/component from the editor. Its execution client sends `{ problemId, language, source, mode }`, tracks pending/network state, and renders the common result model. The same problem specification/test contract feeds every language adapter; only starter templates and adapters vary by language.

When Mission 1 eventually adopts execution, replace the regex validation in `ImplementationStep` with an API call and render the returned results. Keep the existing callbacks: count actual learner failures through `onMistake`; call `onContinue({ firstTry })` only when the required tests pass. Runner outage, sandbox setup failure, or malformed response must not count as a wrong answer. Keep hints and transfer behavior unchanged. `CodeChallenge.jsx` should only be adapted if a future product decision connects that separate component to this editor; its current props must remain intact.

The run endpoint does not award XP, update mastery, record mission completion, or change persistence. Existing learning progression consumes the pass/fail result through the established component contract. Clerk remains the identity boundary; Neon remains unrelated to source execution.

## Adding another language later

Adding Go, Rust, Kotlin, or another language should add an allowlisted adapter/toolchain image or sandbox profile, pinned compiler/runtime version and fixed plans, resource defaults, trusted wrapper support, and language-specific starter template. Add adapter-level compile/run conformance checks. The API request/response schema, problem/test contract, test runner, editor-language separation, and progression callbacks remain unchanged. Keep language-specific launch logic out of React and general API handlers.

## Understanding questions

1. **Why use one common execution API for all languages?** The frontend and test runner need one stable request/result contract. Adapters isolate compile/run differences, so adding or updating a toolchain does not require language-specific API branches throughout the app.
2. **Why compile C++, C, and Java first?** Their source must be translated into an executable or class artifact before it can run. Python and JavaScript are normally loaded and executed by their runtimes, so a separate native compile step is not required (though parsing/loading can still fail).
3. **Why not run all languages in the unrestricted backend process?** Learner code is untrusted and can consume resources, access process permissions/secrets/files/network, or compromise the host. A separate isolated sandbox constrains those capabilities and lets the system terminate and discard a failed run without granting it the API process's authority.
