import { describe, it, expect } from "vitest";
import {
  calculateWorkingDays,
  getWorkingDays,
  calculateCompletionRate,
  detectEvaluationOverlap,
  getOverlappingWorkingDays,
} from "@/lib/calculations/working-days";

describe("calculateWorkingDays", () => {
  it("counts working days excluding weekends", () => {
    // Aug 1-5, 2026 (Fri, Sat, Sun, Mon, Tue) → 3 working days (Fri, Mon, Tue)
    const count = calculateWorkingDays("2026-08-01", "2026-08-05");
    expect(count).toBe(3);
  });

  it("returns 0 for end before start", () => {
    expect(calculateWorkingDays("2026-08-10", "2026-08-01")).toBe(0);
  });

  it("excludes holidays", () => {
    const holidays = [new Date("2026-08-12")]; // Wednesday
    const count = calculateWorkingDays("2026-08-10", "2026-08-14", holidays);
    // Mon 10, Tue 11, Wed 12 (holiday), Thu 13, Fri 14 → 4 working days
    expect(count).toBe(4);
  });

  it("handles single day (weekday)", () => {
    // Aug 10, 2026 = Monday
    expect(calculateWorkingDays("2026-08-10", "2026-08-10")).toBe(1);
  });

  it("handles single day (weekend)", () => {
    // Aug 8, 2026 = Saturday
    expect(calculateWorkingDays("2026-08-08", "2026-08-08")).toBe(0);
  });
});

describe("calculateCompletionRate", () => {
  it("calculates correct percentage", () => {
    expect(calculateCompletionRate(15, 20)).toBe(75);
    expect(calculateCompletionRate(20, 20)).toBe(100);
    expect(calculateCompletionRate(0, 20)).toBe(0);
  });

  it("returns 0 when expected is 0", () => {
    expect(calculateCompletionRate(5, 0)).toBe(0);
  });

  it("caps at 100%", () => {
    expect(calculateCompletionRate(25, 20)).toBe(100);
  });
});

describe("detectEvaluationOverlap", () => {
  const existing = [
    { startDate: "2026-08-07", endDate: "2026-08-07" },
    { startDate: "2026-08-10", endDate: "2026-08-12" },
  ];

  it("detects overlap when new range includes existing date", () => {
    const overlaps = detectEvaluationOverlap(
      { startDate: "2026-08-05", endDate: "2026-08-10" },
      existing
    );
    expect(overlaps.length).toBeGreaterThan(0);
  });

  it("returns empty when no overlap", () => {
    const overlaps = detectEvaluationOverlap(
      { startDate: "2026-08-13", endDate: "2026-08-14" },
      existing
    );
    expect(overlaps).toHaveLength(0);
  });

  it("detects exact date match", () => {
    const overlaps = detectEvaluationOverlap(
      { startDate: "2026-08-07", endDate: "2026-08-07" },
      existing
    );
    expect(overlaps.length).toBe(1);
  });
});

describe("getOverlappingWorkingDays", () => {
  it("returns overlapping working day strings", () => {
    const existing = [{ startDate: "2026-08-07", endDate: "2026-08-07" }]; // Friday
    const overlapping = getOverlappingWorkingDays(
      { startDate: "2026-08-05", endDate: "2026-08-10" },
      existing
    );
    // Aug 7 is a Friday (working day)
    expect(overlapping).toContain("2026-08-07");
  });

  it("returns empty array when no overlap", () => {
    const existing = [{ startDate: "2026-08-01", endDate: "2026-08-03" }];
    const overlapping = getOverlappingWorkingDays(
      { startDate: "2026-08-10", endDate: "2026-08-14" },
      existing
    );
    expect(overlapping).toHaveLength(0);
  });
});
