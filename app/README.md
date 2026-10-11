# AlgoNook

An interactive DSA learning platform built with React and Vite. Its learning loop combines visual lessons, concept games, coding challenges, mastery, and review. Clerk handles authentication, Neon stores progress, and code execution runs through the trusted server-side sandbox.

## Run locally

From `app/`:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Set the Clerk and Neon values in `.env`. Keep server secrets such as `CLERK_SECRET_KEY` and `DATABASE_URL` unprefixed by `VITE_`; never commit credentials.

## Database schema

The canonical fresh-install schema is `scripts/schema.sql`; ordered additive migrations are in `scripts/migrations/`. Before starting the app against a database, set `DATABASE_URL` to the intended database and run `npm run db:migrate`. The command records applied versions and checksums in `schema_migrations`, applies each file atomically, and refuses edits to previously applied incremental migrations. It does not run automatically at application startup. Verify migration names and SQL parsing without a database using `npm run db:migrate -- --check`.

Authenticated database-backed APIs check the migration version and required tables, columns, and indexes before reading or writing data. An outdated/incompatible schema returns a controlled 503; a database connection/query failure returns a separate generic 503. The health check never repairs schema. Apply migrations only to the explicitly intended database; CI never runs `db:migrate` without `--check`.

## Validation

```powershell
npm run build
npm run lint
node --test tests/*.test.mjs
npx tsc -b
```

For Vercel, use the repository root, `npm run build`, and `dist` as the output directory. Set Clerk and Neon environment variables in the Vercel project settings.
