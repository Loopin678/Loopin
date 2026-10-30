# Testing

Loopin is tested at four layers, from fast and narrow to slow and realistic:

| Layer | Tool | What it exercises | Count |
|---|---|---|---|
| Backend unit | Vitest | Pure logic: usernames, access checks, socket rate limiting | 29 |
| Backend integration | Vitest + Supertest + socket.io-client | Real HTTP and sockets against a real PostgreSQL | 91 |
| Frontend unit / component | Vitest + React Testing Library + MSW | Components and hooks with the network mocked at the HTTP level | 53 |
| End-to-end | Playwright (Chromium) | A real browser against the real backend and website | 3 journeys |
| Desktop | Qt Test + CTest | Git operations on real repositories, the backend client, the Link to Task screen | 3 suites, 45 checks |

Every push runs all of them on GitHub Actions ([.github/workflows/ci.yml](../.github/workflows/ci.yml)).

## Running the tests

**Backend** (needs PostgreSQL installed locally; the script starts a throwaway server):

```bash
cd backend
npm run test:db        # starts a test database on 127.0.0.1:55433 (once per boot)
npm test               # or: npm run test:watch, npm run test:coverage
```

**Frontend** (no database or backend needed; the network is mocked):

```bash
cd frontend
npm test               # or: npm run test:coverage
```

**End-to-end** (starts its own backend on port 3100 and website on 5174):

```bash
cd backend && npm run test:db
cd ../e2e
npm install
npm run install-browsers   # once: downloads Chromium for Playwright
npm test                   # or: npm run test:ui
```

**Desktop**:

```bash
cd desktop
cmake -B build-tests -DLOOPIN_BUILD_TESTS=ON
cmake --build build-tests
ctest --test-dir build-tests --output-on-failure
```

## The tests never touch the team database

The backend and end-to-end tests delete every row between tests. Two safeguards keep that away from the shared Supabase database:

1. The test configuration sets its own `DATABASE_URL` before anything loads `backend/.env`, and `dotenv` never overrides a variable that's already set.
2. A guard ([backend/test/setup/guard.ts](../backend/test/setup/guard.ts), and the same check in [e2e/playwright.config.ts](../e2e/playwright.config.ts)) refuses to run unless the database host is `localhost`, `127.0.0.1` or `::1`.

The desktop tests use an in-process fake backend ([desktop/tests/FakeBackend.h](../desktop/tests/FakeBackend.h)) and temporary git repositories, so they need no network or database at all.

## Coverage

From `npm run test:coverage` (HTML reports in `backend/coverage/` and `frontend/coverage/`):

| | Lines | Branches | Functions |
|---|---|---|---|
| Backend | 69% | 61% | 88% |
| Frontend | 19% | 15% | 18% |

The backend's uncovered code is mostly `500 Internal Server Error` branches and the Google/GitHub OAuth services, which call external servers. Frontend unit coverage is low because the largest pages (Board, Chat, Home, Projects) are covered only by the end-to-end journeys, and the unused legacy components in `frontend/src/components/*.tsx` (not wired to any route) count towards the total.

## What each feature is tested by

| Feature | Backend | Frontend | E2E | Desktop |
|---|---|---|---|---|
| Register, log in, log out, sessions | `auth.test.ts` | `Auth.test.tsx`, `client.test.ts` | `board.spec.ts` | |
| Redirect to login and back | | `RouteGuards.test.tsx`, `client.test.ts` | `board.spec.ts` | |
| Projects: create, list, rename, delete | `projects.test.ts` | | `board.spec.ts` | |
| Invitations, members, ownership transfer | `members.test.ts` | `Members.test.tsx`, `NotificationBell.test.tsx`, `useInvitations.test.tsx` | `collaboration.spec.ts` | |
| Lists, tasks, moving tasks, "my tasks" | `tasks.test.ts` | `boardStore.test.ts`, `TaskModal.test.tsx` | `board.spec.ts` | |
| Chat, @mentions, presence, live updates | `sockets.test.ts` | | `collaboration.spec.ts` | |
| Profiles and usernames | `profile.test.ts`, `username.test.ts` | | | |
| Linking commits to tasks | `commits.test.ts` | | | `tst_linktask`, `tst_apiclient` |
| Sign in with Loopin (desktop/CLI) | `device-auth.test.ts` | `Connect.test.tsx`, `ConnectedApps.test.tsx` | | `tst_apiclient` |
| Access control (members only, owner only) | `access.test.ts` + every integration file | | | |
| Rate limiting | `socket-rate-limit.test.ts` | | | |
| Hosting (website served by the backend) | `hosting.test.ts` | | | |
| Git: commit, push, stash, discard, branches, merge conflicts | | | | `tst_gitrepo` |
| AI requests (only selected files, Ollama streaming) | | | | `tst_apiclient` |

## Bugs the tests found

Writing the suite turned up these defects, each fixed with a test that now guards it:

- Deleting a project always failed: every foreign key to `Project` is `ON DELETE RESTRICT`.
- Live updates broke without `JWT_SECRET` set: sockets used a different secret lookup than HTTP.
- Opening a project link while signed out lost the destination after login: the API client hard-reloaded to `/login` on the initial session check. Found by the end-to-end suite.
- Task details exposed assignees' email addresses to every project member.
- A non-owner trying to transfer ownership got a misleading "target must be an active member" error.
- Form labels on Login, Register and the task modal weren't connected to their inputs (inaccessible to screen readers).
- `npm run lint` failed on `main`: a legacy component called React hooks after an early return.
