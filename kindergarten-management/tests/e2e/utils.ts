import { Page, expect } from '@playwright/test';

export async function loginAsAdmin(page: Page) {
  const email = process.env.VITE_TEST_ADMIN_EMAIL || 'johnnguyenglobal999@gmail.com';
  const password = process.env.VITE_TEST_ADMIN_PASSWORD || '123456';

  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard (root)
  await page.waitForURL('**/');
}
