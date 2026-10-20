export type HotmartAccessEvent =
  | "PURCHASE_APPROVED"
  | "PURCHASE_COMPLETE"
  | "PURCHASE_REFUNDED"
  | "PURCHASE_CHARGEBACK"
  | "PURCHASE_DELAYED";

export type HotmartEntitlementEvent = {
  id: string;
  creationDate: Date;
  event: HotmartAccessEvent;
  productUcode: string;
  buyerEmail: string;
  transaction: string;
};

export type PersistedHotmartEvent = {
  eventId: string;
  eventCreatedAt: string;
  eventType: string;
  providerTransactionId: string;
  productUcode: string;
  buyerEmail: string;
  status: "active" | "revoked";
};

export interface HotmartEventGateway {
  persist(input: PersistedHotmartEvent): Promise<boolean>;
}

export class HotmartEntitlementServiceError extends Error {
  constructor(readonly code: "WRONG_PRODUCT") {
    super("Hotmart event belongs to another product");
    this.name = "HotmartEntitlementServiceError";
  }
}

const stateByEvent: Partial<
  Record<HotmartAccessEvent, PersistedHotmartEvent["status"]>
> = {
  PURCHASE_APPROVED: "active",
  PURCHASE_COMPLETE: "active",
  PURCHASE_REFUNDED: "revoked",
  PURCHASE_CHARGEBACK: "revoked",
};

export class HotmartEntitlementService {
  constructor(
    private readonly gateway: HotmartEventGateway,
    private readonly productUcode: string,
  ) {}

  async process(input: HotmartEntitlementEvent) {
    if (input.productUcode !== this.productUcode) {
      throw new HotmartEntitlementServiceError("WRONG_PRODUCT");
    }

    const status = stateByEvent[input.event];
    if (!status) return { handled: false, processed: false };

    const processed = await this.gateway.persist({
      eventId: input.id,
      eventCreatedAt: input.creationDate.toISOString(),
      eventType: input.event,
      providerTransactionId: input.transaction,
      productUcode: input.productUcode,
      buyerEmail: input.buyerEmail.trim().toLowerCase(),
      status,
    });
    return { handled: true, processed };
  }
}
