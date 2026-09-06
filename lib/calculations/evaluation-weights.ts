/**
 * Evaluation Weight Presets & Rules (Based on 15 Points Maximum)
 * สัดส่วนการประเมินในแต่ละรอบ (คะแนนเต็ม 15)
 */

export interface WeightRuleItem {
  evaluatorKey: string;
  evaluatorRole: string;
  scoreWeight: number;
  ratio: number;
  percentage: number; // (scoreWeight / 15) * 100
}

export interface EvaluationWeightPreset {
  key: string;
  targetGroup: string;
  description: string;
  totalScore: number; // 15
  roles: WeightRuleItem[];
}

export const EVALUATION_WEIGHT_PRESETS: EvaluationWeightPreset[] = [
  {
    key: "HEAD_TARGET",
    targetGroup: "Head",
    description: "หัวหน้าแผนกทุกแผนก (ยกเว้น CR)",
    totalScore: 15,
    roles: [
      { evaluatorKey: "SUPER", evaluatorRole: "Super", scoreWeight: 10, ratio: 2, percentage: 66.67 },
      { evaluatorKey: "SUPPORT_SUPER", evaluatorRole: "Support Super", scoreWeight: 5, ratio: 1, percentage: 33.33 },
    ],
  },
  {
    key: "SUPPORT_HEAD_TARGET",
    targetGroup: "Support Head",
    description: "ผู้ช่วยหัวหน้าแผนกทุกแผนก",
    totalScore: 15,
    roles: [
      { evaluatorKey: "SUPER", evaluatorRole: "Super", scoreWeight: 5, ratio: 1, percentage: 33.33 },
      { evaluatorKey: "SUPPORT_SUPER", evaluatorRole: "Support Super", scoreWeight: 2.5, ratio: 0.5, percentage: 16.67 },
      { evaluatorKey: "HEAD", evaluatorRole: "Head แผนกเดียวกัน", scoreWeight: 7.5, ratio: 1.5, percentage: 50.0 },
    ],
  },
  {
    key: "TRANSFER_QA_TARGET",
    targetGroup: "Transfer / QA",
    description: "ตำแหน่ง Transfer และ QA",
    totalScore: 15,
    roles: [
      { evaluatorKey: "SUPER", evaluatorRole: "Super", scoreWeight: 5, ratio: 1, percentage: 33.33 },
      { evaluatorKey: "SUPPORT_SUPER", evaluatorRole: "Support Super", scoreWeight: 2.5, ratio: 0.5, percentage: 16.67 },
      { evaluatorKey: "HEAD", evaluatorRole: "Head แผนกเดียวกัน", scoreWeight: 7.5, ratio: 1.5, percentage: 50.0 },
    ],
  },
  {
    key: "STAFF_TARGET",
    targetGroup: "Staff",
    description: "พนักงานทั่วไป เช่น Call, MC, PT, MKT, SalePromotion (SP), WD, CS",
    totalScore: 15,
    roles: [
      { evaluatorKey: "SUPER", evaluatorRole: "Super", scoreWeight: 5, ratio: 1, percentage: 33.33 },
      { evaluatorKey: "SUPPORT_SUPER", evaluatorRole: "Support Super", scoreWeight: 2.5, ratio: 0.5, percentage: 16.67 },
      { evaluatorKey: "HEAD", evaluatorRole: "Head แผนกเดียวกัน", scoreWeight: 6.25, ratio: 1.25, percentage: 41.67 },
      { evaluatorKey: "SUPPORT_HEAD", evaluatorRole: "Support Head แผนกเดียวกัน", scoreWeight: 1.25, ratio: 0.25, percentage: 8.33 },
    ],
  },
  {
    key: "CR_STAFF",
    targetGroup: "CR",
    description: "พนักงาน CR ทุกทีม (ผู้ประเมินรวม 6 คน)",
    totalScore: 15,
    roles: [
      { evaluatorKey: "SUPER_CR", evaluatorRole: "Super.CR", scoreWeight: 2.5, ratio: 0.5, percentage: 16.67 },
      { evaluatorKey: "SELECTED_SUPER", evaluatorRole: "Super ที่เลือกประจำรอบ", scoreWeight: 2.5, ratio: 0.5, percentage: 16.67 },
      { evaluatorKey: "SELECTED_SUPPORT_SUPER", evaluatorRole: "Support Super ที่เลือกประจำรอบ", scoreWeight: 2.5, ratio: 0.5, percentage: 16.67 },
      { evaluatorKey: "HEAD_CR_A", evaluatorRole: "Head CR ทีม A", scoreWeight: 2.5, ratio: 0.5, percentage: 16.67 },
      { evaluatorKey: "HEAD_CR_B", evaluatorRole: "Head CR ทีม B", scoreWeight: 2.5, ratio: 0.5, percentage: 16.67 },
      { evaluatorKey: "HEAD_CR_C", evaluatorRole: "Head CR ทีม C", scoreWeight: 2.5, ratio: 0.5, percentage: 16.67 },
    ],
  },
];

/**
 * Determine the preset matching an employee's position or department
 */
export function getPresetForPosition(positionOrTitle: string | null | undefined): EvaluationWeightPreset {
  if (!positionOrTitle) return EVALUATION_WEIGHT_PRESETS[3]; // Default: General Staff

  const p = positionOrTitle.toUpperCase().trim();

  if (p.includes("HEAD") || p === "H") {
    if (p.includes("SUB") || p.includes("S.H") || p.includes("S.TF") || p.includes("SUP") || p.includes("SHEAD")) {
      return EVALUATION_WEIGHT_PRESETS[1]; // Support Head
    }
    return EVALUATION_WEIGHT_PRESETS[0]; // Head
  }

  if (p.includes("TRANSFER") || p.includes("TRANFER") || p === "TF" || p === "QA") {
    return EVALUATION_WEIGHT_PRESETS[2]; // Transfer / QA
  }

  if (p.includes("CR")) {
    return EVALUATION_WEIGHT_PRESETS[4]; // CR
  }

  return EVALUATION_WEIGHT_PRESETS[3]; // Staff (including SalePromotion/SP)
}
