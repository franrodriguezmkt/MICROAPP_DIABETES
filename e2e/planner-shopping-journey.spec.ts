import { expect, test, type Page } from "@playwright/test";

import { seedPreviewSession } from "./support/preview-auth";

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

async function ensurePlannerConfigured(page: Page) {
  const onboarding = page.getByRole("heading", { name: /organiza tu semana/i });

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /organiza tu semana|tu semana/i,
  );

  if (await onboarding.isVisible().catch(() => false)) {
    await page.getByRole("spinbutton", { name: /personas/i }).fill("2");
    for (const meal of ["Desayuno", "Almuerzo", "Cena", "Snack"]) {
      const checkbox = page.getByRole("checkbox", { name: meal });
      if (!(await checkbox.isChecked())) await checkbox.check();
    }
    await page.getByRole("button", { name: /organizar mi semana/i }).click();
  } else {
    await page.getByRole("button", { name: /editar preferencias/i }).click();
    await page.getByRole("spinbutton", { name: /personas/i }).fill("2");
    for (const meal of ["Desayuno", "Almuerzo", "Cena", "Snack"]) {
      const checkbox = page.getByRole("checkbox", { name: meal });
      if (!(await checkbox.isChecked())) await checkbox.check();
    }
    await page.getByRole("button", { name: /guardar preferencias/i }).click();
    await page.getByRole("button", { name: /confirmar cambios/i }).click();
  }

  await expect(page.getByRole("heading", { name: "Tu semana" })).toBeVisible();
}

test("plans a mobile week and preserves shopping progress during the preview session", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await seedPreviewSession(page);
  await page.goto("/semana");
  await ensurePlannerConfigured(page);

  await expect(page.locator(".week-day > h2")).toHaveCount(7);
  await expect(page.locator(".week-meal-card__type", { hasText: "Snack" })).toHaveCount(7);
  await expectNoHorizontalOverflow(page);

  const firstCard = page.locator(".week-meal-card").first();
  const originalRecipe = await firstCard.getByRole("heading", { level: 3 }).textContent();
  await firstCard.getByRole("button", { name: /cambiar receta/i }).click();
  const replacementDialog = page.getByRole("dialog", { name: /cambiar/i });
  await replacementDialog.getByRole("button", { name: /elegir/i }).first().click();
  await expect(firstCard.getByRole("heading", { level: 3 })).not.toHaveText(originalRecipe ?? "");

  await page.getByRole("link", { name: "Compras" }).click();
  await expect(page.getByRole("heading", { name: /lista de compras/i })).toBeVisible();
  const generatedRows = page.locator(".shopping-item").filter({
    has: page.getByRole("button", { name: /quitar/i }),
  });
  const firstGeneratedRow = generatedRows.first();
  const firstGeneratedCheck = firstGeneratedRow.getByRole("checkbox");
  const firstGeneratedLabel = await firstGeneratedRow.locator("strong").textContent();
  await firstGeneratedCheck.check();
  await expect(firstGeneratedCheck).toBeChecked();
  await firstGeneratedRow.getByRole("button", { name: /editar/i }).click();
  await page.getByRole("spinbutton", { name: /cantidad/i }).fill("2");
  await page.getByRole("button", { name: /guardar/i }).click();
  const restoredFirstRow = page.locator(".shopping-item").filter({
    has: page.getByText(firstGeneratedLabel ?? "", { exact: true }),
  }).first();
  const checkedLabel = await restoredFirstRow.getByRole("checkbox").getAttribute("aria-label");
  expect(checkedLabel).toMatch(/Aprox\. 2/i);

  const removableRow = generatedRows.nth(1);
  const removableLabel = await removableRow.locator("strong").textContent();
  await removableRow.getByRole("button", { name: /quitar/i }).click();
  await expect(page.getByText(removableLabel ?? "", { exact: true })).toHaveCount(0);

  await page.getByRole("textbox", { name: /nuevo producto/i }).fill("Papel aluminio E2E");
  await page.getByRole("button", { name: /agregar producto/i }).click();
  await expect(page.getByText("Papel aluminio E2E")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.reload();
  await expect(page.getByText("Papel aluminio E2E")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: checkedLabel ?? "" })).toBeChecked();
  await expect(page.getByText(removableLabel ?? "", { exact: true })).toHaveCount(0);

  await page.evaluate(() => {
    document.documentElement.style.fontSize = "125%";
  });
  await expectNoHorizontalOverflow(page);
  await expect(page.getByRole("navigation", { name: /navegación principal/i })).toBeVisible();
});
