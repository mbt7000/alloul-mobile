/**
 * Smoke tests for billing API client.
 * Validates exports and PLANS metadata.
 */
import { PLANS } from "../../src/api/billing.api";
import type { PlanTier } from "../../src/api/billing.api";

describe("billing.api", () => {
  it("exports 3 plan tiers", () => {
    const tiers: PlanTier[] = ["starter", "professional", "business"];
    for (const t of tiers) {
      expect(PLANS[t]).toBeDefined();
      expect(PLANS[t].name).toBeTruthy();
      expect(PLANS[t].monthlyPrice).toBeGreaterThan(0);
      expect(PLANS[t].yearlyPrice).toBeGreaterThan(0);
    }
  });

  it("starter has 14-day trial", () => {
    expect(PLANS.starter.trialDays).toBe(14);
    expect(PLANS.professional.trialDays).toBe(0);
    expect(PLANS.business.trialDays).toBe(0);
  });

  it("yearly pricing is ≥ 10x monthly", () => {
    for (const key of Object.keys(PLANS) as PlanTier[]) {
      expect(PLANS[key].yearlyPrice).toBeGreaterThanOrEqual(PLANS[key].monthlyPrice * 10);
    }
  });

  it("employee limits ascend with tier", () => {
    expect(PLANS.starter.employeeLimit).toBeLessThan(PLANS.professional.employeeLimit);
    expect(PLANS.professional.employeeLimit).toBeLessThan(PLANS.business.employeeLimit);
  });
});
