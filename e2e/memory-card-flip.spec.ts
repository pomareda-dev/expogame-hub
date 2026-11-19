import { expect, test, type Locator } from "@playwright/test";

/**
 * Linear part of a card's rendered transform, composed with its front face.
 *
 * A card is revealed by rotating it 180deg around Y. When the visible face does
 * not carry an equal counter-rotation, browsers flatten the face into the
 * rotated parent and paint the artwork mirrored (net X scale -1) instead of
 * upright (net X scale +1).
 */
const cardMatrices = (card: Locator) =>
  card.evaluate((element) => {
    const matrixOf = (node: Element) => {
      const style = getComputedStyle(node);
      const transform =
        style.transform === "none"
          ? new DOMMatrix()
          : new DOMMatrix(style.transform);

      const rotate = style.rotate;
      if (!rotate || rotate === "none") return transform;

      const parts = rotate.trim().split(/\s+/);
      const axis = parts.length > 1 ? parts[0] : "z";
      const angle = Number.parseFloat(parts[parts.length - 1]);
      const individual = new DOMMatrix();
      if (axis === "x") individual.rotateSelf(angle, 0, 0);
      else if (axis === "y") individual.rotateSelf(0, angle, 0);
      else individual.rotateSelf(0, 0, angle);
      return individual.multiply(transform);
    };

    const front = element.lastElementChild;
    if (!front) throw new Error("A memory card must render its front face");

    const parent = matrixOf(element);
    return {
      cardXScale: parent.m11,
      frontXScale: parent.multiply(matrixOf(front)).m11,
    };
  });

test("revealed memory card shows its artwork upright instead of mirrored", async ({
  page,
}) => {
  await page.goto("./#/memory");
  await page.getByRole("button", { name: /Easy/ }).click();

  const card = page.locator(".grid > button").first();
  await expect(card).toBeVisible();
  await card.click();

  // Wait for the reveal rotation to settle before measuring the artwork, so the
  // assertion cannot pass on the still unrotated card or mid-flip.
  await expect
    .poll(async () => (await cardMatrices(card)).cardXScale, { timeout: 5000 })
    .toBeLessThan(-0.99);

  const { frontXScale } = await cardMatrices(card);
  expect(frontXScale).toBeGreaterThan(0.9);
});
