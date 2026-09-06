import { z } from "zod";
import { Role } from "@prisma/client";

export const createUserSchema = z.object({
  username: z
    .string()
    .min(1, "กรุณากรอก Username")
    .max(50, "Username ต้องไม่เกิน 50 ตัวอักษร")
    .regex(/^[a-zA-Z0-9_]+$/, "Username ใช้ได้เฉพาะตัวอักษร ตัวเลข และ _"),
  password: z
    .string()
    .min(8, "Password ต้องมีอย่างน้อย 8 ตัวอักษร")
    .max(100, "Password ต้องไม่เกิน 100 ตัวอักษร"),
  fullName: z
    .string()
    .min(1, "กรุณากรอกชื่อ-นามสกุล")
    .max(100, "ชื่อต้องไม่เกิน 100 ตัวอักษร"),
  role: z.nativeEnum(Role),
  departmentId: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
});

export const updateUserSchema = z.object({
  fullName: z
    .string()
    .min(1, "กรุณากรอกชื่อ-นามสกุล")
    .max(100, "ชื่อต้องไม่เกิน 100 ตัวอักษร")
    .optional(),
  role: z.nativeEnum(Role).optional(),
  departmentId: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
