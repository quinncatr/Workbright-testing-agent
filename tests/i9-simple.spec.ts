import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://garrettmarecki.workbright.com/');

  await expect(page).toHaveTitle("Welcome, Quinn");
  //npx playwright codegen https://alfonsovaldez.workbright-qa.dev/users/sign_in
});