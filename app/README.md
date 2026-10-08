# AlgoNook

The React/Vite application for AlgoNook, an interactive data structures and algorithms learning platform.

## Development

From this directory, run `npm install` once and then `npm run dev` to start the local app. Use `npm run build` for a production build and `npm run lint` for the configured ESLint checks.

Configure local credentials in `.env.local` using the variable names documented in `.env.example`. Never commit real credentials. Authentication, learning progress, and code execution use the existing Clerk, Neon, and server API integrations; see `CODE_EXECUTION_ARCHITECTURE.md` for the execution flow.

The repository-level README describes the full project setup and available validation commands.
