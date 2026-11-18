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
    headline: 'Four in a row',
    start: 'Start game',
    surface: (page) => page.getByText('Current Turn:'),
  },
  {
    path: '/memory',
    title: 'Memory Match',
    headline: 'Select difficulty',
    start: 'Easy',
    surface: (page) => page.getByText('Pairs'),
  },
  {
    path: '/catcher',
    title: 'Star Catcher',
    headline: 'Catch the stars',
    start: 'Start game',
    surface: (page) => page.locator('canvas'),
  },
  {
    path: '/circuit-express',
    title: 'Circuit Express',
    headline: 'Power the path',
    start: 'Start game',
    surface: (page) => page.getByText(/Rotations:/),
  },
  {
    path: '/production-line',
    title: 'Production Line',
    headline: 'Keep the line running',
    start: 'Start game',
    surface: (page) => page.getByText(/Tap the pieces in order:/),
  },
];

test.describe('game intro screens', () => {
  for (const { path, title, headline, start, surface } of intros) {
    test(`${title} opens on its intro and starts on demand`, async ({ page }) => {
      await page.goto(`./#${path}`);

      const introHeading = page.getByRole('heading', { level: 2, name: headline });
      await expect(introHeading).toBeVisible();
      await expect(surface(page)).toBeHidden();

      await page.getByRole('button', { name: start }).click();

      await expect(surface(page)).toBeVisible();
      await expect(introHeading).toBeHidden();
    });
  }
});
