# Automated Testing & Data Seeding Guide

This guide explains how to use the newly implemented automated testing suite and data seeding scripts to ensure the stability and data coverage of the Kindergarten Management system.

## 1. Data Seeding

To provide a realistic environment for testing and demonstration, a seed script has been created. It populates the database with:
- **Classes**: Mầm 1, Chồi 1, Lá 1.
- **Students**: 2 students in 'Mầm 1' with unique codes.
- **Parents**: Father and Mother linked to the students.
- **Attendance**: 7 days of historical data for each student to populate dashboard trends.
- **Fee Records**: One paid and one unpaid record for fee status verification.
- **Notifications**: Sample system announcements.

### How to Run:
```bash
npm run seed
```
> [!NOTE]
> The seed script uses SQL via the Supabase MCP tool to bypass RLS, ensuring data is inserted correctly even without an active session.

## 2. End-to-End (E2E) Testing

We use **Playwright** for E2E tests to validate the system from a user perspective, including UI interactions and theme switching.

### Test Suites Included:
- **`login.spec.ts`**: Verifies the login page renders correctly and handles invalid credentials.
- **`students.spec.ts`**:
    - Validates that students from the seed data are visible.
    - Tests **Dark Mode** switching and ensures text remains readable (correct contrast).
    - Tests navigation to student detail pages.
- **`fees.spec.ts`**: Verifies fee record display and status filtering (Paid vs. Unpaid).
- **`attendance.spec.ts`**: Validates the attendance listing by class.

### How to Run:
```bash
# Install Playwright browsers (first time only)
npx playwright install chromium

# Run all tests
npm run test:e2e

# Run with UI mode for debugging
npx playwright test --ui
```

## 3. Configuration

- **Playwright Config**: Located in `playwright.config.ts`. It's set up to run against `localhost:5173`.
- **Test Credentials**: The tests use `johnnguyenglobal999@gmail.com` as the admin email. You can override credentials in your `.env` file:
  ```env
  VITE_TEST_ADMIN_EMAIL=your-email@example.com
  VITE_TEST_ADMIN_PASSWORD=your-secure-password
  ```

## 4. Maintenance

- **Adding Tests**: Add new `.spec.ts` files to `tests/e2e/`.
- **Modifying Data**: Update the SQL blocks in `src/scripts/seed.ts` (or run them via Supabase SQL Editor) to change the baseline test data.

---
**Status**: All core screens (Dashboard, Students, Fees, Attendance, Settings) are now covered by either unit tests (Vitest) or E2E tests (Playwright).
