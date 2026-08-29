# Done

*"Need something done? There's a Doer for that."*

A local on-demand task marketplace. Three roles: **Requester** (needs something done), **Doer** (does it), **Done** (the platform — matches, handles payment, takes a fee).

## Stack

- Next.js (App Router, Turbopack, TypeScript) + Tailwind
- Supabase (Postgres, Auth, RLS, Storage)
- Stripe (Checkout for charging Requesters, Connect Express for paying Doers)
- Deploy: GitHub `main` → Vercel (git-linked auto-deploy)

## Local setup

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase + Stripe keys
npm run dev
```

## Database

Schema, RLS policies, and storage bucket policies live in `supabase/migrations/`,
applied in order (`0001` → `0005`). See `supabase/migrations/*.sql` for the
task lifecycle state machine, RLS-as-boundary patterns, and the payout trust
gate. Categories and task types are seeded data (`0004_seed.sql`), not code —
adding a new task type never requires a code change.

The authoritative state machine (structural transitions + which role may
initiate each one) lives in `src/lib/task-state-machine.ts`. Every
status-changing write goes through `src/lib/task-transitions.ts`, which
performs an atomic conditional update (`.eq('status', expectedCurrent)`) and
appends a status-history row — never a blind write.

## Payments

Requester confirmation (`completed -> payout_pending`) creates a Stripe
Checkout Session. The webhook (`/api/stripe/webhook`) marks payment
succeeded, transfers the Doer's cut to their connected Stripe account, and
completes the loop (`payout_pending -> payout_completed`). A Doer marking a
task "done" never by itself triggers payout — see
`src/app/tasks/actions.ts` and the webhook handler.

## Scripts

- `npm run dev` — local dev server
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript, no emit
- `npm run build` — production build
