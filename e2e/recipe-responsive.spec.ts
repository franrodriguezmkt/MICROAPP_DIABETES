import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

test("keeps recipe navigation usable across compact accessibility layouts", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/recetas");

  await expect(
    page.getByRole("heading", { name: /recetas para hacer tu semana más simple/i }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const searchBox = page.getByRole("searchbox", { name: /buscar recetas/i });
  const searchBounds = await searchBox.boundingBox();
  expect(searchBounds?.height).toBeGreaterThanOrEqual(44);

  const navigationLinks = page
    .getByRole("navigation", { name: /navegación principal/i })
    .getByRole("link");
  await expect(navigationLinks).toHaveCount(5);
  for (const link of await navigationLinks.all()) {
    const bounds = await link.boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
  }

  await page.setViewportSize({ width: 667, height: 375 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "125%";
  });

  await expectNoHorizontalOverflow(page);
  await expect(searchBox).toBeVisible();
  await expect(navigationLinks.last()).toBeVisible();
});
