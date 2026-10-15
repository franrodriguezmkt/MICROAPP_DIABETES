import { expect, test } from "@playwright/test";

test("finds and opens a recipe from a direct mobile route", async ({ page }) => {
  await page.goto("/recetas?q=pudin");

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#003C37",
  );

  const manifestResponse = await page.request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  await expect(manifestResponse.json()).resolves.toMatchObject({
    theme_color: "#003C37",
    background_color: "#FFFAF7",
  });

  const healthResponse = await page.request.get("/api/health");
  expect(healthResponse.ok()).toBe(true);
  await expect(healthResponse.json()).resolves.toEqual({
    ok: true,
    service: "recipe-app",
  });

  await page.getByRole("link", { name: /pudín de chía/i }).click();
  await expect(page).toHaveURL(
    /\/recetas\/pudin-de-chia-con-leche-vegetal-y-vainilla$/,
  );
  await expect(
    page.getByRole("heading", { name: /pudín de chía/i }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  await page.goto("/recetas/pudin-de-chia-con-leche-vegetal-y-vainilla");
  await expect(
    page.getByRole("heading", { name: /pudín de chía/i }),
  ).toBeVisible();
});
