import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, "กรุณากรอก Username")
    .max(50, "Username ต้องไม่เกิน 50 ตัวอักษร")
    .regex(/^[a-zA-Z0-9_]+$/, "Username ใช้ได้เฉพาะตัวอักษร ตัวเลข และ _"),
  password: z.string().min(1, "กรุณากรอก Password"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "กรุณากรอก Password ปัจจุบัน"),
    newPassword: z
      .string()
      .min(8, "Password ใหม่ต้องมีอย่างน้อย 8 ตัวอักษร")
      .max(100, "Password ต้องไม่เกิน 100 ตัวอักษร")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password ต้องมีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ และตัวเลข"
      ),
    confirmPassword: z.string().min(1, "กรุณายืนยัน Password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Password ไม่ตรงกัน",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
