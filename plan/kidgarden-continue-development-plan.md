# KidGarden Continued Development Plan

## Review Summary

- Typecheck passes with `tsc -b`.
- Lint passes with 5 warnings in `Toast.tsx`, `Dashboard.tsx`, `Fees.tsx`, `Parents.tsx`, and `TestAuth.tsx`.
- Tests pass: 7/7. Runtime is slow at about 65 seconds because auth timeout tests use real timers.
- Main risks: Vietnamese text mojibake, public debug page at `/test-auth`, multiple P3 modules still mocked, and fee search has incorrect pagination semantics.

## Fix First

- Remove `/test-auth` or guard it behind a development-only condition. The route is public at `src/App.tsx:35`, and the page reads auth/localStorage debug data at `src/pages/TestAuth.tsx:23`.
- Fix Vietnamese text encoding across the app. Example: `src/components/layout/MainLayout.tsx:51` currently renders mojibake.
- Fix fee search to run server-side. Current behavior pages first, then filters client-side at `src/services/feesService.ts:79` and `src/services/feesService.ts:88`.
- Fix fee summary to use an aggregate over the current full filter set, not only the current page at `src/pages/Fees.tsx:59`.
- Convert auth timeout tests to fake timers so the suite does not spend 60+ seconds waiting on real timeouts, starting at `src/stores/authStore.bugfix.test.ts:71`.

## Key Changes

- Internal services/API:
  - Add `getFeeSummary(query)` in `feesService.ts`, returning `{ totalAmount, totalPaid, totalDebt, debtCount }`.
  - Update `listFees(query)` so search is correctly handled server-side, using an RPC/view if needed for joined student and fee type search.
  - Add real services for `teachers`, `parents`, `notifications`, `reports`, and `settings` based on the existing schema.
  - Replace mock pages: `Teachers`, `Parents`, `Notifications`, `Reports`, `Settings`, and `AttendanceHistory`.
- Auth/RBAC:
  - Keep `RoleGuard`, but synchronize the access matrix between `App.tsx` and `rbac.ts`.
  - Ensure the dev-only route is excluded from production builds or guarded with `import.meta.env.DEV`.
- Database/RLS:
  - Add a new SQL migration under `supabase/` to scope attendance access to classes owned by the current teacher.
  - Map unique constraint conflicts clearly for `student_code` and the fee unique key.
- UI/data:
  - Replace dashboard mock stats with real aggregates.
  - Wire the real AttendanceHistory route to `listAttendanceHistory`.
  - Remove unused eslint disables and move `useToast` out of the component file to clear the Fast Refresh warning.

## Test Plan

- Run `tsc -b`, `eslint .`, and `vitest --run`.
- Unit tests:
  - `listFees` search returns matching records outside the first page.
  - `getFeeSummary` calculates correctly for status and search filters.
  - Auth timeout tests use fake timers and complete in under 2 seconds.
- Integration/manual:
  - Login, logout, and hard refresh session restore.
  - Menu visibility for Admin, Teacher, Accountant, and Parent roles.
  - Students/classes create, edit, and detail flows.
  - Attendance save plus history filtering.
  - Fees create, mark paid, search, pagination, and totals.
  - Production build cannot access `/test-auth`.

## Assumptions

- Current priority remains P2 hardening first, then P3 mock-to-real conversion.
- Backend remains the existing Supabase schema in `supabase/schema.sql`.
- Stack remains React 18, Vite, Zustand, and Tailwind.
- No new dependency unless current service/query patterns cannot handle the required behavior.
