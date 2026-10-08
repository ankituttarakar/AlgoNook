# AlgoNook

An interactive DSA learning platform built with React and Vite. Its learning loop combines visual lessons, concept games, coding challenges, mastery, and review. Clerk handles authentication, Neon stores progress, and code execution runs through the trusted server-side sandbox.

## Run locally

From the repository root:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Set the Clerk and Neon values in `.env.local`. Keep server secrets such as `CLERK_SECRET_KEY` and `DATABASE_URL` unprefixed by `VITE_`; never commit credentials.

## Validation

```powershell
npm run build
npm run lint
node --test tests/*.test.mjs
```

For Vercel, use the repository root, `npm run build`, and `dist` as the output directory. Set Clerk and Neon environment variables in the Vercel project settings.
