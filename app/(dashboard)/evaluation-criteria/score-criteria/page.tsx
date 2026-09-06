"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { EVALUATION_WEIGHT_PRESETS } from "@/lib/calculations/evaluation-weights";

interface ScoreScaleLabel {
  id: string;
  scoreValue: number;
  label: string;
  description: string | null;
}

interface ScoreScale {
  id: string;
  name: string;
  minScore: number;
  maxScore: number;
  isActive: boolean;
  isDefault: boolean;
  labels: ScoreScaleLabel[];
}

const EVALUATOR_ROWS = [
  { key: "SUPER", label: "Super", icon: "👑" },
  { key: "SUPPORT_SUPER", label: "Support Super", icon: "🛡️" },
  { key: "HEAD", label: "Head แผนกเดียวกัน", icon: "🔵" },
  { key: "SUPPORT_HEAD", label: "Support Head แผนกเดียวกัน", icon: "🟢" },
  { key: "SUPER_CR", label: "Super.CR", icon: "🌟" },
  { key: "SELECTED_SUPER", label: "Super ที่เลือกประจำรอบ", icon: "👑" },
  { key: "SELECTED_SUPPORT_SUPER", label: "Support Super ที่เลือกประจำรอบ", icon: "🛡️" },
  { key: "HEAD_CR_A", label: "Head CR ทีม A", icon: "🔵" },
  { key: "HEAD_CR_B", label: "Head CR ทีม B", icon: "🔵" },
  { key: "HEAD_CR_C", label: "Head CR ทีม C", icon: "🔵" },
];

export default function ScoreCriteriaPage() {
  const [scales, setScales] = useState<ScoreScale[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScales = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/score-scales");
      const data = await res.json();
      if (res.ok) setScales(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScales();
  }, []);

  // Theme-aware styles for header columns with crisp contrast
  const getHeaderStyles = (key: string) => {
    switch (key) {
      case "HEAD_TARGET":
        return {
          bg: "bg-blue-500/15 dark:bg-blue-500/25",
          border: "border-blue-300 dark:border-blue-800",
          title: "text-blue-900 dark:text-blue-200",
          desc: "text-blue-700 dark:text-blue-300",
          value: "text-blue-800 dark:text-blue-300 font-black text-sm",
        };
      case "SUPPORT_HEAD_TARGET":
        return {
          bg: "bg-purple-500/15 dark:bg-purple-500/25",
          border: "border-purple-300 dark:border-purple-800",
          title: "text-purple-900 dark:text-purple-200",
          desc: "text-purple-700 dark:text-purple-300",
          value: "text-purple-800 dark:text-purple-300 font-black text-sm",
        };
      case "TRANSFER_QA_TARGET":
        return {
          bg: "bg-emerald-500/15 dark:bg-emerald-500/25",
          border: "border-emerald-300 dark:border-emerald-800",
          title: "text-emerald-900 dark:text-emerald-200",
          desc: "text-emerald-700 dark:text-emerald-300",
          value: "text-emerald-800 dark:text-emerald-300 font-black text-sm",
        };
      case "STAFF_TARGET":
        return {
          bg: "bg-pink-500/15 dark:bg-pink-500/25",
          border: "border-pink-300 dark:border-pink-800",
          title: "text-pink-900 dark:text-pink-200",
          desc: "text-pink-700 dark:text-pink-300",
          value: "text-pink-800 dark:text-pink-300 font-black text-sm",
        };
      case "CR_STAFF":
      default:
        return {
          bg: "bg-amber-500/15 dark:bg-amber-500/25",
          border: "border-amber-300 dark:border-amber-800",
          title: "text-amber-900 dark:text-amber-200",
          desc: "text-amber-700 dark:text-amber-300",
          value: "text-amber-800 dark:text-amber-300 font-black text-sm",
        };
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-3 text-sm font-medium">
        <Link href="/evaluation-criteria/categories" className="text-muted-foreground hover:text-foreground px-2">
          หมวดหมู่การประเมิน
        </Link>
        <Link href="/evaluation-criteria/questions" className="text-muted-foreground hover:text-foreground px-2">
          คำถามการประเมิน
        </Link>
        <Link href="/evaluation-criteria/score-criteria" className="text-primary border-b-2 border-primary pb-3 -mb-3 px-2 font-bold">
          เกณฑ์คะแนน & สัดส่วนประเมิน
        </Link>
        <Link href="/evaluation-criteria/grades" className="text-muted-foreground hover:text-foreground px-2">
          เกณฑ์เกรด (Grades)
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">เกณฑ์คะแนนและสัดส่วนการประเมิน</h1>
        <p className="text-sm text-muted-foreground mt-1">
          กำหนดระดับคะแนนแบบประเมินประจำรอบ และตารางสัดส่วนค่าน้ำหนักตามผู้ประเมิน (คะแนนเต็ม 15)
        </p>
      </div>

      {/* Section 1: สัดส่วนการประเมินในแต่ละรอบ (คะแนนเต็ม 15) */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span>📊</span>
              สัดส่วนการประเมินในแต่ละรอบ (คะแนนเต็ม 15)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              โครงสร้างการแบ่งสัดส่วนคะแนนตามกลุ่มผู้ถูกประเมินและผู้ประเมินจริงของระบบ
            </p>
          </div>
          <span className="text-xs font-extrabold bg-primary/10 text-primary border border-primary/30 px-3 py-1.5 rounded-full shadow-sm">
            คะแนนเต็ม 15 คะแนน
          </span>
        </div>

        {/* Table of Weight Matrix with High Contrast */}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-xs text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="p-3.5 bg-muted/80 text-foreground font-extrabold uppercase w-36 border-r border-border">
                  ผู้ประเมิน
                </th>
                {EVALUATION_WEIGHT_PRESETS.map((preset) => {
                  const style = getHeaderStyles(preset.key);
                  return (
                    <th
                      key={preset.key}
                      className={`p-3.5 text-center font-bold border-r border-border last:border-r-0 ${style.bg}`}
                    >
                      <div className={`text-sm font-black ${style.title}`}>{preset.targetGroup}</div>
                      <div className={`text-[11px] font-semibold mt-0.5 ${style.desc}`}>{preset.description}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {EVALUATOR_ROWS.map((evaluator) => (
                <tr key={evaluator.key} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3.5 font-bold text-foreground bg-muted/30 border-r border-border min-w-52">
                    <div>{evaluator.icon} {evaluator.label}</div>
                  </td>
                  {EVALUATION_WEIGHT_PRESETS.map((preset) => {
                    const rule = preset.roles.find((item) => item.evaluatorKey === evaluator.key);
                    const style = getHeaderStyles(preset.key);
                    return (
                      <td key={`${evaluator.key}-${preset.key}`} className="p-3.5 text-center border-r border-border last:border-r-0">
                        {rule ? (
                          <>
                            <div className={`text-base font-black ${style.value}`}>{rule.scoreWeight}</div>
                            <div className="text-[10px] text-muted-foreground font-semibold">(อัตราส่วน {rule.ratio})</div>
                          </>
                        ) : (
                          <span className="text-muted-foreground font-mono font-bold">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              <tr className="bg-primary/10 border-t-2 border-primary/50 font-black">
                <td className="p-3.5 text-primary font-black uppercase border-r border-border">
                  รวมคะแนนเต็ม
                </td>
                {EVALUATION_WEIGHT_PRESETS.map((preset) => (
                  <td key={`total-${preset.key}`} className="p-3.5 text-center text-primary font-black text-sm border-r border-border last:border-r-0">
                    {preset.totalScore} คะแนน
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground space-y-1">
          <p><strong className="text-foreground">หมายเหตุ:</strong> Super และ Support Super จะไม่ถูกมอบหมายให้ประเมินพนักงานตำแหน่ง Super</p>
          <p>กลุ่ม CR ใช้ผู้ประเมินรวม 6 คน: Super.CR 1 คน, Super ที่เลือกประจำรอบ 1 คน, Support Super ที่เลือกประจำรอบ 1 คน และ Head CR จากทีม A, B, C ทีมละ 1 คน</p>
        </div>
      </div>

      {/* Section 2: Score Scale (1-5) */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-foreground">เกณฑ์คะแนนแบบประเมินประจำรอบ (Score Scale 1-5)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            ความหมายและคำอธิบายของคะแนน 1 ถึง 5 สำหรับคำถามแต่ละข้อ
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">กำลังโหลดข้อมูลเกณฑ์คะแนน...</div>
        ) : (
          <div className="space-y-6">
            {scales.map((scale) => (
              <div key={scale.id} className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-foreground">{scale.name}</h3>
                      {scale.isDefault && (
                        <span className="text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                          ค่าเริ่มต้นของระบบ (Default)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ช่วงคะแนน: {scale.minScore} ถึง {scale.maxScore} คะแนน
                    </p>
                  </div>
                </div>

                {/* Labels Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  {scale.labels?.map((label) => (
                    <div
                      key={label.id}
                      className="p-4 rounded-xl border border-border bg-background hover:bg-muted/30 text-center space-y-2 hover:border-primary/40 transition-colors shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-black text-lg flex items-center justify-center mx-auto shadow-md">
                        {label.scoreValue}
                      </div>
                      <div className="font-extrabold text-sm text-foreground">{label.label}</div>
                      {label.description && (
                        <p className="text-xs text-muted-foreground font-medium">{label.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
