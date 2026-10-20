import { describe, expect, it } from "vitest";

import type { AccessRequestGateway } from "../../src/application/access/AccessGateway";
import { createWorkerApp } from "../../src/worker/app";

const acceptedBody = {
  data: {
    message:
      "Si el correo tiene una compra activa, recibirás un código para continuar.",
  },
};

type FakeOptions = {
  eligible?: boolean;
  allowed?: boolean;
  sendError?: Error;
};

function fakeGateway(options: FakeOptions = {}) {
  const evidence = {
    attempts: [] as Array<{ subjectHash: string; originHash: string }>,
    checkedEmails: [] as string[],
    sentEmails: [] as string[],
  };
  const gateway: AccessRequestGateway = {
    async consumeAttempt(subjectHash, originHash) {
      evidence.attempts.push({ subjectHash, originHash });
      return options.allowed ?? true;
    },
    async hasActiveEntitlement(email) {
      evidence.checkedEmails.push(email);
      return options.eligible ?? true;
    },
    async sendOtp(email) {
      evidence.sentEmails.push(email);
      if (options.sendError) throw options.sendError;
    },
  };
  return { gateway, evidence };
}

async function requestAccess(
  gateway: AccessRequestGateway,
  email: string,
  audit: (entry: Record<string, unknown>) => void = () => undefined,
) {
  return createWorkerApp({
    accessRequestGateway: gateway,
    accessRateLimitPepper: "test-pepper",
    accessAudit: audit,
  }).request("http://local.test/api/access/request", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.8",
    },
    body: JSON.stringify({ email }),
  });
}

describe("email-only access request", () => {
  it("normalizes an eligible purchase email before sending its OTP", async () => {
    const { gateway, evidence } = fakeGateway();
    const response = await requestAccess(gateway, "  Buyer@Example.COM ");

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual(acceptedBody);
    expect(evidence.checkedEmails).toEqual(["buyer@example.com"]);
    expect(evidence.sentEmails).toEqual(["buyer@example.com"]);
    expect(evidence.attempts).toHaveLength(1);
    expect(evidence.attempts[0]!.subjectHash).not.toContain("buyer");
    expect(evidence.attempts[0]!.originHash).not.toContain("203.0.113.8");
  });

  it("returns the identical public response for an ineligible email", async () => {
    const { gateway, evidence } = fakeGateway({ eligible: false });
    const response = await requestAccess(gateway, "other@example.com");

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual(acceptedBody);
    expect(evidence.sentEmails).toEqual([]);
  });

  it("rejects a malformed email without querying purchase state", async () => {
    const { gateway, evidence } = fakeGateway();
    const response = await requestAccess(gateway, "not-an-email");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "INVALID_REQUEST",
      message: "Escribe un correo válido.",
    });
    expect(evidence.checkedEmails).toEqual([]);
  });

  it("rate limits by hashed email and origin before eligibility lookup", async () => {
    const { gateway, evidence } = fakeGateway({ allowed: false });
    const response = await requestAccess(gateway, "buyer@example.com");

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      code: "RATE_LIMITED",
      message: "Espera unos minutos antes de volver a intentarlo.",
    });
    expect(evidence.attempts).toHaveLength(1);
    expect(evidence.checkedEmails).toEqual([]);
  });

  it("keeps an OTP provider failure private and emits only safe audit fields", async () => {
    const auditEntries: Array<Record<string, unknown>> = [];
    const { gateway } = fakeGateway({
      sendError: new Error("SMTP rejected buyer@example.com"),
    });
    const response = await requestAccess(gateway, "buyer@example.com", (entry) =>
      auditEntries.push(entry),
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual(acceptedBody);
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]).toMatchObject({
      event: "access_otp_failed",
      requestId: expect.any(String),
      subjectHash: expect.any(String),
    });
    expect(JSON.stringify(auditEntries)).not.toContain("buyer@example.com");
    expect(JSON.stringify(auditEntries)).not.toContain("SMTP rejected");
  });
});
