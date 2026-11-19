import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';
import { readFileSync } from 'node:fs';

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

test('valid report saves through the real API, survives refresh, and returns home', async ({ page, request }, testInfo) => {
  await openReport(page);
  await page.getByTestId('photo-input').setInputFiles(photo);
  await page.getByRole('textbox', { name: 'Where did you find it?', exact: true }).fill('Lawson, room 1142');
  await page.getByRole('textbox', { name: 'Where are you leaving it?', exact: true }).fill('Lawson front desk');
  await page.getByRole('textbox', { name: 'Description', exact: true }).fill('Blue bottle');
  await page.getByRole('textbox', { name: 'Question only the owner can answer', exact: true }).fill('Which sticker is on it?');
  const savedResponse = page.waitForResponse(response => response.url() === 'http://127.0.0.1:8002/found-reports' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Submit report' }).click();
  const response = await savedResponse;
  expect(response.status()).toBe(201);
  const saved = await response.json();
  expect(saved).toMatchObject({ location: 'Lawson, room 1142', drop_off: 'Lawson front desk', description: 'Blue bottle', question: 'Which sticker is on it?', status: 'available' });
  const uploaded = await request.get(`http://127.0.0.1:8002${saved.image_url}`, { headers: { Authorization: 'Bearer dev-token-alice' } });
  expect(uploaded.ok()).toBeTruthy();
  expect(await uploaded.body()).toEqual(readFileSync(photo));
  await expect(page).toHaveURL(/\/found\/thank-you\?id=/);
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
  await expect(page.getByTestId('confirmed-location')).toHaveText('Lawson front desk');
  await page.screenshot({ path: testInfo.outputPath('api-confirmation.png'), fullPage: true });
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

test('an API failure preserves the draft and never shows success', async ({ page }) => {
  await openReport(page);
  await page.getByTestId('photo-input').setInputFiles(photo);
  await page.getByRole('textbox', { name: 'Where did you find it?', exact: true }).fill('WALC');
  await page.route('**/found-reports', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'The server is temporarily unavailable.' }) }));
  await page.getByRole('button', { name: 'Submit report' }).click();
  await expect(page.getByText('The server is temporarily unavailable. Your entries are still here.')).toBeVisible();
  await expect(page).toHaveURL(/\/found\/report$/);
  await expect(page.getByRole('textbox', { name: 'Where did you find it?', exact: true })).toHaveValue('WALC');
});

test('confirmation without a saved report does not claim success', async ({ page }) => {
  await page.goto('/found/thank-you');
  await expect(page.getByRole('heading', { name: 'No saved report found' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toHaveCount(0);
});

test('an unknown API report shows not found instead of success', async ({ page }) => {
  await page.goto('/found/thank-you?id=does-not-exist');
  await expect(page.getByRole('heading', { name: 'No saved report found' })).toBeVisible();
});

test('confirmation API failure can be retried without reporting a missing record', async ({ page, request }) => {
  const created = await request.post('http://127.0.0.1:8002/found-reports', {
    headers: { Authorization: 'Bearer dev-token-alice' },
    multipart: { location: 'WALC', image: { name: 'bottle.png', mimeType: 'image/png', buffer: readFileSync(photo) } },
  });
  expect(created.status()).toBe(201);
  const saved = await created.json();
  const url = `**/found-reports/${saved.id}`;
  await page.route(url, route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Please try again shortly.' }) }));
  await page.goto(`/found/thank-you?id=${saved.id}`);
  await expect(page.getByRole('heading', { name: 'Could not load your report' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No saved report found' })).toHaveCount(0);
  await page.unroute(url);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
});
