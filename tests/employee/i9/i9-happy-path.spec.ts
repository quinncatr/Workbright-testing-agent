import { test } from '@playwright/test';
import {
  beginI9Resubmission,
  clickNext,
  enterPassportDetails,
  selectUsCitizen,
  selectUsPassport,
  signForm,
  signIn,
  uploadPassportImages,
} from '@/helpers/i9';
import { limitToSupportedProjects } from '@/helpers/projects';

limitToSupportedProjects();

test.describe.configure({ mode: 'serial' });

test.describe('Employees.Form I9.Happy Path', () => {
    test('it allows user to submit I9 as US Citizen with US Passport', async ({ page }) => {
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
});