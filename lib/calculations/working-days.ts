/**
 * Working Day & Date Range Calculations
 * Counts weekdays in the selected date range and excludes configured holidays.
 */

import { format, eachDayOfInterval, parseISO } from "date-fns";

// ==========================================
// 1. Calculate working days in date range
// ==========================================
export function calculateWorkingDays(
  startDate: Date | string,
  endDate: Date | string,
  holidays: Date[] = []
): number {
  const start = typeof startDate === "string" ? parseISO(startDate) : startDate;
  const end = typeof endDate === "string" ? parseISO(endDate) : endDate;

  if (end < start) return 0;

  return getWorkingDays(start, end, holidays).length;
}

// ==========================================
// 2. Get list of weekdays in range
// ==========================================
export function getWorkingDays(
  startDate: Date | string,
  endDate: Date | string,
  holidays: Date[] = []
): Date[] {
  const start = typeof startDate === "string" ? parseISO(startDate) : startDate;
  const end = typeof endDate === "string" ? parseISO(endDate) : endDate;

  if (end < start) return [];

  const holidayKeys = new Set(holidays.map((holiday) => format(holiday, "yyyy-MM-dd")));
  return eachDayOfInterval({ start, end }).filter((day) => {
    const dayOfWeek = day.getDay();
    return dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayKeys.has(format(day, "yyyy-MM-dd"));
  });
}

// ==========================================
// 3. Calculate completion rate
// ==========================================
export function calculateCompletionRate(
  completed: number,
  expected: number
): number {
  if (expected === 0) return 0;
  const rate = (completed / expected) * 100;
  return Math.min(100, Math.max(0, rate));
}

// ==========================================
// 4. Detect overlap between date ranges
// ==========================================
export interface DateRange {
  startDate: Date | string;
  endDate: Date | string;
}

export function detectEvaluationOverlap(
  newRange: DateRange,
  existingRanges: DateRange[]
): DateRange[] {
  const newStart = typeof newRange.startDate === "string"
    ? parseISO(newRange.startDate)
    : newRange.startDate;
  const newEnd = typeof newRange.endDate === "string"
    ? parseISO(newRange.endDate)
    : newRange.endDate;

  return existingRanges.filter((range) => {
    const existStart = typeof range.startDate === "string"
      ? parseISO(range.startDate)
      : range.startDate;
    const existEnd = typeof range.endDate === "string"
      ? parseISO(range.endDate)
      : range.endDate;

    // Overlap condition: start1 <= end2 AND end1 >= start2
    return newStart <= existEnd && newEnd >= existStart;
  });
}

// ==========================================
// 5. Get overlapping days
// ==========================================
export function getOverlappingWorkingDays(
  newRange: DateRange,
  existingRanges: DateRange[],
  holidays: Date[] = []
): string[] {
  const newDays = getWorkingDays(newRange.startDate, newRange.endDate, holidays);
  const newDayStrings = new Set(newDays.map((d) => format(d, "yyyy-MM-dd")));

  const existingDays = new Set<string>();
  for (const range of existingRanges) {
    const days = getWorkingDays(range.startDate, range.endDate, holidays);
    days.forEach((d) => existingDays.add(format(d, "yyyy-MM-dd")));
  }

  return [...newDayStrings].filter((d) => existingDays.has(d)).sort();
}

export const workingDayCalculations = {
  calculateWorkingDays,
  getWorkingDays,
  calculateCompletionRate,
  detectEvaluationOverlap,
  getOverlappingWorkingDays,
};
