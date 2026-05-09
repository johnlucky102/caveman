import { Page, expect } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}

  async waitForToast(message: string) {
    await expect(this.page.locator('text=' + message)).toBeVisible();
  }

  async selectOption(label: string, option: string) {
    // Generic helper for Radix/Tailwind custom selects
    const trigger = this.page.locator(`label:has-text("${label}")`).locator('..').locator('button, select');
    await trigger.click();
    await this.page.locator(`text=${option}`).click();
  }

  async fillInput(label: string, value: string) {
    await this.page.locator(`label:has-text("${label}")`).locator('..').locator('input, textarea').fill(value);
  }

  async confirmModal() {
    await this.page.click('button:has-text("Xác nhận"), button:has-text("Đồng ý")');
  }
}
