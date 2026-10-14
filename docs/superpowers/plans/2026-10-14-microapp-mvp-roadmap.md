# Microapp MVP Delivery Roadmap

**Goal:** Deliver the approved microapp as four independently testable increments, each with its own implementation plan and review gate.

**Spec:** `docs/superpowers/specs/2026-10-14-microapp-recetas-diabetes-design.md`

## Why the work is split

The approved specification contains four subsystems that can fail independently: the recipe experience, weekly planning and shopping aggregation, purchase-gated identity, and the commercial launch surface. Building them as separate increments keeps each review meaningful and prevents payment or infrastructure work from blocking the core product experience.

## Increment 1 - Recipe foundation

Detailed plan: `docs/superpowers/plans/2026-10-14-recipe-foundation-implementation.md`

Deliverable:

- React mobile-first SPA and Cloudflare Worker in one deployable project.
- Test harness, route shell and PWA baseline.
- Typed recipe domain and content validation.
- All 45 source recipes normalized as non-public draft content.
- Searchable recipe catalog and recipe detail views using approved test fixtures.
- Production guard that prevents unreviewed medical content from appearing publicly.

Acceptance gate: local tests, Worker health endpoint, production build and browser journey all pass.

## Increment 2 - Weekly planner and shopping list

Future plan file: `docs/superpowers/plans/2026-10-14-planner-shopping-implementation.md`

Deliverable:

- User preferences and exclusions.
- Deterministic weekly menu generation.
- Single-recipe replacement without changing the rest of the week.
- Household serving adjustment.
- Unit-safe ingredient aggregation.
- Checkable and manually extendable shopping list.

Acceptance gate: deterministic algorithm tests cover exclusions, insufficient choices, repeat avoidance, incompatible units and recalculation.

## Increment 3 - Accounts, entitlements and Hotmart

Future plan file: `docs/superpowers/plans/2026-10-14-access-hotmart-implementation.md`

Deliverable:

- Supabase schema, migrations and Row Level Security.
- Email-only activation followed by an OTP sent to that email.
- Generic activation responses that do not reveal purchase status.
- Hotmart Webhook 2.0 endpoint validating `X-HOTMART-HOTTOK`.
- Idempotent purchase approval, refund and chargeback handling.
- One purchase entitlement linked to at most one user.
- SMTP configuration boundary for development and production.

Acceptance gate: webhook contract tests, RLS tests and complete activation/revocation journeys pass.

## Increment 4 - Landing, launch and operations

Future plan file: `docs/superpowers/plans/2026-10-14-launch-implementation.md`

Deliverable:

- Conversion-focused landing connected to the Hotmart checkout.
- Resource library for reviewed supplementary PDFs.
- Privacy, terms and educational medical notice.
- Custom domain and Cloudflare production deployment.
- Production Supabase and SMTP configuration.
- Monitoring, export procedure and recovery runbook.
- Real purchase and refund verification.

Acceptance gate: mobile browser matrix, accessibility checks, production smoke test, real payment flow and rollback procedure pass.

## Sequence rule

Each increment receives a detailed plan immediately before execution so its exact interfaces match the code produced by the previous increment. The domain types established in Increment 1 are the contract consumed by every later plan.
