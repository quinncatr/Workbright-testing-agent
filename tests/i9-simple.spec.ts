import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://alfonsovaldez.workbright-qa.dev/');

  await expect(page).toHaveTitle(/WorkBright/i);
  //npx playwright codegen https://alfonsovaldez.workbright-qa.dev/users/sign_in
});