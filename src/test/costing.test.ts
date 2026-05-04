import { describe, it, expect } from "vitest";

/**
 * Pure landed cost calculation logic, mirrored from src/pages/Costing.tsx
 * Keeping the math testable independently of React.
 */
function computeLandedCost(params: {
  unitFobUsd: number;
  quantity: number;
  totalFobUsd: number;
  totalQty: number;
  overheadClp: number;
  fxRate: number;
  method: "by_value" | "by_quantity";
  targetMarginPct: number;
}) {
  const { unitFobUsd, quantity, totalFobUsd, totalQty, overheadClp, fxRate, method, targetMarginPct } = params;
  const lineFobUsd = unitFobUsd * quantity;
  const weight =
    method === "by_value"
      ? totalFobUsd > 0 ? lineFobUsd / totalFobUsd : 0
      : totalQty > 0 ? quantity / totalQty : 0;
  const allocOverheadClp = overheadClp * weight;
  const lineLandedClp = lineFobUsd * fxRate + allocOverheadClp;
  const unitLandedClp = quantity > 0 ? lineLandedClp / quantity : 0;
  const suggestedRetail = unitLandedClp / Math.max(0.0001, 1 - targetMarginPct / 100);
  return { unitLandedClp, suggestedRetail, allocOverheadClp };
}

describe("landed cost calculation", () => {
  it("allocates overhead by value correctly", () => {
    // Two SKUs: A=10 units @ $5, B=5 units @ $20. Total FOB = 50+100 = 150 USD.
    // Overhead = 150,000 CLP. FX = 1000.
    const a = computeLandedCost({
      unitFobUsd: 5, quantity: 10,
      totalFobUsd: 150, totalQty: 15,
      overheadClp: 150_000, fxRate: 1000,
      method: "by_value", targetMarginPct: 50,
    });
    const b = computeLandedCost({
      unitFobUsd: 20, quantity: 5,
      totalFobUsd: 150, totalQty: 15,
      overheadClp: 150_000, fxRate: 1000,
      method: "by_value", targetMarginPct: 50,
    });
    // A weight = 50/150 = 33.3% → 50,000 CLP. B = 100,000 CLP.
    expect(a.allocOverheadClp).toBeCloseTo(50_000, 0);
    expect(b.allocOverheadClp).toBeCloseTo(100_000, 0);
    // Unit landed A = (50*1000 + 50000)/10 = 10,000 CLP
    expect(a.unitLandedClp).toBeCloseTo(10_000, 0);
    // Unit landed B = (100*1000 + 100000)/5 = 40,000 CLP
    expect(b.unitLandedClp).toBeCloseTo(40_000, 0);
  });

  it("computes suggested retail from target margin", () => {
    const r = computeLandedCost({
      unitFobUsd: 10, quantity: 1,
      totalFobUsd: 10, totalQty: 1,
      overheadClp: 0, fxRate: 1000,
      method: "by_value", targetMarginPct: 50,
    });
    // landed = 10,000. retail @50% margin = 10,000 / 0.5 = 20,000
    expect(r.suggestedRetail).toBeCloseTo(20_000, 0);
  });

  it("allocates by quantity when method is by_quantity", () => {
    const a = computeLandedCost({
      unitFobUsd: 1, quantity: 10,
      totalFobUsd: 100, totalQty: 20,
      overheadClp: 100_000, fxRate: 1000,
      method: "by_quantity", targetMarginPct: 0,
    });
    // weight = 10/20 = 50% → 50,000 overhead
    expect(a.allocOverheadClp).toBeCloseTo(50_000, 0);
  });

  it("handles zero quantity safely", () => {
    const r = computeLandedCost({
      unitFobUsd: 10, quantity: 0,
      totalFobUsd: 10, totalQty: 1,
      overheadClp: 1000, fxRate: 1000,
      method: "by_value", targetMarginPct: 30,
    });
    expect(r.unitLandedClp).toBe(0);
  });
});

describe("payment balance logic", () => {
  function balance(total: number, paidAmount: number) {
    return Math.max(0, total - paidAmount);
  }
  it("is zero when fully paid", () => expect(balance(100, 100)).toBe(0));
  it("never negative on overpayment edge", () => expect(balance(100, 120)).toBe(0));
  it("correct partial balance", () => expect(balance(100, 30)).toBe(70));
});
