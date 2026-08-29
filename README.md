# Done

*"Need something done? There's a Doer for that."*

This is the **customer-facing** app of the Done marketplace — one of three
separate Next.js apps (Done = customer, Doer = worker, Done Admin = internal
dashboard) that share ONE Supabase backend. See each repo's README for its
role; this one covers requesting tasks, tracking them in real time,
messaging your Doer, paying + tipping, rating, and receipts/history.

## Stack

- Next.js (App Router, Turbopack, TypeScript) + Tailwind
- Supabase (Postgres, Auth, RLS, Storage, Realtime) — shared with the Doer and Done Admin apps
- Stripe (Checkout for charging Requesters, Connect Express for paying Doers) — this app owns the webhook
- Deploy: GitHub `main` → Vercel (git-linked auto-deploy)

## Local setup

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase + Stripe keys
npm run dev
```

## Database

Schema, RLS policies, and storage bucket policies live in `supabase/migrations/`,
applied in order (`0001` → `0008`). Apply these to the SAME Supabase project
used by the Doer and Done Admin apps — never a separate database per app.
See `supabase/migrations/*.sql` for the task lifecycle state machine,
RLS-as-boundary patterns, the payout trust gate, messaging, tips, Doer
availability, account suspension, and rating aggregation.

The authoritative state machine (structural transitions + which role may
initiate each one) lives in `src/lib/task-state-machine.ts`. Every
status-changing write goes through `src/lib/task-transitions.ts`, which
performs an atomic conditional update (`.eq('status', expectedCurrent)`) and
appends a status-history row — never a blind write. This file is identical
across all three apps by design (copy in lockstep, don't fork the logic).

## Payments

Requester confirmation (`completed -> payout_pending`) creates a Stripe
Checkout Session for price + tip. The webhook (`/api/stripe/webhook`,
owned only by this app) marks payment succeeded, transfers the Doer's cut
(+ 100% of the tip) to their connected Stripe account, and completes the
loop (`payout_pending -> payout_completed`). A Doer marking a task "done"
(in the Doer app) never by itself triggers payout.

## Realtime

`src/lib/realtime.ts` wraps Supabase Realtime `postgres_changes`
subscriptions (tasks, messages, notifications) so status changes made in
the Doer or Admin app show up here without a manual refresh.

## Scripts

- `npm run dev` — local dev server
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript, no emit
- `npm run build` — production build
