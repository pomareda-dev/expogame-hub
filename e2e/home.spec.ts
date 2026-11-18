import { expect, test } from '@playwright/test';

const launcherNames = [
  'Connect Four',
  'Memory Match',
  'NovaTech Catcher',
  'Circuit Express',
  'Production Line',
];

test.describe('home launcher', () => {
  test('shows a launcher for every game', async ({ page }) => {
    await page.goto('./');

    await expect(page.getByText('SYSTEM ONLINE')).toBeVisible();

    for (const name of launcherNames) {
      await expect(page.getByRole('button', { name: new RegExp(name) })).toBeVisible();
    }
  });

  test('opens a game from its launcher', async ({ page }) => {
    await page.goto('./');

    await page.getByRole('button', { name: /NovaTech Catcher/ }).click();

    await expect(page).toHaveURL(/#\/catcher$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Star Catcher' })).toBeVisible();
  });
});
