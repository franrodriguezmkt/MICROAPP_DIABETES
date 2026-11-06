import { expect, test, type Page } from "@playwright/test";

import { seedPreviewSession } from "./support/preview-auth";

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
  await seedPreviewSession(page);
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

  const categoryGroup = page.getByRole("group", {
    name: /categorías de recetas/i,
  });
  const categoryButtons = categoryGroup.getByRole("button");
  await expect(categoryButtons).toHaveCount(6);
  for (const button of await categoryButtons.all()) {
    const bounds = await button.boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
  }
  expect(
    await categoryGroup.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    ),
  ).toBe(true);
  await categoryButtons.last().scrollIntoViewIfNeeded();
  const lastCategoryBounds = await categoryButtons.last().boundingBox();
  expect(lastCategoryBounds?.x).toBeGreaterThanOrEqual(0);
  expect(
    (lastCategoryBounds?.x ?? 0) + (lastCategoryBounds?.width ?? 0),
  ).toBeLessThanOrEqual(375);

  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveText("Semana");
  expect(
    await navigationLinks.first().evaluate(
      (element) => getComputedStyle(element).outlineStyle,
    ),
  ).not.toBe("none");

  await expect(page.locator(".recipe-card").last()).toBeVisible();
  await page.locator(".recipe-card").last().scrollIntoViewIfNeeded();
  const lastCardBounds = await page.locator(".recipe-card").last().boundingBox();
  const mobileNavigationBounds = await page
    .getByRole("navigation", { name: /navegación principal/i })
    .boundingBox();
  expect(
    (lastCardBounds?.y ?? 0) + (lastCardBounds?.height ?? 0),
  ).toBeLessThanOrEqual((mobileNavigationBounds?.y ?? 0) - 8);

  expect(
    await page.locator(".recipe-card").first().evaluate(
      (element) => getComputedStyle(element).transitionDuration,
    ),
  ).toBe("0s");
  expect(
    await navigationLinks.first().evaluate(
      (element) => getComputedStyle(element).transitionDuration,
    ),
  ).toBe("0s");

  await page.setViewportSize({ width: 1280, height: 800 });
  const desktopNavigationBounds = await page
    .getByRole("navigation", { name: /navegación principal/i })
    .boundingBox();
  const mainBounds = await page.locator("#main-content").boundingBox();
  expect(
    (desktopNavigationBounds?.x ?? 0) + (desktopNavigationBounds?.width ?? 0),
  ).toBeLessThanOrEqual((mainBounds?.x ?? 0) - 16);

  await page.setViewportSize({ width: 375, height: 667 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "125%";
  });

  await expectNoHorizontalOverflow(page);
  await expect(searchBox).toBeVisible();
  await expect(navigationLinks.last()).toBeVisible();
  await categoryButtons.last().scrollIntoViewIfNeeded();
  const scaledLastCategoryBounds = await categoryButtons.last().boundingBox();
  expect(scaledLastCategoryBounds?.x).toBeGreaterThanOrEqual(0);
  expect(
    (scaledLastCategoryBounds?.x ?? 0) +
      (scaledLastCategoryBounds?.width ?? 0),
  ).toBeLessThanOrEqual(375);

  const longTitleCard = page
    .locator(".recipe-card")
    .filter({ hasText: "Pollo con salsa de mostaza y dulzor sin azúcar añadido" });
  await longTitleCard.scrollIntoViewIfNeeded();
  const longTitleBounds = await longTitleCard.boundingBox();
  expect(longTitleBounds?.x).toBeGreaterThanOrEqual(0);
  expect((longTitleBounds?.x ?? 0) + (longTitleBounds?.width ?? 0)).toBeLessThanOrEqual(
    375,
  );

  await page.evaluate(() => document.fonts.ready);
  const loadedEditorialFonts = await page.evaluate(() =>
    Array.from(document.fonts)
      .filter((font) => font.status === "loaded")
      .map((font) => font.family.replaceAll('"', "")),
  );
  expect(loadedEditorialFonts).toContain("Manrope Variable");
  expect(loadedEditorialFonts).toContain("Inter Variable");
});
