import { expect, test } from '@playwright/test';

/**
 * The "1 vs CPU" entry point keeps the red turn for the human and lets the CPU
 * answer on its own. Only the red and green piece classes are counted, so the
 * assertions describe the board state rather than the component internals.
 */
test.describe('connect four CPU mode', () => {
  test('the CPU answers the opening move and hands the turn back', async ({ page }) => {
    await page.goto('./#/connect-four');

    await page.getByRole('button', { name: 'Play vs CPU' }).click();

    const redPieces = page.locator('div.bg-rose-500');
    const greenPieces = page.locator('div.bg-lime-400');

    await expect(page.getByText('Red Player')).toBeVisible();
    await expect(redPieces).toHaveCount(0);

    await page.getByRole('button', { name: 'Column 4' }).click();

    await expect(redPieces).toHaveCount(1);
    await expect(greenPieces).toHaveCount(1);
    await expect(page.getByText('Red Player')).toBeVisible();
  });

  test('the CPU difficulty carries into the match', async ({ page }) => {
    await page.goto('./#/connect-four');

    await page.getByRole('button', { name: 'Easy', exact: true }).click();
    await page.getByRole('button', { name: 'Play vs CPU' }).click();

    await page.getByRole('button', { name: 'Column 4' }).click();

    await expect(page.locator('div.bg-rose-500')).toHaveCount(1);
    await expect(page.locator('div.bg-lime-400')).toHaveCount(1);
  });
});
