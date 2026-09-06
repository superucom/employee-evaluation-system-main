"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth.schema";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        username: data.username,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Username หรือ Password ไม่ถูกต้อง");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo / Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div className="login-logo-box">
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
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h1 className="login-title">ระบบประเมินผลการปฏิบัติงาน</h1>
          <p className="login-subtitle">Employee Performance Evaluation System</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Username */}
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              autoFocus
              {...register("username")}
              className="form-input"
              placeholder="กรอก Username เช่น manager, super01"
              disabled={loading}
            />
            {errors.username && (
              <p style={{ color: "var(--destructive)", fontSize: "0.75rem", marginTop: "0.35rem" }}>
                {errors.username.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
              className="form-input"
              placeholder="กรอก Password"
              disabled={loading}
            />
            {errors.password && (
              <p style={{ color: "var(--destructive)", fontSize: "0.75rem", marginTop: "0.35rem" }}>
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="error-box">
              ⚠️ {error}
            </div>
          )}

          {/* Submit button */}
          <button
            id="login-btn"
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "1.5rem" }}>
          หากลืม Password กรุณาติดต่อผู้ดูแลระบบ
        </p>
      </div>
    </div>
  );
}
