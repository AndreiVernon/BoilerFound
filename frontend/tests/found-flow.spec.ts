import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const photo = path.join(__dirname, 'fixtures', 'water-bottle.png');
async function openReport(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'I found something', exact: true }).click();
  await page.getByRole('button', { name: 'Something else', exact: true }).click();
  await expect(page).toHaveURL(/\/found\/report$/);
}

test('localhost responds and homepage shows the two report actions', async ({ page, request }) => {
  const response = await request.get('/');
  expect(response.ok()).toBeTruthy();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'What happened?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'I found something', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'I lost something', exact: true })).toBeDisabled();
});

test('found buttons navigate to item type and report pages; back works', async ({ page }) => {
  await openReport(page);
  await page.getByRole('button', { name: 'Go back' }).click();
  await expect(page).toHaveURL(/\/found$/);
  await expect(page.getByRole('heading', { name: 'What did you find?' })).toBeVisible();
  await page.getByRole('button', { name: 'Go back' }).click();
  await expect(page.getByRole('heading', { name: 'What happened?' })).toBeVisible();
});

test('sensitive items show police guidance without creating a report', async ({ page }) => {
  await page.goto('/found');
  await page.getByRole('button', { name: 'Wallet, ID or payment card' }).click();
  await expect(page.getByRole('heading', { name: 'Take it to Purdue Police' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Purdue Police contact information' })).toBeVisible();
  await expect(page.getByTestId('photo-input')).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to home' }).click();
  await expect(page.getByRole('heading', { name: 'What happened?' })).toBeVisible();
});

test('empty submission is blocked with required-field errors', async ({ page }) => {
  await openReport(page);
  await page.getByRole('button', { name: 'Submit report' }).click();
  await expect(page).toHaveURL(/\/found\/report$/);
  await expect(page.getByText('Add a photo of the found item.', { exact: true })).toBeVisible();
  await expect(page.getByText('Enter where you found the item.', { exact: true })).toBeVisible();
});

test('location alone cannot submit; entries survive validation and back navigation', async ({ page }) => {
  await openReport(page);
  await page.getByRole('textbox', { name: 'Where did you find it?', exact: true }).fill('WALC, second floor');
  await page.getByRole('textbox', { name: 'Description', exact: true }).fill('Blue water bottle');
  await page.getByRole('button', { name: 'Submit report' }).click();
  await expect(page.getByText('Add a photo of the found item.', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Description', exact: true })).toHaveValue('Blue water bottle');
  await page.getByRole('button', { name: 'Go back' }).click();
  await page.getByRole('button', { name: 'Something else', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Where did you find it?', exact: true })).toHaveValue('WALC, second floor');
});

test('photo alone and a whitespace location cannot submit', async ({ page }) => {
  await openReport(page);
  await page.getByTestId('photo-input').setInputFiles(photo);
  await expect(page.getByRole('button', { name: 'Replace photo' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Where did you find it?', exact: true }).fill('   ');
  await page.getByRole('button', { name: 'Submit report' }).click();
  await expect(page.getByText('Enter where you found the item.', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/found\/report$/);
});

test('invalid and oversized uploads are rejected', async ({ page }) => {
  await openReport(page);
  await page.getByTestId('photo-input').setInputFiles({ name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('not a real image') });
  await expect(page.getByText('Choose a valid JPEG or PNG photo.', { exact: true })).toBeVisible();
  await page.getByTestId('photo-input').setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
  await expect(page.getByText('Choose a photo up to 10 MB.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Replace photo' })).toHaveCount(0);
});

test('valid report saves, confirms drop-off, survives refresh, and returns home', async ({ page }) => {
  await openReport(page);
  await page.getByTestId('photo-input').setInputFiles(photo);
  await page.getByRole('textbox', { name: 'Where did you find it?', exact: true }).fill('Lawson, room 1142');
  await page.getByRole('textbox', { name: 'Where are you leaving it?', exact: true }).fill('Lawson front desk');
  await page.getByRole('button', { name: 'Submit report' }).click();
  await expect(page).toHaveURL(/\/found\/thank-you\?id=/);
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
  await expect(page.getByTestId('confirmed-location')).toHaveText('Lawson front desk');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
  await expect(page.getByTestId('confirmed-location')).toHaveText('Lawson front desk');
  await page.getByRole('button', { name: 'Back to home' }).click();
  await expect(page.getByRole('heading', { name: 'What happened?' })).toBeVisible();
  await page.getByRole('button', { name: 'I found something', exact: true }).click();
  await page.getByRole('button', { name: 'Something else', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Where did you find it?', exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Take or upload a photo' })).toBeVisible();
});

test('only photo and location are required; optional fields may stay empty', async ({ page }) => {
  await openReport(page);
  await page.getByTestId('photo-input').setInputFiles(photo);
  await page.getByRole('textbox', { name: 'Where did you find it?', exact: true }).fill('WALC');
  await page.getByRole('button', { name: 'Submit report' }).click();
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
  await expect(page.getByTestId('confirmed-location')).toHaveText('WALC');
  await expect(page.getByText('FOUND AT', { exact: true })).toBeVisible();
});

test('a storage failure preserves the draft and never shows success', async ({ page }) => {
  await openReport(page);
  await page.getByTestId('photo-input').setInputFiles(photo);
  await page.getByRole('textbox', { name: 'Where did you find it?', exact: true }).fill('WALC');
  await page.evaluate(() => { indexedDB.open = () => { throw new Error('Storage unavailable'); }; });
  await page.getByRole('button', { name: 'Submit report' }).click();
  await expect(page.getByText('Your report could not be saved. Your entries are still here. Please try again.')).toBeVisible();
  await expect(page).toHaveURL(/\/found\/report$/);
  await expect(page.getByRole('textbox', { name: 'Where did you find it?', exact: true })).toHaveValue('WALC');
});

test('confirmation without a saved report does not claim success', async ({ page }) => {
  await page.goto('/found/thank-you');
  await expect(page.getByRole('heading', { name: 'No saved report found' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toHaveCount(0);
});
