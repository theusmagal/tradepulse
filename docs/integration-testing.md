# PostgreSQL authentication integration verification

Use a clean checkout of this branch, Node.js 22, pnpm 10.11.0, and Docker with
a running daemon. No database URLs, Stripe keys, broker credentials, or GitHub
repository secrets are needed. Do not copy production environment files here.

```bash
pnpm install --frozen-lockfile
node --test tests/*.test.mjs
pnpm run lint
pnpm test:integration
```

The integration command refuses `.env` files (except `.env.example`) and ignores
inherited application credentials. It always creates its own fresh PostgreSQL 16
Docker container, random database name/password, random test-user password, and
random NextAuth secret. Only the loopback interface is published, on a random
host port. There is no option to supply an existing database or application URL.

The command generates Prisma Client, runs `prisma migrate deploy` and
`prisma migrate status` against that container, builds Next.js, starts the built
production server on loopback, and executes `tests/integration/auth.test.mjs`.
The suite verifies the actual PostgreSQL version and completed migration records.
It does not use PGlite, mocks, a preauthenticated session, or an authentication
bypass. Fixture membership is assigned only to the two users registered by the
suite in its disposable database.

Coverage:

- Registration, persisted password hashing, email normalization and duplicates.
- CSRF rejection, wrong-password rejection, real credential login and cookies.
- Distinct user sessions, anonymous/expired/tampered rejection, and signout.
- Membership denial for nonmembers and access for active/trial members.
- Private journal lists, spoofed-owner rejection, cross-user GET/PUT/DELETE denial
  in both directions, and successful owner updates/deletes.

The database container is removed after success, failure, or ordinary termination.
Forced process/host termination can prevent cleanup; remove only the generated
`tradepulse-integration-*` container from that run if necessary. No persistent
Docker volume is created. Run from a checkout that is not serving another Next.js
process, since the suite rebuilds `.next`.

The `PostgreSQL integration` GitHub Actions workflow runs the same commands on
pull requests to main or the PR #4 branch, and pushes to this test branch. It uses
read-only repository permissions, generated secrets, and no protected environment.
It neither merges nor deploys. The Vercel rule disables deployments for this
review branch as well as the PR #4 branch.

Successful tests verify isolated PostgreSQL behavior, not production data or
Stripe/broker integrations. The Stripe key is a nonfunctional test placeholder
needed to load billing modules; no billing or exchange requests are made.

If Docker is unavailable, start Docker or use the GitHub Actions workflow. Do not
substitute a production URL or disable the suite's database/origin guards.
