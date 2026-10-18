# AlgoNook browser QA

Playwright runs the existing browser specs against `QA_BASE_URL`; without it,
`npm run test:e2e` defaults to `http://localhost:3000`. `npm run test:e2e:qa`
requires an explicit deployed Preview or staging URL and never chooses
production. Production is refused by all Playwright commands.

## Required safety setup

1. Use a dedicated Clerk QA account and a non-production database. Never use a
   personal account or production data for the mutating learning/progress tests.
2. Set `QA_EXPECTED_CLERK_USER_ID` to that dedicated account's Clerk user ID.
   `npm run test:e2e:qa` opens a fresh visible Chromium context for each run.
   Sign in there, return to AlgoNook, then press Enter in the terminal to
   confirm. The runner verifies that Clerk reports the
   expected user ID, that the final page origin exactly matches
   `QA_BASE_URL`, and that an authenticated `GET /api/progress` returns HTTP
   200 with `ok: true`. It does not reuse `auth.json` or any saved session.
   The captured Playwright state is stored in a temporary directory outside
   the repository and removed when the run exits.
   The ordinary `npm run test:e2e` command still uses `QA_AUTH_STATE` (default:
   `app/auth.json`) for local runs; this saved state is never used by
   `npm run test:e2e:qa`.
3. For local tests using `npm run test:e2e`, `app/.env.local` must point at the isolated development
   database and must not resolve to the same database host as `app/.env`.
   Explicitly set `QA_DATA_ENV=isolated` and
   `QA_SAFE_DATABASE_HOSTS` to the exact hostname from `.env.local`.
4. For Preview/staging, explicitly set `QA_DATA_ENV=isolated`. Vercel
   deployment-specific `*-git-*.vercel.app` hosts are recognized as Preview.
   Other Preview/staging hosts must be allowlisted using
   `QA_PREVIEW_HOSTS` or `QA_STAGING_HOSTS` (comma-separated hostnames).
5. `npm run test:e2e:qa` accepts only identified Preview or staging targets.
   Production is always refused by this command.

Example for a Vercel Preview (use the dedicated QA account's own values):

```powershell
$env:QA_BASE_URL = 'https://project-git-branch-team.vercel.app'
$env:QA_EXPECTED_CLERK_USER_ID = 'user_qa_account_id'
$env:QA_TARGET_ENV = 'preview'
$env:QA_DATA_ENV = 'isolated'
npm run test:e2e:qa
```

The deployed command always creates fresh state for the current run, even if
`QA_AUTH_STATE` or `auth.json` exists. It does not create accounts, bypass
Clerk, or permit production targets. If identity verification or the
authenticated progress check fails, the browser suite does not start.

`npm run test:e2e:qa` runs the existing desktop suite plus the existing
read-only smoke spec at tablet and mobile sizes. Mutating learning/progress
flows run only in the desktop Chromium project. CI is not configured to run
browser QA.

## Reports and artifacts

The run writes `test-results/QA_REPORT.md`, `test-results/qa-report.json`,
`test-results/screenshots/`, and `test-results/traces/`. The deployed QA
command disables Playwright's HTML report because it can embed raw failure
details. Failure traces are sanitized JSON step summaries, not replayable
Playwright network traces; network traces are disabled so cookies and
authorization headers are not copied into artifacts. The existing full-E2E
collector contributes screen, interaction, console, and network details to the
consolidated report. Ordinary localhost `npm run test:e2e` retains the existing
HTML reporter.

Report text redacts common credential formats and sensitive environment
values; API response bodies and request headers are not recorded. Still treat
QA artifacts as private because screenshots may show test-account UI data.
