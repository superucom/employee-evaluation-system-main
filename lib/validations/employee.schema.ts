import { z } from "zod";

export const createEmployeeSchema = z.object({
  employeeCode: z
    .string()
    .min(1, "กรุณากรอกรหัสพนักงาน")
    .max(20, "รหัสพนักงานต้องไม่เกิน 20 ตัวอักษร"),
  name: z
    .string()
    .min(1, "กรุณากรอกชื่อพนักงาน")
    .max(100, "ชื่อต้องไม่เกิน 100 ตัวอักษร"),
  nickname: z.string().max(50, "ชื่อเล่นต้องไม่เกิน 50 ตัวอักษร").optional().nullable(),
  departmentId: z.string().min(1, "กรุณาเลือกแผนก"),
  teamId: z.string().optional().nullable(),
  position: z.string().max(100, "ตำแหน่งต้องไม่เกิน 100 ตัวอักษร").optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  status: z.enum(["active", "inactive"]).optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
