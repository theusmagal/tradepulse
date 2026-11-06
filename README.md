This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Isolated development configuration

Create `.env.local` in the repository root for Next.js. It is ignored by Git.
Use a dedicated development PostgreSQL database; never copy production database URLs
into a test environment. Prisma CLI commands also need `DATABASE_URL` and `DIRECT_URL`
in the shell environment (Next.js loads `.env.local`, but Prisma CLI does not).

| Variable | Development value / purpose |
| --- | --- |
| `DATABASE_URL` | Connection URL for the dedicated development database. |
| `DIRECT_URL` | Direct connection URL to that same development database, without a pooler. |
| `NEXTAUTH_URL` | `http://localhost:3000`, or the exact origin/port used locally. |
| `NEXTAUTH_SECRET` | Generate a development-only secret with `openssl rand -hex 32`; save it locally, never commit it. |
| `STRIPE_SECRET_KEY` | Stripe sandbox/test-mode secret key from Stripe Dashboard → Developers → API keys. Required when billing modules load. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret from a Stripe CLI forwarding session or sandbox webhook endpoint, for signed webhook tests. |
| `STRIPE_PRICE_ID_MONTHLY` / `STRIPE_PRICE_ID_ANNUAL` | Sandbox recurring price IDs for real test-mode checkout. |
| `NEXT_PUBLIC_APP_URL` | The same local origin, for checkout return URLs. |
| `DATA_KEY` | A development-only 32-byte base64 encryption key (`openssl rand -base64 32`), needed for broker connection storage. `APP_ENCRYPTION_KEY` is the alternative 32-byte hex format. |

Enter secrets directly into your local environment file or secret manager, never
into chat, issues, logs, or source files. Do not replace or rotate existing
production secrets for local testing. Broker tests require separate read-only
test credentials; leave verification enabled.

After confirming that both database URLs refer only to the development database:

```bash
pnpm install --frozen-lockfile
pnpm exec prisma generate
# DATABASE_URL and DIRECT_URL must be exported in this shell:
pnpm exec prisma migrate deploy
pnpm run dev
```

Register a disposable account through `/auth/register`. Password login uses the
normal NextAuth CSRF flow and signed/encrypted session cookies. A signed-in user
without an active membership is expected to be redirected to billing. For isolated
membership tests, seed a trial on a disposable test user in the development
database; do not weaken `requireMember` or change production users.

## Verification

```bash
node --test tests/*.test.mjs
pnpm run lint
pnpm exec tsc --noEmit --incremental false
pnpm run build
```

Geist fonts are supplied by the pinned `geist` package and served locally. Builds
and page loads do not need Google Fonts network access after dependencies are
installed. A build pass does not prove live database, billing, or broker access.

Registration normalizes new email addresses to match login. Existing accounts
stored with mixed-case emails still need a separate collision-aware data review;
do not blindly lowercase production records.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
