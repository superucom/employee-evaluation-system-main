"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";

interface EvaluationPeriod {
  id: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  expectedWorkingDays: number;
  status: "DRAFT" | "ACTIVE" | "LOCKED" | "CLOSED";
  createdAt: string;
  _count?: { evaluationRecords: number };
}

export default function EvaluationPeriodsPage() {
  const [periods, setPeriods] = useState<EvaluationPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "MONTHLY",
    startDate: "",
    endDate: "",
    expectedWorkingDays: 1,
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<EvaluationPeriod | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    type: "MONTHLY",
    startDate: "",
    endDate: "",
    expectedWorkingDays: 1,
    status: "ACTIVE" as "DRAFT" | "ACTIVE" | "LOCKED" | "CLOSED",
  });
  const [editFormError, setEditFormError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/evaluation-periods");
      const data = await res.json();
      if (res.ok) setPeriods(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/evaluation-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "เกิดข้อผิดพลาดในการสร้างรอบการประเมิน");
        return;
      }

      setShowCreateModal(false);
      setFormData({
        name: "",
        type: "MONTHLY",
        startDate: "",
        endDate: "",
        expectedWorkingDays: 1,
      });
      fetchPeriods();
    } catch {
      setFormError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriod) return;
    setEditSubmitting(true);
    setEditFormError("");

    try {
      const res = await fetch(`/api/evaluation-periods/${selectedPeriod.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });
      const data = await res.json();

      if (!res.ok) {
        setEditFormError(data.error || "เกิดข้อผิดพลาดในการแก้ไข");
        return;
      }

      setShowEditModal(false);
      setSelectedPeriod(null);
      fetchPeriods();
    } catch {
      setEditFormError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (period: EvaluationPeriod) => {
    if (
      !confirm(
        `คุณต้องการลบรอบการประเมิน "${period.name}" หรือไม่?\n\n⚠️ การกระทำนี้จะลบข้อมูลที่เกี่ยวข้องกับรอบนี้และไม่สามารถกู้คืนได้`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/evaluation-periods/${period.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (res.ok) {
        fetchPeriods();
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการลบรอบการประเมิน");
      }
    } catch {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  const handleToggleStatus = async (period: EvaluationPeriod, newStatus: string) => {
    const actionText =
      newStatus === "LOCKED"
        ? "ล็อก (ห้ามแก้ไขผลการประเมิน)"
        : newStatus === "ACTIVE"
        ? "เปิดใช้งาน"
        : "เปลี่ยนสถานะ";
    if (!confirm(`คุณต้องการ${actionText} รอบการประเมิน "${period.name}" หรือไม่?`)) return;

    try {
      const res = await fetch(`/api/evaluation-periods/${period.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchPeriods();
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (p: EvaluationPeriod) => {
    setSelectedPeriod(p);
    setEditFormData({
      name: p.name,
      type: p.type,
      startDate: p.startDate ? new Date(p.startDate).toISOString().split("T")[0] : "",
      endDate: p.endDate ? new Date(p.endDate).toISOString().split("T")[0] : "",
      expectedWorkingDays: 1,
      status: p.status,
    });
    setEditFormError("");
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">รอบการประเมิน (Evaluation Periods)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            สร้าง จัดการ และลบรอบการประเมินผลการปฏิบัติงาน กำหนดวันทำงานที่คาดหวัง และล็อกรอบการประเมินเมื่อสรุปผล
          </p>
        </div>
        <button
          onClick={() => {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

            setFormData({
              name: `รอบประจำเดือน ${today.toLocaleDateString("th-TH", { month: "long", year: "numeric" })}`,
              type: "MONTHLY",
              startDate: firstDay,
              endDate: lastDay,
      expectedWorkingDays: 1,
            });
            setFormError("");
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm text-sm"
        >
          <span>+</span> สร้างรอบการประเมินใหม่
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">กำลังโหลดข้อมูลรอบการประเมิน...</div>
      ) : periods.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-border p-8">
          ยังไม่มีรอบการประเมินในระบบ คุณสามารถกดปุ่ม "+ สร้างรอบการประเมินใหม่" เพื่อเริ่มต้น
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {periods.map((p) => (
            <div
              key={p.id}
              className={`bg-card rounded-2xl border p-6 shadow-sm flex flex-col justify-between transition-all ${
                p.status === "ACTIVE"
                  ? "border-primary/50 shadow-md ring-1 ring-primary/20"
                  : p.status === "LOCKED"
                  ? "border-red-300/40 bg-red-500/5"
                  : "border-border"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-border pb-3 mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{p.name}</h2>
                    <span className="text-xs text-muted-foreground capitalize">ประเภท: {p.type}</span>
                  </div>
                  <div>
                    <span
                      className={
                        p.status === "ACTIVE"
                          ? "badge-active font-bold"
                          : p.status === "LOCKED"
                          ? "badge-locked font-bold"
                          : "badge-draft font-bold"
                      }
                    >
                      {p.status === "ACTIVE"
                        ? "กำลังใช้งาน"
                        : p.status === "LOCKED"
                        ? "ล็อกแล้ว"
                        : "ฉบับร่าง"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>ช่วงเวลา:</span>
                    <span className="font-semibold text-foreground">
                      {formatDate(p.startDate)} - {formatDate(p.endDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>วันทำงานที่คาดหวัง:</span>
                    <span className="font-bold text-foreground">1 ครั้ง</span>
                  </div>
                  <div className="flex justify-between">
                    <span>จำนวนการประเมินที่ส่งแล้ว:</span>
                    <span className="font-semibold text-primary">{p._count?.evaluationRecords || 0} รายการ</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-border flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  {p.status === "DRAFT" && (
                    <button
                      onClick={() => handleToggleStatus(p, "ACTIVE")}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                    >
                      เปิดใช้งาน
                    </button>
                  )}
                  {p.status === "ACTIVE" && (
                    <button
                      onClick={() => handleToggleStatus(p, "LOCKED")}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                    >
                      🔒 ล็อก (Lock)
                    </button>
                  )}
                  {p.status === "LOCKED" && (
                    <button
                      onClick={() => handleToggleStatus(p, "ACTIVE")}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                    >
                      🔓 ปลดล็อก
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(p)}
                    className="px-2.5 py-1.5 border border-border hover:bg-muted text-foreground rounded-lg text-xs font-semibold transition-colors"
                  >
                    แก้ไข
                  </button>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(p)}
                  className="px-2.5 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                  title="ลบรอบการประเมินนี้"
                >
                  🗑️ ลบ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Period Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 space-y-4 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground">สร้างรอบการประเมินใหม่</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 text-red-600 text-sm border border-red-500/20 font-semibold">
                {formError}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1 text-foreground">ชื่อรอบการประเมิน *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สิงหาคม 2026, Q3/2026"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 text-foreground">ประเภท</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm"
                >
                  <option value="MONTHLY">รายเดือน (Monthly)</option>
                  <option value="QUARTERLY">รายไตรมาส (Quarterly)</option>
                  <option value="ANNUAL">รายปี (Annual)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-1 text-foreground">วันเริ่มต้น *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-foreground">วันสิ้นสุด *</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 text-foreground">
                  จำนวนครั้งที่ประเมินต่อรอบ
                </label>
                <input
                  type="number"
                  disabled
                  min={1}
                  max={1}
                  value={formData.expectedWorkingDays}
                  onChange={(e) => setFormData({ ...formData, expectedWorkingDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm font-bold text-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ระบบกำหนดเป็น 1 ครั้งต่อพนักงานในแต่ละรอบประเมิน
                </p>
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-muted"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? "กำลังสร้าง..." : "สร้างรอบประเมิน"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Period Modal */}
      {showEditModal && selectedPeriod && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 space-y-4 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground">แก้ไขรอบการประเมิน</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            {editFormError && (
              <div className="p-3 rounded-xl bg-red-500/10 text-red-600 text-sm border border-red-500/20 font-semibold">
                {editFormError}
              </div>
            )}
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1 text-foreground">ชื่อรอบการประเมิน *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 text-foreground">สถานะ</label>
                <select
                  value={editFormData.status}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      status: e.target.value as "DRAFT" | "ACTIVE" | "LOCKED" | "CLOSED",
                    })
                  }
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm font-semibold"
                >
                  <option value="DRAFT">ฉบับร่าง (Draft)</option>
                  <option value="ACTIVE">เปิดใช้งาน (Active)</option>
                  <option value="LOCKED">ล็อกแล้ว (Locked)</option>
                  <option value="CLOSED">ปิดแล้ว (Closed)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-1 text-foreground">วันเริ่มต้น *</label>
                  <input
                    type="date"
                    required
                    value={editFormData.startDate}
                    onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-foreground">วันสิ้นสุด *</label>
                  <input
                    type="date"
                    required
                    value={editFormData.endDate}
                    onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 text-foreground">
                  จำนวนครั้งที่ประเมินต่อรอบ
                </label>
                <input
                  type="number"
                  disabled
                  min={1}
                  max={1}
                  value={editFormData.expectedWorkingDays}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, expectedWorkingDays: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm font-bold text-primary"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-muted"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50"
                >
                  {editSubmitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
