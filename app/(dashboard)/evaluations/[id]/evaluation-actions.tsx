"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ScoreItem {
  questionId: string;
  questionText: string;
  scoreValue: number;
  comment: string;
}

interface EvaluationActionsProps {
  recordId: string;
  isManager: boolean;
  isOwner: boolean;
  isLocked: boolean;
  status: "DRAFT" | "SUBMITTED" | "LOCKED";
  initialComment: string;
  scores: ScoreItem[];
}

export default function EvaluationActions({
  recordId,
  isManager,
  isOwner,
  isLocked,
  status,
  initialComment,
  scores: initialScores,
}: EvaluationActionsProps) {
  const router = useRouter();
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [comment, setComment] = useState(initialComment);
  const [scores, setScores] = useState<ScoreItem[]>(initialScores);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (isLocked) {
    return (
      <div className="p-4 bg-muted/40 rounded-xl border text-center text-xs text-muted-foreground">
        🔒 รอบการประเมินนี้ถูกล็อกแล้ว ไม่สามารถแก้ไขหรือ Override ข้อมูลได้ (Read-Only)
      </div>
    );
  }

  const handleScoreChange = (questionId: string, val: number) => {
    setScores((prev) =>
      prev.map((s) => (s.questionId === questionId ? { ...s, scoreValue: val } : s))
    );
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      setError("กรุณากรอกเหตุผลในการ Override");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/evaluations/${recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment,
          overrideReason,
          scores: scores.map((s) => ({
            questionId: s.questionId,
            scoreValue: s.scoreValue,
            comment: s.comment || null,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "เกิดข้อผิดพลาดในการ Override");
        return;
      }

      setShowOverrideModal(false);
      router.refresh();
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitDraft = async () => {
    if (!confirm("คุณต้องการส่งผลการประเมินนี้ใช่หรือไม่?")) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/evaluations/${recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SUBMITTED" }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "เกิดข้อผิดพลาดในการส่งผล");
      }
    } catch {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("คุณต้องการลบการประเมินนี้หรือไม่?")) return;

    try {
      const res = await fetch(`/api/evaluations/${recordId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/evaluations");
      } else {
        const data = await res.json();
        alert(data.error || "เกิดข้อผิดพลาดในการลบ");
      }
    } catch {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  return (
    <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border">
      <div className="flex items-center gap-2">
        {(isManager || (isOwner && status === "DRAFT")) && (
          <button
            onClick={handleDelete}
            className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium"
          >
            ลบการประเมิน
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* If Draft and Owner: Submit button */}
        {isOwner && status === "DRAFT" && (
          <button
            onClick={handleSubmitDraft}
            disabled={submitting}
            className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "กำลังส่งผล..." : "🚀 ส่งผลการประเมิน (Submit)"}
          </button>
        )}

        {/* Manager Override button */}
        {isManager && (
          <button
            onClick={() => {
              setError("");
              setShowOverrideModal(true);
            }}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-colors"
          >
            ✏️ แก้ไขคะแนน (Manager Override)
          </button>
        )}
      </div>

      {/* Manager Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground">แก้ไขคะแนนโดยผู้จัดการ (Manager Override)</h2>
              <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded mt-1 border border-amber-200">
                ⚠️ การแก้ไขข้อมูลนี้จะถูกบันทึกใน Audit Log พร้อมชื่อผู้แก้ไขและเหตุผล
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveOverride} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-1">
                  เหตุผลในการ Override (บังคับกรอก) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ปรับคะแนนตามข้อตกลงทีม, แก้ไขคะแนนที่กรอกผิดพลาด"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-bold text-foreground">ปรับคะแนนในแต่ละข้อ</label>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {scores.map((s) => (
                    <div
                      key={s.questionId}
                      className="p-3 bg-muted/40 rounded-xl border border-border flex items-center justify-between gap-4"
                    >
                      <span className="text-xs font-medium max-w-xs">{s.questionText}</span>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleScoreChange(s.questionId, val)}
                            className={`w-8 h-8 rounded-lg font-bold text-xs border ${
                              s.scoreValue === val
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border text-foreground hover:border-primary"
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">ความคิดเห็นเพิ่มเติม</label>
                <textarea
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-medium hover:bg-muted"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-sm disabled:opacity-50"
                >
                  {submitting ? "กำลังบันทึก..." : "บันทึกการ Override"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
