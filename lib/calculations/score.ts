/**
 * Score Calculation Engine
 * Pure functions — no side effects, fully unit-testable
 */

export interface ScoreInput {
  scoreValue: number;
  minScore: number;
  maxScore: number;
}

export interface EvaluatorScoreInput {
  evaluatorId: string;
  scores: ScoreInput[];
  weightPercentage: number; // 0–100
}

export interface CalculationResult {
  rawScore: number;
  rawPercentage: number;
  weightedScore: number;
}

export const SCORE_TOTAL = 100;
export const WORK_SCORE_MAX = 65;
export const BEHAVIOR_SCORE_MAX = 20;
export const SUPERVISOR_SCORE_MAX = 15;

/** The current release captures only the three supervisor questions (5 points each). */
export function calculateSupervisorScore(scores: Pick<ScoreInput, "scoreValue">[]): number {
  return scores.reduce((sum, score) => sum + score.scoreValue, 0);
}

export function isCompleteTotalScore(scores: {
  workScore?: number | null;
  behaviorScore?: number | null;
  supervisorScore?: number | null;
}): boolean {
  return scores.workScore != null && scores.behaviorScore != null && scores.supervisorScore != null;
}

export interface FinalScoreResult {
  finalPercentage: number;
  evaluatorBreakdown: Array<{
    evaluatorId: string;
    rawScore: number;
    rawPercentage: number;
    weightedScore: number;
    weightPercentage: number;
  }>;
}

// ==========================================
// 1. Calculate average score for a single evaluator's questions
// ==========================================
export function calculateEvaluationScore(scores: ScoreInput[]): number {
  if (scores.length === 0) return 0;
  const total = scores.reduce((sum, s) => sum + s.scoreValue, 0);
  return total / scores.length;
}

// ==========================================
// 2. Convert raw score to percentage (0–100)
// ==========================================
export function scoreToPercentage(
  rawScore: number,
  minScore: number,
  maxScore: number
): number {
  if (maxScore <= minScore) return 0;
  const percentage = ((rawScore - minScore) / (maxScore - minScore)) * 100;
  return Math.min(100, Math.max(0, percentage));
}

// ==========================================
// 3. Calculate weighted score for one evaluator
// ==========================================
export function calculateWeightedScore(
  rawPercentage: number,
  weightPercentage: number
): number {
  return (rawPercentage * weightPercentage) / 100;
}

// ==========================================
// 4. Calculate final score across all evaluators
// ==========================================
export function calculateFinalScore(evaluators: EvaluatorScoreInput[]): FinalScoreResult {
  const totalWeight = evaluators.reduce((sum, e) => sum + e.weightPercentage, 0);
  if (totalWeight === 0) {
    return {
      finalPercentage: 0,
      evaluatorBreakdown: [],
    };
  }

  const breakdown = evaluators.map((evaluator) => {
    const rawScore = calculateEvaluationScore(evaluator.scores);
    const minScore = evaluator.scores[0]?.minScore ?? 1;
    const maxScore = evaluator.scores[0]?.maxScore ?? 5;
    const rawPercentage = scoreToPercentage(rawScore, minScore, maxScore);
    const weightedScore = calculateWeightedScore(rawPercentage, evaluator.weightPercentage);

    return {
      evaluatorId: evaluator.evaluatorId,
      rawScore,
      rawPercentage,
      weightedScore,
      weightPercentage: evaluator.weightPercentage,
    };
  });

  // Sum of weighted scores (each already adjusted for weight)
  const finalPercentage = breakdown.reduce((sum, e) => sum + e.weightedScore, 0);

  return {
    finalPercentage: Math.min(100, Math.max(0, finalPercentage)),
    evaluatorBreakdown: breakdown,
  };
}

// ==========================================
// 5. Determine grade based on percentage
// ==========================================
export interface GradeConfig {
  label: string;
  minPercentage: number;
  maxPercentage: number;
}

export function calculateGrade(
  percentage: number,
  grades: GradeConfig[]
): string {
  if (grades.length === 0) return "N/A";

  // Sort by minPercentage descending to find highest matching grade first
  const sorted = [...grades].sort((a, b) => b.minPercentage - a.minPercentage);

  for (const grade of sorted) {
    if (percentage >= grade.minPercentage && percentage <= grade.maxPercentage) {
      return grade.label;
    }
  }

  // Fallback: return lowest grade
  const lowest = [...grades].sort((a, b) => a.minPercentage - b.minPercentage)[0];
  return lowest?.label ?? "N/A";
}

// ==========================================
// 6. Validate that weights sum to 100%
// ==========================================
export function validateTotalWeight(weights: number[]): boolean {
  if (weights.length === 0) return false;
  const total = weights.reduce((sum, w) => sum + w, 0);
  return Math.abs(total - 100) < 0.01; // Allow for floating-point rounding
}

export function getTotalWeight(weights: number[]): number {
  return weights.reduce((sum, w) => sum + w, 0);
}

// ==========================================
// 7. Get interpretation label for a raw score using ScoreScaleLabel from DB
// Falls back to threshold-based labels if no DB labels available
// ==========================================
export interface ScoreLabelEntry {
  scoreValue: number;
  label: string;
}

export function getScoreLabel(
  score: number,
  labels: ScoreLabelEntry[]
): string {
  if (!labels || labels.length === 0) {
    // Fallback: threshold-based (used only when DB labels are unavailable)
    if (score >= 4.5) return "ดีเยี่ยม";
    if (score >= 3.5) return "ดี";
    if (score >= 2.5) return "ผ่านเกณฑ์";
    if (score > 0) return "ต้องปรับปรุง";
    return "บกพร่อง";
  }

  // Exact match first
  const exact = labels.find((l) => l.scoreValue === Math.round(score));
  if (exact) return exact.label;

  // Nearest match
  const sorted = [...labels].sort((a, b) =>
    Math.abs(a.scoreValue - score) - Math.abs(b.scoreValue - score)
  );
  return sorted[0]?.label ?? "N/A";
}

// ==========================================
// Export for use in API and tests
// ==========================================
export const scoreCalculations = {
  calculateSupervisorScore,
  isCompleteTotalScore,
  calculateEvaluationScore,
  scoreToPercentage,
  calculateWeightedScore,
  calculateFinalScore,
  calculateGrade,
  validateTotalWeight,
  getTotalWeight,
  getScoreLabel,
};
