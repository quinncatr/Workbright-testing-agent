import { expect, type Page } from '@playwright/test';
import path from 'node:path';

export async function signIn(page: Page): Promise<void> {
  const url = `https://${process.env.DOMAIN}/users/sign_in`;
  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;

  if (!url || !email || !password) {
    throw new Error('Missing URL, EMAIL, or PASSWORD');
  }

  await page.goto(url);

  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(
    page.getByRole('link', { name: 'View/Change' })
  ).toBeVisible();
}

export async function beginI9Resubmission(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'View/Change' }).click();
  await page.getByRole('link', { name: /Resubmit/ }).click();
  await page.getByRole('button', { name: 'Yes, I want to resubmit' }).click();
}

export async function clickNext(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Next', exact: true }).click();
}

export async function selectUsCitizen(page: Page): Promise<void> {
  const option = page.getByRole('radio', {
    name: 'A citizen of the United States',
  });

  await option.check();
  await expect(option).toBeChecked();
}

export async function selectUsPassport(page: Page): Promise<void> {
  await page.getByRole('link', {
      name: 'U.S. Passport',
      exact: true,
    }).click();
}

export async function uploadPassportImages(page: Page): Promise<void> {
  const imagePath = path.resolve(process.cwd(), 'data', 'IMG_5733.jpg');

  const fileInputs = page.locator('input[type="file"]');

  await fileInputs.nth(0).setInputFiles(imagePath);
  await fileInputs.nth(1).setInputFiles(imagePath);

  await expect(page.getByRole('button', { name: /Remove/ })).toHaveCount(2, { timeout: 30_000 });
}

export async function enterPassportDetails(page: Page): Promise<void> {
  await page.getByRole('textbox', { name: '* Document Number' }).fill('111111111');

  await page.locator('input[name="expiration_date"]').click();

  await page.getByRole('button', { name: '30', exact: true }).click();
}

export async function signForm(page: Page): Promise<void> {
  await page.locator('canvas').click({
    position: {
      x: 511,
      y: 78,
    },
  });
}

