import { describe, expect, it } from "vitest";
import { groupEvaluationsByEvaluator } from "@/lib/evaluations/grouping";

const makeRecord = (overrides: Partial<any> = {}) => ({
  id: "record-1",
  period: { id: "period-1", name: "สิงหาคม 2569" },
  evaluatorUser: { id: "evaluator-1", fullName: "ผู้ประเมิน 1", username: "evaluator1" },
  employee: { id: "employee-1" },
  evalStartDate: "2026-08-01",
  evalEndDate: "2026-08-31",
  status: "SUBMITTED" as const,
  createdAt: "2026-08-31T10:00:00.000Z",
  ...overrides,
});

describe("groupEvaluationsByEvaluator", () => {
  it("groups records for the same evaluator within the same period", () => {
    const groups = groupEvaluationsByEvaluator([
      makeRecord(),
      makeRecord({ id: "record-2", employee: { id: "employee-2" }, createdAt: "2026-08-31T11:00:00.000Z" }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].records).toHaveLength(2);
    expect(groups[0].employeeCount).toBe(2);
    expect(groups[0].statusCounts.SUBMITTED).toBe(2);
  });

  it("keeps different evaluators separate", () => {
    const groups = groupEvaluationsByEvaluator([
      makeRecord(),
      makeRecord({
        id: "record-2",
        evaluatorUser: { id: "evaluator-2", fullName: "ผู้ประเมิน 2", username: "evaluator2" },
      }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.evaluatorUser.id)).toEqual(["evaluator-1", "evaluator-2"]);
  });

  it("keeps the same evaluator separate across periods", () => {
    const groups = groupEvaluationsByEvaluator([
      makeRecord(),
      makeRecord({
        id: "record-2",
        period: { id: "period-2", name: "กันยายน 2569" },
      }),
    ]);

    expect(groups).toHaveLength(2);
  });

  it("summarizes mixed statuses and multiple date ranges", () => {
    const groups = groupEvaluationsByEvaluator([
      makeRecord(),
      makeRecord({
        id: "record-2",
        status: "DRAFT",
        evalStartDate: "2026-08-15",
        createdAt: "2026-08-31T11:00:00.000Z",
      }),
    ]);

    expect(groups[0].statusCounts).toEqual({ DRAFT: 1, SUBMITTED: 1, LOCKED: 0 });
    expect(groups[0].dateRange).toBeNull();
  });
});

