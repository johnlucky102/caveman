---
name: testing-kindergarten-management
description: Test the kindergarten-management app. Use when verifying TypeScript fixes, UI changes, or runtime behavior in the kindergarten-management subdirectory.
---

# Testing kindergarten-management

## Project Structure

- **Location**: `kindergarten-management/` subdirectory (monorepo)
- **Stack**: React + TypeScript + Vite + Tailwind CSS + Supabase
- **Package manager**: pnpm
- **Entry point**: `src/main.tsx` → `src/App.tsx`

## Quick Verification Commands

```bash
cd kindergarten-management

# TypeScript check (primary verification for type-level changes)
npx tsc -b --noEmit

# Lint
pnpm run lint

# Build (may fail due to known tailwind.config.js CJS/ESM issue — see Known Issues)
pnpm run build

# Dev server
npx vite --port 5173
```

## Authentication

- App uses **Supabase** auth (`src/lib/supabase.ts`)
- Env vars: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`
- All pages except `/login` are protected by `RoleGuard` (`src/components/auth/RoleGuard.tsx`)
- Roles: `Admin`, `Teacher`, `Accountant`, `Parent`
- Without valid Supabase credentials, you can only test the `/login` page UI and shell-based verification (tsc, lint, build)

## Devin Secrets Needed

- `SUPABASE_TEST_EMAIL` — email for a test account with Admin role (for authenticated page testing)
- `SUPABASE_TEST_PASSWORD` — password for the test account
- Without these, UI testing is limited to `/login` page and shell-based verification

## Routes (from `src/App.tsx`)

| Route | Page | Roles |
|-------|------|-------|
| `/login` | Login | Public |
| `/` | Dashboard | Admin, Teacher, Accountant, Parent |
| `/students` | Students | Admin, Teacher, Accountant |
| `/students/:id` | StudentDetail | Admin, Teacher, Accountant |
| `/classes` | Classes | Admin, Teacher, Accountant |
| `/classes/:id` | ClassDetail | Admin, Teacher, Accountant |
| `/teachers` | Teachers | Admin |
| `/attendance` | Attendance | Admin, Teacher |
| `/fees` | Fees | Admin, Accountant |
| `/finance-config` | FinanceConfigPage | Admin, Accountant |
| `/reports` | Reports | Admin, Accountant |
| `/settings` | Settings | Admin |

## Testing Strategy by Change Type

### TypeScript / Type-Level Changes
- Primary test: `npx tsc -b --noEmit` (exit 0 = pass)
- Compare against `main` branch to prove fixes are real
- Check Vite dev server console for transform errors
- Verify specific type definitions via grep if needed

### UI / Component Changes
- Need Supabase auth credentials (see Secrets section)
- Start dev server: `npx vite --port 5173`
- Navigate to affected pages and verify rendering
- Record browser interactions for the user

### Runtime Logic Changes
- Need Supabase auth + seed data
- Seed script: `src/scripts/seed.ts` (creates classes, students, parents, fees, notifications)
- Test affected workflows end-to-end in browser

## Known Issues

- **tailwind.config.js CJS/ESM incompatibility**: `module.exports` in ESM context causes `ReferenceError: module is not defined`. Affects `pnpm run build` and Vite CSS processing. The login page may render blank locally because of this. This is a pre-existing issue in the repo, not caused by PRs.
- **Vercel preview requires SSO**: Preview deployments succeed but require Vercel organization login to view. Check CI status via `git_pr_checks` instead of navigating to preview URL.
- **Vite module serving**: Vite transforms .tsx modules on-demand for browser imports. You cannot curl individual .tsx files from the dev server (returns HTTP 000). Use the Vite server console output to verify compilation instead.

## CI

- Vercel deploys on PR push (2 checks: Vercel Preview Comments + Vercel deployment)
- No custom GitHub Actions CI — only Vercel checks
- Check via: `git_pr_checks` tool
