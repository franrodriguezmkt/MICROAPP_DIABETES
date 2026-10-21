import { expect, test, type Page } from "@playwright/test";

const previewBuyer = "comprador.prueba@example.com";
const previewOtp = "123456";

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

async function activatePreviewAccess(page: Page, email = previewBuyer) {
  await page.goto("/activar");
  await page.getByRole("textbox", { name: /correo usado en hotmart/i }).fill(email);
  await page.getByRole("button", { name: /enviar código/i }).click();
  await expect(page).toHaveURL(/\/verificar$/);
  await page.getByRole("textbox", { name: /código de seis dígitos/i }).fill(previewOtp);
  await page.getByRole("button", { name: /confirmar acceso/i }).click();
  expect(
    await page.evaluate(() => window.sessionStorage.getItem("mi-semana:preview-session")),
  ).not.toBeNull();
}

async function completePreferences(page: Page) {
  const onboarding = page.getByRole("heading", { name: /organiza tu semana/i });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /organiza tu semana|tu semana/i,
  );

  if (!(await onboarding.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: /editar preferencias/i }).click();
  }

  await page.getByRole("spinbutton", { name: /personas/i }).fill("2");
  for (const meal of ["Desayuno", "Almuerzo", "Cena", "Snack"]) {
    const checkbox = page.getByRole("checkbox", { name: meal });
    if (!(await checkbox.isChecked())) await checkbox.check();
  }

  if (await onboarding.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /organizar mi semana/i }).click();
  } else {
    await page.getByRole("button", { name: /guardar preferencias/i }).click();
    await page.getByRole("button", { name: /confirmar cambios/i }).click();
  }
}

test("preview simulado: activa el acceso, planifica y conserva la compra", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await activatePreviewAccess(page);

  await expect(page).toHaveURL(/\/semana$/);
  await completePreferences(page);

  await expect(page.locator(".week-day > h2")).toHaveCount(7);
  await expect(page.locator(".week-meal-card__type", { hasText: "Snack" })).toHaveCount(7);

  const firstCard = page.locator(".week-meal-card").first();
  const originalRecipe = await firstCard.getByRole("heading", { level: 3 }).textContent();
  await firstCard.getByRole("button", { name: /cambiar receta/i }).click();
  await page
    .getByRole("dialog", { name: /cambiar/i })
    .getByRole("button", { name: /elegir/i })
    .first()
    .click();
  await expect(firstCard.getByRole("heading", { level: 3 })).not.toHaveText(
    originalRecipe ?? "",
  );

  await page.getByRole("link", { name: "Compras" }).click();
  const generatedItem = page
    .locator(".shopping-item")
    .filter({ hasNot: page.getByRole("button", { name: /eliminar/i }) })
    .getByRole("checkbox")
    .first();
  const generatedLabel = await generatedItem.getAttribute("aria-label");
  await generatedItem.check();

  await page.getByRole("textbox", { name: /nuevo producto/i }).fill("Canela E2E");
  await page.getByRole("button", { name: /agregar producto/i }).click();
  await expect(page.getByText("Canela E2E")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Canela E2E")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: generatedLabel ?? "" })).toBeChecked();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { name: "Cuenta" }).click();
  await expect(page.getByText(previewBuyer)).toBeVisible();
  await page.getByRole("button", { name: /cerrar sesión/i }).click();
  await expect(page).toHaveURL(/\/activar$/);
});

test("preview simulado: una ruta privada anónima vuelve a activación", async ({ page }) => {
  await page.goto("/compras");
  await expect(page).toHaveURL(/\/activar$/);
});

test("preview simulado: un acceso revocado solo puede abrir Cuenta", async ({ page }) => {
  await page.route("**/api/me", async (route) => {
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ error: "ENTITLEMENT_INACTIVE" }),
    });
  });

  await activatePreviewAccess(page, "reembolso.prueba@example.com");
  await expect(page).toHaveURL(/\/cuenta\?estado=inactivo$/);
  await expect(page.getByText(/acceso inactivo/i)).toBeVisible();
  await page.getByRole("button", { name: /cerrar sesión/i }).click();
  await expect(page).toHaveURL(/\/activar$/);
});
