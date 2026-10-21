import { expect, test, type Page } from "@playwright/test";

import { seedPreviewSession } from "./support/preview-auth";

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

test("public landing connects the product story to the safe Hotmart checkout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /organiza tus recetas, tu semana y tus compras/i,
    }),
  ).toBeVisible();
  for (const heading of [
    /una semana lista para seguir/i,
    /una compra más clara/i,
    /recetas para cada momento/i,
    /todo lo que incluye/i,
    /cómo funciona/i,
    /preguntas frecuentes/i,
  ]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }

  const purchase = page.getByRole("link", { name: /quiero mi acceso/i }).first();
  await expect(purchase).toHaveAttribute(
    "href",
    "https://pay.hotmart.com/TESTE2E",
  );
  expect((await purchase.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await expectNoHorizontalOverflow(page);

  await page.evaluate(() => {
    document.documentElement.style.fontSize = "125%";
  });
  await expectNoHorizontalOverflow(page);
  await expect(purchase).toBeVisible();

  await page.getByRole("link", { name: "Privacidad" }).first().click();
  await expect(page).toHaveURL(/\/privacidad$/);
  await expect(page.getByRole("heading", { level: 1, name: /privacidad/i })).toBeVisible();

  await page.goto("/terminos");
  await expect(page.getByRole("heading", { level: 1, name: /términos de uso/i })).toBeVisible();
  await page.goto("/aviso-educativo");
  await expect(page.getByRole("heading", { level: 1, name: /aviso educativo/i })).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expectNoHorizontalOverflow(page);
  await expect(page.getByRole("link", { name: /ya compré: activar acceso/i })).toBeVisible();
});

test("resources remain private and pending documents cannot be downloaded", async ({
  page,
}) => {
  await page.goto("/recursos");
  await expect(page).toHaveURL(/\/activar$/);

  await seedPreviewSession(page);
  await page.goto("/recursos");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /recursos para acompañar tu organización/i,
    }),
  ).toBeVisible();
  await expect(page.locator(".resource-card")).toHaveCount(4);
  await expect(page.getByText(/en revisión profesional/i)).toHaveCount(4);
  await expect(page.getByRole("link", { name: /descargar/i })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});
