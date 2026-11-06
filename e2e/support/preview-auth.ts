import type { Page } from "@playwright/test";

export async function seedPreviewSession(
  page: Page,
  email = "comprador.prueba@example.com",
) {
  await page.addInitScript((previewEmail) => {
    const now = Math.floor(Date.now() / 1000);
    window.sessionStorage.setItem(
      "mi-semana:preview-session",
      JSON.stringify({
        access_token: `preview-access-${previewEmail}`,
        refresh_token: "preview-refresh",
        expires_in: 3600,
        expires_at: now + 3600,
        token_type: "bearer",
        user: {
          id: `preview-${previewEmail}`,
          email: previewEmail,
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date(now * 1000).toISOString(),
        },
      }),
    );
  }, email);
}
