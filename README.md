# ParkAndTran

Next.js parking enforcement application with real authentication, role-based authorization, Neon Postgres persistence, and a single-page records workspace.

## Stack

- Next.js App Router
- Auth.js credentials authentication
- Drizzle ORM
- Neon Postgres via `postgres`

## Required Environment Variables

Copy `.env.example` to `.env.local` and set:

- `DATABASE_URL`: Neon Postgres connection string
- `AUTH_SECRET`: random secret used to sign auth cookies and session state
- `SEED_ADMIN_PASSWORD`: optional override for the seeded admin password
- `SEED_BYRON_PASSWORD`: optional override for Byron's seeded password
- `SEED_OFFICER_PASSWORD`: initial officer password for the seed script

## Setup

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Seeded users:

- Admin name: `Gabe`
- Admin username: `WhyteOwl`
- Admin password: `Jackman`
- Officer name: `Byron`
- Officer username: `ByronPAT`
- Officer username: `OfficerDemo`
- Officer email: `officer@example.com`

The admin defaults to `WhyteOwl` / `Jackman` unless `SEED_ADMIN_PASSWORD` is set. Byron defaults to `PATByron` unless `SEED_BYRON_PASSWORD` is set. The demo officer password comes from `SEED_OFFICER_PASSWORD`, defaulting to `OfficerDemo1`.

## Authorization Model

- Unauthenticated users can only access `/login`
- All application routes are protected in middleware and again in server components/actions
- `admin` can access everything, including import and officer management
- `officer` can access dashboard, the full records workspace, plate search, create/edit/delete records, and add locations or violations in context

## Routes

- `/dashboard`
- `/citations` main workspace for writing, editing, deleting, and reviewing records
- `/citations/[id]` redirects into the workspace popup
- `/citations/[id]/edit` redirects into the workspace edit popup
- `/plates`
- `/officers` admin only
- `/locations` redirects to the workspace
- `/violations` redirects to the workspace
- `/add-citation` redirects to the workspace
- `/import` admin only

## Production Readiness Notes

- Keep `DATABASE_URL` and `AUTH_SECRET` server-only. Do not prefix them with `NEXT_PUBLIC_`.
- Deploy to Vercel with the same environment variables set in the project settings.
- Run `npm run db:push` against the production Neon database before first login.
- Seed initial users with `npm run db:seed` in a trusted environment.
- Verify after deployment:
  - logged out users cannot open protected URLs
  - admin and officer role restrictions work as expected
  - creating a citation or warning updates dashboard, citations, and plate history
  - logout clears the session and returns to `/login`
