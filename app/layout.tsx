import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-prompt",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ระบบประเมินผลการปฏิบัติงาน | Performance Evaluation",
  description: "ระบบประเมินผลการปฏิบัติงานพนักงานประจำรอบ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={prompt.variable}>
      <body className="antialiased bg-background text-foreground">{children}</body>
    </html>
  );
}
