import { describe, expect, it } from "vitest";

import {
  HotmartEntitlementService,
  HotmartEntitlementServiceError,
  type HotmartEntitlementEvent,
  type HotmartEventGateway,
  type PersistedHotmartEvent,
} from "../../src/application/access/HotmartEntitlementService";

function event(
  type: HotmartEntitlementEvent["event"],
  overrides: Partial<HotmartEntitlementEvent> = {},
): HotmartEntitlementEvent {
  return {
    id: `event-${type.toLowerCase()}`,
    creationDate: new Date("2026-10-20T12:00:00Z"),
    event: type,
    productUcode: "product-one",
    buyerEmail: " Buyer@Example.COM ",
    transaction: "HP123",
    ...overrides,
  };
}

function idempotentGateway() {
  const seen = new Set<string>();
  const current = new Map<string, PersistedHotmartEvent>();
  const gateway: HotmartEventGateway = {
    async persist(input) {
      if (seen.has(input.eventId)) return false;
      seen.add(input.eventId);
      const previous = current.get(input.providerTransactionId);
      if (!previous || input.eventCreatedAt >= previous.eventCreatedAt) {
        current.set(input.providerTransactionId, input);
      }
      return true;
    },
  };
  return { gateway, current };
}

describe("Hotmart entitlement mapping", () => {
  it("activates approved and complete purchases with normalized email", async () => {
    const { gateway, current } = idempotentGateway();
    const service = new HotmartEntitlementService(gateway, "product-one");

    await expect(service.process(event("PURCHASE_APPROVED"))).resolves.toEqual({
      handled: true,
      processed: true,
    });
    expect(current.get("HP123")).toMatchObject({
      status: "active",
      buyerEmail: "buyer@example.com",
    });

    await service.process(
      event("PURCHASE_COMPLETE", {
        id: "event-complete",
        transaction: "HP456",
      }),
    );
    expect(current.get("HP456")?.status).toBe("active");
  });

  it("revokes refunded and charged-back purchases", async () => {
    const { gateway, current } = idempotentGateway();
    const service = new HotmartEntitlementService(gateway, "product-one");

    await service.process(event("PURCHASE_REFUNDED"));
    await service.process(
      event("PURCHASE_CHARGEBACK", {
        id: "event-chargeback",
        transaction: "HP456",
      }),
    );

    expect(current.get("HP123")?.status).toBe("revoked");
    expect(current.get("HP456")?.status).toBe("revoked");
  });

  it("reports duplicates without creating more work", async () => {
    const { gateway } = idempotentGateway();
    const service = new HotmartEntitlementService(gateway, "product-one");
    const approved = event("PURCHASE_APPROVED");

    await service.process(approved);
    await expect(service.process(approved)).resolves.toEqual({
      handled: true,
      processed: false,
    });
  });

  it("records but does not apply an older event over newer state", async () => {
    const { gateway, current } = idempotentGateway();
    const service = new HotmartEntitlementService(gateway, "product-one");
    await service.process(event("PURCHASE_APPROVED"));
    await service.process(
      event("PURCHASE_REFUNDED", {
        id: "event-old-refund",
        creationDate: new Date("2026-10-19T12:00:00Z"),
      }),
    );

    expect(current.get("HP123")?.status).toBe("active");
  });

  it("rejects a different product before persistence", async () => {
    const { gateway } = idempotentGateway();
    const service = new HotmartEntitlementService(gateway, "product-one");

    await expect(
      service.process(
        event("PURCHASE_APPROVED", { productUcode: "other-product" }),
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<HotmartEntitlementServiceError>>({
        code: "WRONG_PRODUCT",
      }),
    );
  });

  it("ignores purchase events that do not change access", async () => {
    const { gateway } = idempotentGateway();
    const service = new HotmartEntitlementService(gateway, "product-one");

    await expect(service.process(event("PURCHASE_DELAYED"))).resolves.toEqual({
      handled: false,
      processed: false,
    });
  });
});
