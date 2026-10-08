# AlgoNook — Complete Project Explanation (Interview Ready)

## 🎯 The 30-Second Answer

> "AlgoNook is a **gamified DSA learning platform** — think Duolingo meets LeetCode. Learners follow a visual roadmap of data-structure topics, and each topic goes through a structured loop: **learn the concept → watch an interactive visualization → play a reasoning game → learn the pattern → quick practice → solve a full coding mission**. It has XP, levels, stars, and a 5-tier mastery system with spaced repetition. It's built with **React + Vite**, uses **Clerk for auth**, **Neon Postgres** for persistence, and has a **secure Docker sandbox** that actually runs the learner's Python code against trusted test cases."

---

## 🧱 Tech Stack (say this confidently)

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 19 + Vite 7 | Fast dev server, SPA |
| Styling | Tailwind CSS + shadcn/ui (40+ components) | Rapid consistent UI |
| Code editor | Monaco Editor (same as VS Code) | Real coding feel |
| Auth | Clerk (JWT verification) | Secure, handles sign-in/signup |
| Database | Neon Serverless Postgres | Serverless SQL, `@neondatabase/serverless` |
| API | Vite dev-middleware handlers in `api/` (no separate backend server) | One process, simple deployment |
| Code execution | Docker sandbox (Python 3.12) | Isolation of untrusted code |
| Tests | Playwright (E2E) + Node `node:test` (unit) | Both UI flows and logic |

**Key architectural point you should say:** *"There's no separate backend server — the API handlers live in `app/api/` and are registered as Vite middleware (`vite.config.ts`), and each handler also exports a serverless-style `(req, res)` default so it can be deployed to a serverless host later."*

---

## 🗺️ How the App Works (User Flow)

Navigation is a **client-side state machine** in `App.jsx` (not React Router) — just a `screen` state + `navigate()` function.

### The Learning Loop (the core of the product)

```
Roadmap → Topic → Concept → Visualize → Game → Pattern → Practice → Mission → Debrief → Review
```

1. **Roadmap** (`RoadmapScreen`) — 15 nodes: Foundations → Arrays → Hashing → Two Pointers → … → DP → Interview Patterns. Each node has prerequisites and states: `LOCKED / AVAILABLE / IN_PROGRESS / MASTERED / REVIEW_DUE`.
2. **Concept** — what/why/when + a quiz gate; you **can't continue until you pass the concept check**.
3. **Visualize** — interactive animations (array traversal, two pointers converging, hash buckets, binary search halving, Big-O growth curves). **You must click a control** before continue unlocks — deliberate "learn by doing" gating.
4. **Game** — a "Reasoning Lab" with stage types: `trace, predict, build, repair, debug, complexity-duel, pattern-match, constraint-challenge`.
5. **Pattern** — when to recognize this pattern, classic LeetCode problems, and **when NOT to use it**.
6. **Practice** — sequential micro-quizzes (complexity, trace, pattern-match, short answer).
7. **Mission** — the full problem flow (below), then a **Debrief** with XP/stars/mastery, and a **Review** dashboard.

**Interview gold:** *"The whole curriculum is data-driven — adding a new topic means adding one entry to `roadmap.js` plus content files. No UI changes needed; the screens are generic renderers."*

---

## 🎮 Missions (the coding problems)

Two mission types:

**a) Classic missions** (`RunScreen`) — multiple choice / ordering / a stack-queue "machine" simulator challenge.

**b) Interview-style problem flow** (`DSAProblemFlow`, `learningFlow: true`) — a **10-step pipeline that mirrors a real interview**:

```
PROBLEM → UNDERSTAND → PATTERN → APPROACH → COMPLEXITY →
PSEUDOCODE (ordering) → CODE (editor) → TEST CASES → EXPLAIN → TRANSFER
```

~29 missions across topics (e.g. `arr-1` Contains Duplicate, `arr-2` Two Pointers, `hsh-1` Frequency Map).

### The Code Editor — how validation works (very likely interview question)

**Dual-mode validation** in `ImplementationStep` (`DSAProblemFlow.jsx:160-407`):

- **JavaScript mode → static regex checks** (a lightweight "linter"): each requirement has a regex pattern (e.g. `seen.has(num)` must appear), plus an **ordering check** (e.g. `seen.has` must appear *before* `seen.add` — catches the classic insert-before-check bug). Not real execution.
- **Python mode → real execution**: POSTs to `/api/code/execute` with a Clerk Bearer token, and only advances if **all trusted server-side tests pass** (`trustedRunPassed` gate).
- **C++/Java/C** → "practice mode, coming soon" banner.

> **Say this:** *"I deliberately used static structural checks for JS as a cheap first layer, and built the real sandbox execution path for Python. That's a conscious build-vs-secure trade-off, not an oversight."*

---

## ⚙️ Progression System (memorize these formulas)

**XP** (`game/progression.js`):
- Base: Easy 20 / Medium 35 / Hard 55
- Mission completion bonus: **+40 XP**
- First-try streak: **+5 per streak, capped at +20**
- Correct after a mistake: **40% of base**
- Used a hint but first try: **60% of base**
- Replay: **25% of result**

**Levels:** `xpForLevel(L) = 50 × (L−1) × L` → L2 = 100 XP, L3 = 300 XP, etc.

**Stars:** 3 stars = 0 mistakes, 2 stars = 1–2, 1 star = 3+.

**Mastery — 5 tiers** (`game/mastery.js`):
```
introduced → guided → practicing → independent → retained
```
- Promotions are **sequential**, e.g. `practicing → independent` requires: solve passed + ≤2 hint levels used + 0 mistakes + correct explanation + transfer passed.
- `independent → retained` requires **3 successful independent solves**.

**Spaced repetition:** review due in **1 / 3 / 7 / 14 days** depending on mastery tier. `reviewDue = now + intervalDays`. ReviewScreen groups skills into Due / Learning / Mastered.

**Hint Ladder** — 6 progressive levels: goal → nudge → pattern → invariant → pseudocode → code skeleton. Revealed one at a time; **using hint level >2 blocks "independent solve" credit**. This is a pedagogical design: hints cost you mastery, not just XP.

---

## 🔐 Backend & Data (the "senior" part of the interview)

### Database — 5 tables (`scripts/schema.sql`)
| Table | Purpose |
|---|---|
| `users` | Clerk identity (`clerk_id` unique) + callsign |
| `user_progress` | XP, level (1:1 per user) |
| `mission_progress` | best stars/mistakes per mission (unique user+mission) |
| `skill_mastery` | 5-tier level, hint stats, `review_due_at` per skill |
| `mission_attempts` | append-only log of every attempt (telemetry) |

### Auth pattern (asked often)
All API handlers do the same thing:
1. Extract token from `Authorization: Bearer` header, falling back to `__session` cookie
2. `verifyToken(token, { secretKey })` from `@clerk/backend`
3. **Identity = the verified JWT `sub`** — never trust a client-supplied user ID
4. Fail closed with a **generic 401** — error messages never leak JWT internals (there's an actual test asserting this: `tests/api-auth.test.mjs`)

### Endpoints
- `POST /api/sync-user` — upserts user row on sign-in (`ON CONFLICT (clerk_id)` → idempotent)
- `GET/POST /api/progress` — loads/saves XP+level; client saves are **debounced 600ms**, and on load it takes `max(local, server)` XP to avoid regressions
- `POST /api/code/execute` — code execution (below)

---

## 🐳 Code Execution Sandbox (the crown jewel — expect deep questions)

**Flow:**
```
Monaco editor → POST /api/code/execute (Clerk JWT)
  → execute.ts: auth → validate (only 3 known problemIds, ≤64KiB source, 3 allowed fields)
  → pythonRunner.mjs: docker create/start via spawn() with FIXED args, shell:false
  → python_runner.py inside container: AST gate → run each test → framed JSON result
  → normalized status back to frontend
```

**Security hardening (list as many as you can):**
- `--network none` (zero network, not even localhost/DNS)
- `--read-only` root FS, non-root `--user 65532:65532`
- `--cap-drop ALL`, `--security-opt no-new-privileges`, default seccomp
- `--memory 128m`, `--cpus 0.5`, `--pids-limit 32`, fd/file-size ulimits
- 16 MiB **noexec** `/tmp` tmpfs for scratch space
- No secrets/env forwarding, no host mounts, no Docker socket, no published ports
- Timeouts: 2s per test, 15s total; output caps 4KiB/test, 128KiB total
- Python runs as `python3 -I -S -B` (isolated, no site-packages, no bytecode)
- **Fails closed**: Docker missing → `SANDBOX_ERROR` → HTTP 503 (infra failure, never counted as learner's wrong answer)

**Trusted test design (great answer to "how do you prevent cheating?"):**
- Test cases come from the **server-side problem registry**, not the client
- The runner **AST-validates** the submission: must be exactly one function with the correct name/params, no decorators → else `COMPILE_ERROR`
- Each test runs in a **fresh subprocess** with a trusted harness the learner can't influence
- **Strict return type checks** (bool must literally be `type is bool`, frequency map must be `dict[str, positive int]`)
- Learner code is **never stored in Neon, never logged, never written to the app image**

**3 implemented problems:** `containsDuplicate` (bool), `countFrequencies` (dict), `twoSumSorted` (index pair). C++/Java/C/JS = `NOT_IMPLEMENTED` by design (adapter interface documented for future).

**Security verification tests** (`npm run test:sandbox`) actually assert: network blocked, host env not visible, host filesystem unreadable, process spawning hits EAGAIN, 512MiB allocation gets killed. The script even warns: *"Do not relax sandbox settings to make them pass."*

---

## 🕹️ The 3 Mini-Games (each targets one classic misconception)

| Game | Topic | What you do | Misconception it fixes |
|---|---|---|---|
| **Set Memory Sprint** | Arrays | Scan values, decide "add to seen" vs "duplicate found — stop" | Checking membership *after* inserting (self-match bug) |
| **Frequency Map Builder** | Hashing | Choose "init key=1" vs "increment" for each item, then recall highest-count key | Confusing *distinct count* with *frequency* |
| **Pointer Movement Game** | Two Pointers | On a sorted array, decide move-left / move-right / record pair | Moving pointers without reasoning from evidence |

Plus **5 interactive visualizations** (ArrayTraversal, TwoPointers, HashTable with collision chaining, BinarySearch with dimmed eliminated ranges, ComplexityGrowth on log scale).

---

## ✅ Testing & CI

- **Playwright E2E** (11 specs): full learning loops per topic, full-app flows, auth diagnostics, no-console-error assertions
- **`node:test` unit tests** (4): API auth contract (no secret leakage, fail-before-DB), problem data integrity/frozen test cases, game engine contracts (shuffled options never leave correct answer in position 1!), two-pointers wiring
- **Sandbox scripts**: `test:sandbox` (hardening), `test:contains-duplicate` (correct → PASSED, wrong → WRONG_ANSWER, redefining globals doesn't work)
- **CI**: GitHub Actions on push/PR → Node LTS → `npm ci` → install Playwright browsers → run tests → upload HTML report (30-day retention)

---

## 💬 Likely Interview Questions + Your Answers

**Q: What was the hardest part?**
→ "The code execution sandbox. Running untrusted user code safely means thinking about network isolation, filesystem, privileges, resource limits, and process termination — and then writing tests that *prove* the isolation works, not just assume it."

**Q: Why Docker instead of just running code in Node?**
→ "Learner code is untrusted. Running it in the API process would give it access to our secrets, DB credentials, filesystem, and network. Docker gives a disposable, OS-level boundary we can destroy after each run. Also, we never evaluate code in Node — the adapter only spawns Docker with fixed argument arrays."

**Q: How do you prevent someone from cheating the tests?**
→ "Tests live server-side in a trusted registry. The request only sends source + problem ID. Inside the container, a trusted harness calls their function — they can't touch `expected` values. I also added an AST gate so submissions must be exactly one correctly-signed function."

**Q: How does the app scale to new topics?**
→ "Everything is data-driven. `roadmap.js` declares nodes/prereqs/stages; concepts, patterns, practice, visualizations, missions, and games are separate content files keyed by node ID. The screens are generic renderers — adding a topic is content, not code."

**Q: localStorage vs database — what's synced?**
→ "Everything is written to localStorage instantly (offline-safe, key `algonook.save.v1`). XP and level sync to Neon via debounced POST, and on load we take max(local, server) so nothing regresses. Mission/mastery detail is currently local-only — that's a deliberate boundary I'd extend next."

**Q: What would you do next?**
→ "Wire the remaining 4 language adapters (the interface is designed), connect execution results to Mission 1 progression instead of regex validation, sync mission/skill data to Neon, and move API handlers to a real serverless deploy."

**Q: Why is wrong answer HTTP 200?**
→ "Because a wrong answer is a *successful execution*, not a server failure. Only infrastructure problems (sandbox down) return 503, and the frontend is taught never to count a runner outage as a learner mistake."

---

## 🧠 One-Line Summary Per Layer (memorize these)

- **Frontend:** "React SPA with a state-machine navigation, data-driven curriculum, and gated learning stages."
- **Pedagogy:** "Concept → visualization → game → pattern → practice → scaffolded problem flow, with progressive hint ladders and 5-tier mastery."
- **Backend:** "Vite-middleware API with Clerk JWT verification and Neon Postgres — 5 tables covering identity, progress, missions, mastery, and attempt telemetry."
- **Security:** "Docker sandbox with no network, read-only FS, no privileges, 128MB/0.5CPU/32-pid limits, trusted server-side tests, AST validation, fail-closed error handling."
- **Testing:** "Playwright E2E for learning flows, node:test for contracts, and sandbox tests that actively verify isolation properties."
