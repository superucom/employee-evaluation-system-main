import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ | ระบบประเมินผลการปฏิบัติงาน",
  description: "Performance Evaluation System",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {children}
    </div>
  );
}
