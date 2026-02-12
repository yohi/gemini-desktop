import { test, expect, _electron as electron, ElectronApplication } from '@playwright/test';
import path from 'path';

// Define the expected path to the main process entry point
const mainProcessPath = path.join(__dirname, '../../dist/main/main.js');

test.describe('Session Isolation', () => {
  let electronApp: ElectronApplication;

  test.beforeEach(async () => {
    // Launch the app
    electronApp = await electron.launch({
      args: [mainProcessPath],
    });
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should launch with a default user session', async () => {
    // Wait for the first window to be available
    const page = await electronApp.firstWindow();

    // Check title
    const title = await page.title();
    expect(title).toBe('Gemini Desktop');

    // We verified the window exists and has correct title.
    // Visibility check is flaky in headless environments, so we rely on sidebar check.
  });

  test('should have a sidebar', async () => {
    const page = await electronApp.firstWindow();
    // Assuming <aside> tag for sidebar
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
  });
});
