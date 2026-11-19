import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Every game route opens on an intro screen that explains the rules before any
 * board, deck or canvas exists. The `surface` locator is the element that only
 * exists once the game itself is running.
 */
const intros: {
  path: string;
  title: string;
  headline: string;
  start: string | RegExp;
  surface: (page: Page) => Locator;
}[] = [
  {
    path: '/connect-four',
    title: 'Connect Four',
    headline: 'Connect Four',
    start: 'Start game',
    surface: (page) => page.getByText('Current Turn:'),
  },
  {
    path: '/memory',
    title: 'Memory Match',
    headline: 'Memory Match',
    start: 'Easy',
    surface: (page) => page.getByText('Pairs'),
  },
  {
    path: '/catcher',
    title: 'NovaTech Catcher',
    headline: 'NovaTech Catcher',
    start: 'Start game',
    surface: (page) => page.locator('canvas'),
  },
  {
    path: '/circuit-express',
    title: 'Circuit Express',
    headline: 'Circuit Express',
    start: 'Start game',
    surface: (page) => page.getByText(/Rotations:/),
  },
  {
    path: '/production-line',
    title: 'Production Line',
    headline: 'Production Line',
    start: 'Start game',
    surface: (page) => page.getByText(/Tap the pieces in order:/),
  },
];

test.describe('game intro screens', () => {
  for (const { path, title, headline, start, surface } of intros) {
    test(`${title} opens on its intro and starts on demand`, async ({ page }) => {
      await page.goto(`./#${path}`);

      // The instruction screen header repeats the game name from the launcher.
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();

      const introHeading = page.getByRole('heading', { level: 2, name: headline });
      await expect(introHeading).toBeVisible();
      await expect(surface(page)).toBeHidden();

      await page.getByRole('button', { name: start }).click();

      await expect(surface(page)).toBeVisible();
      await expect(introHeading).toBeHidden();
    });
  }
});
