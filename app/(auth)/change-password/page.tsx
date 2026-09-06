"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations/auth.schema";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordInput) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "เกิดข้อผิดพลาด");
        return;
      }

      setSuccess(true);

      // Re-sign in with the new password to update the session token
      if (json.username) {
        await signIn("credentials", {
          username: json.username,
          password: data.newPassword,
          redirect: false,
        });
      }

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 800);
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            className="login-logo-box"
            style={{ background: "linear-gradient(135deg, var(--accent) 0%, var(--primary) 100%)", boxShadow: "0 10px 25px -5px rgba(93, 120, 108, 0.35)" }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--primary-foreground)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="login-title">เปลี่ยน Password</h1>
          <p style={{ color: "var(--warning)", fontSize: "0.875rem", fontWeight: 600 }}>
            ⚠️ กรุณาเปลี่ยน Password ก่อนเข้าใช้งานระบบ
          </p>
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(71, 122, 97, 0.14)",
                border: "1px solid rgba(71, 122, 97, 0.38)",
                color: "var(--success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
                fontSize: "1.5rem",
              }}
            >
              ✓
            </div>
            <p style={{ color: "var(--success)", fontWeight: 700, fontSize: "1.1rem" }}>
              เปลี่ยน Password สำเร็จ!
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
              กำลังพาไปยังหน้า Dashboard...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label className="form-label">Password ปัจจุบัน *</label>
              <input
                type="password"
                {...register("currentPassword")}
                className="form-input"
                placeholder="กรอก Password ปัจจุบัน"
                disabled={loading}
              />
              {errors.currentPassword && (
                <p style={{ color: "var(--destructive)", fontSize: "0.75rem", marginTop: "0.35rem" }}>
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Password ใหม่ *</label>
              <input
                type="password"
                {...register("newPassword")}
                className="form-input"
                placeholder="อย่างน้อย 8 ตัว (ตัวพิมพ์ใหญ่+เล็ก+ตัวเลข)"
                disabled={loading}
              />
              {errors.newPassword && (
                <p style={{ color: "var(--destructive)", fontSize: "0.75rem", marginTop: "0.35rem" }}>
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: "1.5rem" }}>
              <label className="form-label">ยืนยัน Password ใหม่ *</label>
              <input
                type="password"
                {...register("confirmPassword")}
                className="form-input"
                placeholder="กรอก Password ใหม่อีกครั้ง"
                disabled={loading}
              />
              {errors.confirmPassword && (
                <p style={{ color: "var(--destructive)", fontSize: "0.75rem", marginTop: "0.35rem" }}>
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {error && (
              <div className="error-box">
                ⚠️ {error}
              </div>
            )}

            <button
              id="change-password-btn"
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? "กำลังบันทึก..." : "บันทึกและเข้าสู่ระบบ"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
