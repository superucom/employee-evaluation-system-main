import { describe, it, expect } from "vitest";
import {
  calculateEvaluationScore,
  scoreToPercentage,
  calculateWeightedScore,
  calculateFinalScore,
  calculateGrade,
  validateTotalWeight,
  getTotalWeight,
} from "@/lib/calculations/score";

describe("calculateEvaluationScore", () => {
  it("calculates average of question scores", () => {
    const scores = [
      { scoreValue: 4, minScore: 1, maxScore: 5 },
      { scoreValue: 3, minScore: 1, maxScore: 5 },
      { scoreValue: 5, minScore: 1, maxScore: 5 },
    ];
    expect(calculateEvaluationScore(scores)).toBeCloseTo(4.0);
  });

  it("returns 0 for empty array", () => {
    expect(calculateEvaluationScore([])).toBe(0);
  });

  it("handles single score", () => {
    const scores = [{ scoreValue: 5, minScore: 1, maxScore: 5 }];
    expect(calculateEvaluationScore(scores)).toBe(5);
  });
});

describe("scoreToPercentage", () => {
  it("converts score to percentage (1-5 scale)", () => {
    expect(scoreToPercentage(5, 1, 5)).toBe(100);
    expect(scoreToPercentage(1, 1, 5)).toBe(0);
    expect(scoreToPercentage(3, 1, 5)).toBe(50);
    expect(scoreToPercentage(4, 1, 5)).toBeCloseTo(75);
  });

  it("handles 1-10 scale", () => {
    expect(scoreToPercentage(10, 1, 10)).toBe(100);
    expect(scoreToPercentage(5, 1, 10)).toBeCloseTo(44.44, 1);
  });

  it("clamps to 0-100", () => {
    expect(scoreToPercentage(6, 1, 5)).toBe(100);
    expect(scoreToPercentage(0, 1, 5)).toBe(0);
  });
});

describe("calculateWeightedScore", () => {
  it("calculates weighted score correctly", () => {
    // From the spec: Score=4, Weight=40% → Weighted=1.6 (as % of 100)
    // Raw% = (4-1)/(5-1)*100 = 75%, Weighted = 75 * 0.40 = 30
    expect(calculateWeightedScore(75, 40)).toBe(30);
    expect(calculateWeightedScore(100, 50)).toBe(50);
    expect(calculateWeightedScore(0, 100)).toBe(0);
  });
});

describe("calculateFinalScore — multi-evaluator example from spec", () => {
  it("matches the spec example: Super=4@40%, SupportSuper=3@20%, Head=5@30%, SupportHead=4@10%", () => {
    const evaluators = [
      {
        evaluatorId: "super",
        scores: [{ scoreValue: 4, minScore: 1, maxScore: 5 }],
        weightPercentage: 40,
      },
      {
        evaluatorId: "support_super",
        scores: [{ scoreValue: 3, minScore: 1, maxScore: 5 }],
        weightPercentage: 20,
      },
      {
        evaluatorId: "head",
        scores: [{ scoreValue: 5, minScore: 1, maxScore: 5 }],
        weightPercentage: 30,
      },
      {
        evaluatorId: "support_head",
        scores: [{ scoreValue: 4, minScore: 1, maxScore: 5 }],
        weightPercentage: 10,
      },
    ];

    const result = calculateFinalScore(evaluators);
    // Super: 75% * 40% = 30
    // SupportSuper: 50% * 20% = 10
    // Head: 100% * 30% = 30
    // SupportHead: 75% * 10% = 7.5
    // Total: 77.5
    expect(result.finalPercentage).toBeCloseTo(77.5, 1);
    expect(result.evaluatorBreakdown).toHaveLength(4);
  });

  it("returns 0 for empty evaluators", () => {
    const result = calculateFinalScore([]);
    expect(result.finalPercentage).toBe(0);
  });
});

describe("calculateGrade", () => {
  const grades = [
    { label: "A", minPercentage: 90, maxPercentage: 100 },
    { label: "B", minPercentage: 80, maxPercentage: 89.99 },
    { label: "C", minPercentage: 70, maxPercentage: 79.99 },
    { label: "D", minPercentage: 60, maxPercentage: 69.99 },
    { label: "F", minPercentage: 0, maxPercentage: 59.99 },
  ];

  it("assigns grade A for 90-100%", () => {
    expect(calculateGrade(95, grades)).toBe("A");
    expect(calculateGrade(90, grades)).toBe("A");
    expect(calculateGrade(100, grades)).toBe("A");
  });

  it("assigns grade B for 80-89%", () => {
    expect(calculateGrade(85, grades)).toBe("B");
    expect(calculateGrade(80, grades)).toBe("B");
  });

  it("assigns grade C for 70-79%", () => {
    expect(calculateGrade(77.5, grades)).toBe("C");
  });

  it("assigns grade F for below 60%", () => {
    expect(calculateGrade(50, grades)).toBe("F");
    expect(calculateGrade(0, grades)).toBe("F");
  });

  it("returns N/A for empty grades", () => {
    expect(calculateGrade(80, [])).toBe("N/A");
  });
});

describe("validateTotalWeight", () => {
  it("returns true when weights sum to 100", () => {
    expect(validateTotalWeight([40, 20, 30, 10])).toBe(true);
    expect(validateTotalWeight([100])).toBe(true);
    expect(validateTotalWeight([50, 50])).toBe(true);
  });

  it("returns false when weights do not sum to 100", () => {
    expect(validateTotalWeight([40, 20, 30])).toBe(false); // 90
    expect(validateTotalWeight([40, 20, 30, 20])).toBe(false); // 110
  });

  it("handles floating point gracefully", () => {
    expect(validateTotalWeight([33.33, 33.33, 33.34])).toBe(true);
  });

  it("returns false for empty array", () => {
    expect(validateTotalWeight([])).toBe(false);
  });
});
