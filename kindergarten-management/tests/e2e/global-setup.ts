import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const email = process.env.VITE_TEST_ADMIN_EMAIL || 'johnnguyenglobal999@gmail.com';
  const password = process.env.VITE_TEST_ADMIN_PASSWORD || '123456';

  try {
    await page.goto(baseURL + '/login');
    console.log('Navigated to login page.');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    console.log('Submitted login form.');

    // Wait for navigation to confirm login
    await page.waitForURL(baseURL + '/', { timeout: 10000 });
    console.log('Login successful, URL is now:', page.url());

    // Save storage state into a file
    await page.context().storageState({ path: storageState as string });
    console.log('Session saved to:', storageState);
  } catch (error) {
    console.error('Global login failed:', error);
    await page.screenshot({ path: 'login_failure.png' });
  } finally {
    await browser.close();
  }
}

export default globalSetup;
