# AlgoNook

Gamified DSA learning platform: a visual roadmap of data-structure topics, where each
topic moves through a learning loop (concept → visualization → game → pattern →
practice → coding → explanation → transfer → review).

Built with React + Vite, Clerk (auth), Neon PostgreSQL (persistence), and a Docker
sandbox that runs learner Python code against trusted test cases.

## Repository layout

```
AlgoNook/
├── app/                  # The application (all product code lives here)
│   ├── api/              # Serverless API handlers (progress, sync-user, code execution)
│   ├── scripts/          # DB schema, migrations, and script-level tests
│   ├── src/              # React app (screens, challenges, game state, data)
│   ├── tests/            # Playwright specs + node test scripts
│   └── vite.config.ts    # Dev server + API middleware
├── tests/                # Repo-level Playwright scaffold (being unified in app/tests)
├── .github/workflows/    # CI
├── playwright.config.ts  # Repo-level Playwright config
└── package.json          # Repo-level tooling
```

There is exactly **one** Git repository, rooted at this directory.

## Getting started

```bash
cd app
npm install
cp .env.example .env   # then fill in real values — .env is git-ignored
npm run dev
```

### Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | server only | Neon PostgreSQL connection string |
| `CLERK_SECRET_KEY` | server only | Clerk server-side token verification |
| `VITE_CLERK_PUBLISHABLE_KEY` | client | Clerk publishable key |
| `VITE_CLERK_SIGN_IN_URL` / `VITE_CLERK_SIGN_UP_URL` | client | Clerk route URLs |

Rules enforced by `.gitignore`:

- `.env` and `.env.*` are ignored (`.env.example` is the only committed template)
- `auth.json` (Playwright stored auth state) is ignored
- `node_modules/`, `dist/`, `test-results/`, `playwright-report/`, `__pycache__/`,
  `*.pyc` are ignored

Never commit real credentials. Never prefix server secrets with `VITE_`.

## Commands

Run from `app/`:

```bash
npm run dev        # dev server (Vite)
npm run build      # typecheck (tsc -b) + production build
npm run lint       # ESLint
npm run preview    # preview the production build
```

Database:

```bash
node scripts/migrate.js     # apply scripts/schema.sql to DATABASE_URL and verify tables
```

Sandbox:

```bash
npm run sandbox:build       # build the Docker Python runner image
npm run test:sandbox        # sandbox security tests (requires Docker)
```

## Security notes

- Secrets live only in `.env` (ignored) — never in source, never in Git history.
- `/api/code/execute` runs learner code in an isolated Docker sandbox.
- All progress endpoints verify the Clerk session server-side before touching the DB.
