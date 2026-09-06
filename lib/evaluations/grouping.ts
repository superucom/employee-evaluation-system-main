export type EvaluationStatusValue = "DRAFT" | "SUBMITTED" | "LOCKED";

export interface GroupableEvaluationRecord {
  id: string;
  period: { id: string; name: string };
  evaluatorUser: { id: string; fullName: string; username: string };
  employee: { id: string };
  evalStartDate: string;
  evalEndDate: string;
  status: EvaluationStatusValue;
  createdAt: string;
}

export interface EvaluationGroup<T extends GroupableEvaluationRecord> {
  key: string;
  evaluatorUser: T["evaluatorUser"];
  period: T["period"];
  records: T[];
  employeeCount: number;
  dateRange: { start: string; end: string } | null;
  statusCounts: Record<EvaluationStatusValue, number>;
  latestCreatedAt: string;
}

const EMPTY_STATUS_COUNTS: Record<EvaluationStatusValue, number> = {
  DRAFT: 0,
  SUBMITTED: 0,
  LOCKED: 0,
};

function toTimestamp(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

/**
 * Groups records by evaluator within an evaluation period.
 * Records from different periods intentionally remain separate groups.
 */
export function groupEvaluationsByEvaluator<T extends GroupableEvaluationRecord>(
  records: T[]
): EvaluationGroup<T>[] {
  const groups = new Map<string, EvaluationGroup<T>>();

  for (const record of records) {
    const key = `${record.evaluatorUser.id}:${record.period.id}`;
    let group = groups.get(key);

    if (!group) {
      group = {
        key,
        evaluatorUser: record.evaluatorUser,
        period: record.period,
        records: [],
        employeeCount: 0,
        dateRange: null,
        statusCounts: { ...EMPTY_STATUS_COUNTS },
        latestCreatedAt: record.createdAt,
      };
      groups.set(key, group);
    }

    group.records.push(record);
    group.statusCounts[record.status] += 1;
    group.latestCreatedAt =
      toTimestamp(record.createdAt) > toTimestamp(group.latestCreatedAt)
        ? record.createdAt
        : group.latestCreatedAt;
  }

  return Array.from(groups.values())
    .map((group) => {
      const employeeIds = new Set(group.records.map((record) => record.employee.id));
      const startDates = new Set(group.records.map((record) => record.evalStartDate));
      const endDates = new Set(group.records.map((record) => record.evalEndDate));

      return {
        ...group,
        employeeCount: employeeIds.size,
        dateRange:
          startDates.size === 1 && endDates.size === 1
            ? { start: group.records[0].evalStartDate, end: group.records[0].evalEndDate }
            : null,
      };
    })
    .sort((a, b) => toTimestamp(b.latestCreatedAt) - toTimestamp(a.latestCreatedAt));
}

