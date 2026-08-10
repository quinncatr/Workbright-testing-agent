import { expect, type Page } from '@playwright/test';
import path from 'node:path';

//Normalize DOMAIN into a scheme+host origin
export function siteOrigin(): string {
  const raw = process.env.DOMAIN;
  if (!raw) throw new Error('Missing DOMAIN');
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return new URL(withScheme).origin;
}

export async function signIn(page: Page): Promise<void> {
  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;

  if (!process.env.DOMAIN || !email || !password) {
    throw new Error('Missing DOMAIN, EMAIL, or PASSWORD');
  }

  await page.goto(`${siteOrigin()}/users/sign_in`);

  // Supported projects start already authenticated via the storage state saved by
  // tests/auth.setup.ts, and the app redirects an authenticated session away from
  // the sign-in page. Only fill the form when we actually landed on it (no saved
  // state yet, or the session expired mid-run).
  if (page.url().includes('/users/sign_in')) {
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
  }

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

  // Fill a fixed future date directly (same as fillAttachment in i9-flow.ts). The old
  // datepicker flow clicked day "30" of the current month, which the app rejects as
  // "must be after today" whenever the 30th is not in the future.
  await page.locator('input[name="expiration_date"]').fill('12/31/2030');
}

export async function signForm(page: Page): Promise<void> {
  // Draw a segmented stroke relative to the canvas size, mirroring drawSignature in
  // i9-flow.ts. Relative coordinates: a fixed position falls outside the canvas on
  // mobile viewports. Segmented moves: a single long mouse.move emits too few pointer
  // events for the pad to register in containerized headless runs (see
  // agent-docs/fragile-spots.md, 2026-07-30).
  const canvas = page.locator('canvas');
  await canvas.waitFor({ state: 'visible' });
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const b = await canvas.boundingBox();
  if (!b) throw new Error('signature canvas not found / not visible');
  await page.mouse.move(b.x + b.width * 0.2, b.y + b.height * 0.5);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(
      b.x + b.width * (0.2 + 0.6 * i / 20),
      b.y + b.height * (0.5 + 0.25 * Math.sin(i / 2)),
      { steps: 2 },
    );
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
}

