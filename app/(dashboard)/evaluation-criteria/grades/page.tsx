"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface GradeConfig {
  id: string;
  name: string;
  label: string;
  minPercentage: number;
  maxPercentage: number;
  sortOrder: number;
  isActive: boolean;
}

export default function GradesPage() {
  const [grades, setGrades] = useState<GradeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeConfig | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    label: "",
    minPercentage: 0,
    maxPercentage: 100,
    sortOrder: 1,
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/grades");
      const data = await res.json();
      if (res.ok) setGrades(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrades();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      const url = editingGrade ? `/api/grades/${editingGrade.id}` : "/api/grades";
      const method = editingGrade ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          label: formData.label,
          minPercentage: Number(formData.minPercentage),
          maxPercentage: Number(formData.maxPercentage),
          sortOrder: Number(formData.sortOrder),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "เกิดข้อผิดพลาดในการบันทึก");
        return;
      }

      setShowModal(false);
      setEditingGrade(null);
      fetchGrades();
    } catch {
      setFormError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (g: GradeConfig) => {
    if (!confirm(`คุณต้องการลบเกรด "${g.label}" หรือไม่?`)) return;

    try {
      const res = await fetch(`/api/grades/${g.id}`, { method: "DELETE" });
      if (res.ok) fetchGrades();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-3 text-sm font-medium">
        <Link href="/evaluation-criteria/categories" className="text-muted-foreground hover:text-foreground px-2">
          หมวดหมู่การประเมิน
        </Link>
        <Link href="/evaluation-criteria/questions" className="text-muted-foreground hover:text-foreground px-2">
          คำถามการประเมิน
        </Link>
        <Link href="/evaluation-criteria/score-criteria" className="text-muted-foreground hover:text-foreground px-2">
          เกณฑ์คะแนน (Score Scales)
        </Link>
        <Link href="/evaluation-criteria/grades" className="text-primary border-b-2 border-primary pb-3 -mb-3 px-2">
          เกณฑ์เกรด (Grades)
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">การกำหนดเกรดผลการประเมิน (Grade Configurations)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            กำหนดช่วงคะแนนเปอร์เซ็นต์สำหรับแต่ละเกรด เช่น 90-100% = A, 80-89% = B (ไม่ Hard-code)
          </p>
        </div>
        <button
          onClick={() => {
            setEditingGrade(null);
            setFormData({
              name: "",
              label: "",
              minPercentage: 0,
              maxPercentage: 100,
              sortOrder: grades.length + 1,
            });
            setFormError("");
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm"
        >
          + เพิ่มเกรดใหม่
        </button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-16">ลำดับ</th>
              <th>เกรด (Label)</th>
              <th>ชื่อเรียก</th>
              <th>ช่วงเปอร์เซ็นต์คะแนน (%)</th>
              <th>สถานะ</th>
              <th className="text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">กำลังโหลดข้อมูล...</td>
              </tr>
            ) : grades.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">ยังไม่มีการตั้งค่าเกรด</td>
              </tr>
            ) : (
              grades.map((g) => (
                <tr key={g.id}>
                  <td className="font-mono text-center text-xs text-muted-foreground">{g.sortOrder}</td>
                  <td>
                    <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-base inline-flex items-center justify-center border border-primary/20">
                      {g.label}
                    </span>
                  </td>
                  <td className="font-medium text-foreground">{g.name}</td>
                  <td className="font-mono text-sm">
                    {Number(g.minPercentage).toFixed(0)}% - {Number(g.maxPercentage).toFixed(0)}%
                  </td>
                  <td>
                    <span className="badge-active">Active</span>
                  </td>
                  <td className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingGrade(g);
                          setFormData({
                            name: g.name,
                            label: g.label,
                            minPercentage: Number(g.minPercentage),
                            maxPercentage: Number(g.maxPercentage),
                            sortOrder: g.sortOrder,
                          });
                          setFormError("");
                          setShowModal(true);
                        }}
                        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => handleDelete(g)}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-xl p-6 space-y-4 animate-fade-in">
            <h2 className="text-lg font-bold">
              {editingGrade ? `แก้ไขเกรด: ${editingGrade.label}` : "เพิ่มเกรดใหม่"}
            </h2>
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
                {formError}
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">เกรด (Label) *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น A, B+, Pass"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ชื่อเรียก *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ดีเยี่ยม, ผ่าน"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">คะแนนต่ำสุด (%) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={formData.minPercentage}
                    onChange={(e) => setFormData({ ...formData, minPercentage: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">คะแนนสูงสุด (%) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={formData.maxPercentage}
                    onChange={(e) => setFormData({ ...formData, maxPercentage: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ลำดับ</label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? "กำลังบันทึก..." : "บันทึกเกรด"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
