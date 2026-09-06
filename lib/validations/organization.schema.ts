import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อแผนก").max(100, "ชื่อแผนกต้องไม่เกิน 100 ตัวอักษร"),
  code: z
    .string()
    .min(1, "กรุณากรอกรหัสแผนก")
    .max(20, "รหัสแผนกต้องไม่เกิน 20 ตัวอักษร")
    .regex(/^[A-Z0-9_]+$/, "รหัสแผนกใช้ได้เฉพาะตัวพิมพ์ใหญ่ ตัวเลข และ _"),
  description: z.string().max(500, "คำอธิบายต้องไม่เกิน 500 ตัวอักษร").optional().nullable(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createTeamSchema = z.object({
  departmentId: z.string().min(1, "กรุณาเลือกแผนก"),
  name: z.string().min(1, "กรุณากรอกชื่อทีม").max(100, "ชื่อทีมต้องไม่เกิน 100 ตัวอักษร"),
  code: z
    .string()
    .min(1, "กรุณากรอกรหัสทีม")
    .max(20, "รหัสทีมต้องไม่เกิน 20 ตัวอักษร")
    .regex(/^[A-Z0-9_]+$/, "รหัสทีมใช้ได้เฉพาะตัวพิมพ์ใหญ่ ตัวเลข และ _"),
  description: z.string().max(500, "คำอธิบายต้องไม่เกิน 500 ตัวอักษร").optional().nullable(),
});

export const updateTeamSchema = createTeamSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
