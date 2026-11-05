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
  const testWeekStart = "2026-12-07";
  await page.setViewportSize({ width: 375, height: 667 });
  await seedPreviewSession(page);
  await page.request.delete(`/api/saved-weeks/${testWeekStart}`);
  await page.goto(`/semana?week=${testWeekStart}`);
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

  await page.getByRole("button", { name: /^guardar en mis semanas$/i }).click();
  const savedWeekName = page.getByRole("textbox", { name: /nombre de la semana/i });
  await savedWeekName.fill("Semana E2E");
  await page.getByRole("button", { name: /^guardar semana$/i }).click();
  await expect(page.getByText(/semana guardada en mis semanas/i)).toBeVisible();

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
  const restoredFirstCheck = restoredFirstRow.getByRole("checkbox");
  await expect(restoredFirstCheck).toHaveAttribute("aria-label", /Aprox\. 2/i);
  const checkedLabel = await restoredFirstCheck.getAttribute("aria-label");

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

  await page.getByRole("link", { name: "Semana", exact: true }).click();
  await page.getByRole("link", { name: "Mis Semanas", exact: true }).click();
  const savedCard = page.getByRole("article", { name: "Semana E2E" });
  await expect(savedCard).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await savedCard.getByRole("link", { name: /abrir semana/i }).click();
  await expect(page).toHaveURL(new RegExp(`/semana\\?week=${testWeekStart}$`));
  await page.getByRole("link", { name: "Compras", exact: true }).click();
  await expect(page.getByText("Papel aluminio E2E")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: checkedLabel ?? "" })).toBeChecked();

  await page.getByRole("link", { name: "Semana", exact: true }).click();
  await page.getByRole("link", { name: "Mis Semanas", exact: true }).click();
  await page.getByRole("article", { name: "Semana E2E" }).getByRole("button", { name: /renombrar/i }).click();
  await page.getByRole("textbox", { name: /nombre de la semana/i }).fill("Semana E2E renovada");
  await page.getByRole("button", { name: /^guardar nombre$/i }).click();
  await expect(page.getByRole("article", { name: "Semana E2E renovada" })).toBeVisible();

  await page.getByRole("button", { name: /crear otra semana/i }).click();
  await expect(page).toHaveURL(/\/semana\?week=2026-12-14$/);
  await expect(page.getByRole("heading", { name: "Tu semana" })).toBeVisible();
  await page.getByRole("link", { name: "Mis Semanas", exact: true }).click();
  const renamedCard = page.getByRole("article", { name: "Semana E2E renovada" });
  await renamedCard.getByRole("button", { name: /eliminar/i }).click();
  await page.getByRole("button", { name: /^sí, eliminar$/i }).click();
  await expect(page.getByText(/todavía no guardaste semanas/i)).toBeVisible();

  await page.evaluate(() => {
    document.documentElement.style.fontSize = "125%";
  });
  await expectNoHorizontalOverflow(page);
  await expect(page.getByRole("navigation", { name: /navegación principal/i })).toBeVisible();
});
