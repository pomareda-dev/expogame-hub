import { expect, test } from '@playwright/test';

/**
 * The launcher label and the in-game title differ for some games: the home card
 * reads "NovaTech Catcher" while the screen header reads "Star Catcher", and the
 * card "Flappy Drone" opens a screen also titled "Flappy Drone".
 */
const routes = [
  { path: '/connect-four', title: 'Connect Four' },
  { path: '/flappy-bird', title: 'Flappy Drone' },
  { path: '/memory', title: 'Memory Match' },
  { path: '/catcher', title: 'Star Catcher' },
  { path: '/circuito-express', title: 'Circuito Express' },
];

test.describe('game routes', () => {
  for (const { path, title } of routes) {
    test(`${path} renders the ${title} screen without uncaught errors`, async ({ page }) => {
      const uncaughtErrors: Error[] = [];
      page.on('pageerror', (error) => uncaughtErrors.push(error));

      await page.goto(`/#${path}`);

      await expect(page).toHaveURL(new RegExp(`#${path}$`));
      await expect(
        page.getByRole('heading', { level: 1, name: title }),
      ).toBeVisible();
      expect(uncaughtErrors).toEqual([]);
    });
  }

  test('the back control returns to the launcher', async ({ page }) => {
    await page.goto('/#/connect-four');

    await expect(page.getByRole('heading', { level: 1, name: 'Connect Four' })).toBeVisible();

    await page.locator('header').getByRole('button').click();

    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByText('SYSTEM ONLINE')).toBeVisible();
  });
});
