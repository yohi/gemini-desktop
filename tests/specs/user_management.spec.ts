import { test, expect, _electron as electron, ElectronApplication } from '@playwright/test';
import path from 'path';

const mainProcessPath = path.join(__dirname, '../../dist/main/main.js');

test.describe('User Management', () => {
  let electronApp: ElectronApplication;

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: [mainProcessPath],
    });
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should open Gemini page (create view) when adding a user', async () => {
    const page = await electronApp.firstWindow();

    // Click Add User button
    await page.click('[aria-label="Add User"]');

    // Type user name
    await page.fill('input[placeholder="Enter name..."]', 'Test User');

    // Press Enter
    await page.press('input[placeholder="Enter name..."]', 'Enter');

    // Wait for user to appear in sidebar
    await expect(page.locator('[title="Test User"]').first()).toBeVisible();

    // Verify that a WebContentsView is attached to the main window
    await expect.poll(async () => {
      return await electronApp.evaluate(({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0];
        const contentView = (win as any).contentView;
        return contentView && contentView.children ? contentView.children.length : 0;
      });
    }).toBeGreaterThan(0);

    // Screenshot for verification
    await page.screenshot({ path: 'verification.png' });
  });
});
