import { z } from "zod";
import { AssignmentType, PeriodType } from "@prisma/client";

export const createEvaluationPeriodSchema = z
  .object({
    name: z.string().min(1, "กรุณากรอกชื่อรอบการประเมิน").max(100),
    type: z.nativeEnum(PeriodType).default(PeriodType.MONTHLY),
    startDate: z.string().min(1, "กรุณาเลือกวันเริ่มต้น"),
    endDate: z.string().min(1, "กรุณาเลือกวันสิ้นสุด"),
    expectedWorkingDays: z.number().int().min(1, "จำนวนวันทำงานต้องมากกว่า 0"),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่มต้น",
    path: ["endDate"],
  });

export const createEvaluationCategorySchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อหมวดหมู่").max(100),
  description: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const createEvaluationQuestionSchema = z.object({
  categoryId: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  text: z.string().min(1, "กรุณากรอกคำถาม").max(500),
  description: z.string().max(1000).optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const createEvaluatorAssignmentSchema = z.object({
  evaluatorUserId: z.string().min(1, "กรุณาเลือกผู้ประเมิน"),
  assignmentType: z.nativeEnum(AssignmentType),
  targetEmployeeId: z.string().optional().nullable(),
  targetDepartmentId: z.string().optional().nullable(),
  targetTeamId: z.string().optional().nullable(),
  targetMainTeam: z.string().optional().nullable(),
  excludedDepartmentIds: z.array(z.string()).optional().nullable(),
  periodId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  weightPercentage: z
    .number()
    .min(0, "น้ำหนักต้องไม่ต่ำกว่า 0")
    .max(100, "น้ำหนักต้องไม่เกิน 100"),
});

export const createEvaluationSchema = z
  .object({
    periodId: z.string().min(1, "กรุณาเลือกรอบการประเมิน"),
    employeeId: z.string().min(1, "กรุณาเลือกพนักงาน"),
    evalStartDate: z.string().min(1, "กรุณาเลือกวันเริ่มต้น"),
    evalEndDate: z.string().min(1, "กรุณาเลือกวันสิ้นสุด"),
    comment: z.string().max(2000).optional().nullable(),
    scores: z.array(
      z.object({
        questionId: z.string(),
        scoreValue: z.number().int().min(1),
        comment: z.string().max(500).optional().nullable(),
      })
    ),
  })
  .refine((data) => new Date(data.evalEndDate) >= new Date(data.evalStartDate), {
    message: "วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่มต้น",
    path: ["evalEndDate"],
  });

export const createGradeConfigSchema = z
  .object({
    name: z.string().min(1, "กรุณากรอกชื่อเกรด").max(50),
    label: z.string().min(1, "กรุณากรอก Label เกรด").max(10),
    minPercentage: z.number().min(0, "เปอร์เซ็นต์ต่ำสุดต้องไม่ต่ำกว่า 0").max(100),
    maxPercentage: z.number().min(0).max(100, "เปอร์เซ็นต์สูงสุดต้องไม่เกิน 100"),
    sortOrder: z.number().int().default(0),
  })
  .refine((data) => data.maxPercentage >= data.minPercentage, {
    message: "เปอร์เซ็นต์สูงสุดต้องไม่ต่ำกว่าเปอร์เซ็นต์ต่ำสุด",
    path: ["maxPercentage"],
  });

export const createScoreScaleSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อมาตรวัด").max(100),
  minScore: z.number().int().min(0, "คะแนนต่ำสุดต้องไม่ต่ำกว่า 0"),
  maxScore: z.number().int().min(1, "คะแนนสูงสุดต้องมากกว่า 0"),
  isDefault: z.boolean().default(false),
  labels: z
    .array(
      z.object({
        scoreValue: z.number().int(),
        label: z.string().min(1),
        description: z.string().optional().nullable(),
      })
    )
    .optional()
    .default([]),
});

export type CreateEvaluationPeriodInput = z.infer<typeof createEvaluationPeriodSchema>;
export type CreateEvaluationCategoryInput = z.infer<typeof createEvaluationCategorySchema>;
export type CreateEvaluationQuestionInput = z.infer<typeof createEvaluationQuestionSchema>;
export type CreateEvaluatorAssignmentInput = z.infer<typeof createEvaluatorAssignmentSchema>;
export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>;
export type CreateGradeConfigInput = z.infer<typeof createGradeConfigSchema>;
export type CreateScoreScaleInput = z.infer<typeof createScoreScaleSchema>;
