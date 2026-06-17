import { test, expect } from '@playwright/test';
import {
  beginI9Resubmission,
  clickNext,
  enterPassportDetails,
  selectUsCitizen,
  selectUsPassport,
  signForm,
  signIn,
  uploadPassportImages,
} from '../helpers/i9';

test.describe.configure({ mode: 'serial' });

test('simple I-9 path', async ({ page }) => {
  await signIn(page);
  await beginI9Resubmission(page);

  await clickNext(page);
  await selectUsCitizen(page);
  await clickNext(page);

  await selectUsPassport(page);
  await clickNext(page);

  await uploadPassportImages(page);
  await enterPassportDetails(page);

  await clickNext(page);
  await clickNext(page);

  await signForm(page);
  await page.getByRole('button', { name: 'Finish' }).click();

});