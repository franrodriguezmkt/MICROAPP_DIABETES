import { describe, expect, it } from "vitest";

import type {
  HotmartEventGateway,
  PersistedHotmartEvent,
} from "../../src/application/access/HotmartEntitlementService";
import { createWorkerApp } from "../../src/worker/app";

function payload(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-one",
    creation_date: Date.parse("2026-10-20T12:00:00Z"),
    event: "PURCHASE_APPROVED",
    version: "2.0.0",
    data: {
      product: { ucode: "product-one", name: "Private product name" },
      buyer: { email: "buyer@example.com", name: "Private buyer name" },
      purchase: { transaction: "HP123", price: { value: 10 } },
    },
    ...overrides,
  };
}

function harness() {
  const persisted: PersistedHotmartEvent[] = [];
  const gateway: HotmartEventGateway = {
    async persist(input) {
      persisted.push(input);
      return true;
    },
  };
  const audit: Array<Record<string, unknown>> = [];
  const app = createWorkerApp({
    hotmartEventGateway: gateway,
    hotmartHottok: "secret-hottok",
    hotmartProductUcode: "product-one",
    hotmartAudit: (entry) => audit.push(entry),
  });
  return { app, persisted, audit };
}

async function send(
  app: ReturnType<typeof createWorkerApp>,
  body: unknown,
  hottok?: string,
) {
  const headers = new Headers({ "content-type": "application/json" });
  if (hottok) headers.set("x-hotmart-hottok", hottok);
  return app.request("http://local.test/api/webhooks/hotmart", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("Hotmart Webhook 2.0 route", () => {
  it("accepts a valid signed purchase without returning private data", async () => {
    const { app, persisted } = harness();
    const response = await send(app, payload(), "secret-hottok");

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(persisted).toEqual([
      expect.objectContaining({
        eventId: "event-one",
        providerTransactionId: "HP123",
        status: "active",
        buyerEmail: "buyer@example.com",
      }),
    ]);
  });

  it("rejects a missing or invalid Hottok in the same way", async () => {
    const missing = harness();
    const invalid = harness();

    const missingResponse = await send(missing.app, payload());
    const invalidResponse = await send(
      invalid.app,
      payload(),
      "wrong-hottok",
    );

    expect(missingResponse.status).toBe(401);
    expect(invalidResponse.status).toBe(401);
    await expect(missingResponse.json()).resolves.toMatchObject({
      code: "INVALID_WEBHOOK",
    });
    await expect(invalidResponse.json()).resolves.toMatchObject({
      code: "INVALID_WEBHOOK",
    });
    expect(missing.persisted).toEqual([]);
    expect(invalid.persisted).toEqual([]);
  });

  it("rejects a malformed payload before persistence", async () => {
    const { app, persisted } = harness();
    const response = await send(app, { id: "event-one" }, "secret-hottok");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "INVALID_WEBHOOK_PAYLOAD",
    });
    expect(persisted).toEqual([]);
  });

  it("acknowledges unsupported events without changing access", async () => {
    const { app, persisted } = harness();
    const response = await send(
      app,
      payload({ event: "PURCHASE_DELAYED" }),
      "secret-hottok",
    );

    expect(response.status).toBe(204);
    expect(persisted).toEqual([]);
  });

  it("ignores a different product and audits only safe identifiers", async () => {
    const { app, persisted, audit } = harness();
    const wrongProduct = payload({
      data: {
        product: { ucode: "other-product" },
        buyer: { email: "buyer@example.com" },
        purchase: { transaction: "HP123" },
      },
    });
    const response = await send(app, wrongProduct, "secret-hottok");

    expect(response.status).toBe(204);
    expect(persisted).toEqual([]);
    expect(audit).toEqual([
      expect.objectContaining({
        event: "hotmart_wrong_product",
        eventId: "event-one",
        requestId: expect.any(String),
      }),
    ]);
    const logs = JSON.stringify(audit);
    expect(logs).not.toContain("buyer@example.com");
    expect(logs).not.toContain("secret-hottok");
    expect(logs).not.toContain("HP123");
  });
});
