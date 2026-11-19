import { expect, test } from '@playwright/test';

/**
 * Each Circuit Express difficulty owns a board band, and a bigger board carries
 * a longer source-to-light route, so a higher difficulty must put more wire
 * tiles in front of the player. The unit suite pins the generator; this spec
 * pins the wiring between the intro buttons, the board and the announced count.
 */
const difficulties = [
  { label: 'Easy', size: 3, wires: 3 },
  { label: 'Medium', size: 4, wires: 5 },
  { label: 'Hard', size: 5, wires: 7 },
];

test.describe('circuit express difficulty', () => {
  for (const { label, size, wires } of difficulties) {
    test(`${label} starts on a ${size} by ${size} board with ${wires} wires`, async ({ page }) => {
      await page.goto('./#/circuit-express');

      await expect(page.getByRole('heading', { level: 2, name: 'Circuit Express' })).toBeVisible();
      await page.getByRole('button', { name: label }).click();

      await expect(page.getByText(/Rotations:/)).toBeVisible();
      await expect(page.getByLabel(`Circuit board, ${size} by ${size}`)).toBeVisible();
      await expect(page.getByText(`${label} · ${wires} wires`)).toBeVisible();
    });
  }

  test('the intro advertises the wire range of every difficulty', async ({ page }) => {
    await page.goto('./#/circuit-express');

    await expect(page.getByRole('button', { name: 'Easy (3–5 wires)' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Medium (5–7 wires)' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hard (7–9 wires)' })).toBeVisible();
  });
});
