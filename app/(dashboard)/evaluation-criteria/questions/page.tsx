"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Question {
  id: string;
  categoryId: string;
  text: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  category: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
}

export default function QuestionsPage() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("categoryId") || "";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatFilter, setSelectedCatFilter] = useState(initialCategory);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState({
    categoryId: "",
    text: "",
    description: "",
    sortOrder: 0,
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const url = selectedCatFilter
        ? `/api/evaluation-questions?categoryId=${selectedCatFilter}`
        : "/api/evaluation-questions";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setQuestions(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/evaluation-categories");
      const data = await res.json();
      if (res.ok) setCategories(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [selectedCatFilter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      const url = editingQuestion
        ? `/api/evaluation-questions/${editingQuestion.id}`
        : "/api/evaluation-questions";
      const method = editingQuestion ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: formData.categoryId,
          text: formData.text,
          description: formData.description || null,
          sortOrder: Number(formData.sortOrder),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "เกิดข้อผิดพลาดในการบันทึก");
        return;
      }

      setShowModal(false);
      setEditingQuestion(null);
      fetchQuestions();
    } catch {
      setFormError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (q: Question) => {
    if (!confirm(`คุณต้องการลบคำถาม "${q.text}" หรือไม่?`)) return;

    try {
      const res = await fetch(`/api/evaluation-questions/${q.id}`, { method: "DELETE" });
      if (res.ok) fetchQuestions();
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
        <Link href="/evaluation-criteria/questions" className="text-primary border-b-2 border-primary pb-3 -mb-3 px-2">
          คำถามการประเมิน
        </Link>
        <Link href="/evaluation-criteria/score-criteria" className="text-muted-foreground hover:text-foreground px-2">
          เกณฑ์คะแนน (Score Scales)
        </Link>
        <Link href="/evaluation-criteria/grades" className="text-muted-foreground hover:text-foreground px-2">
          เกณฑ์เกรด (Grades)
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">คำถามการประเมิน (Evaluation Questions)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            กำหนดคำถามหรือเกณฑ์ย่อยในแต่ละหมวดหมู่ เพื่อให้ผู้ประเมินให้คะแนน
          </p>
        </div>
        <button
          onClick={() => {
            setEditingQuestion(null);
            setFormData({
              categoryId: selectedCatFilter || categories[0]?.id || "",
              text: "",
              description: "",
              sortOrder: questions.length + 1,
            });
            setFormError("");
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm"
        >
          + เพิ่มคำถามใหม่
        </button>
      </div>

      {/* Category filter bar */}
      <div className="flex items-center gap-3 bg-card p-4 rounded-xl border border-border">
        <span className="text-sm font-medium text-muted-foreground">กรองตามหมวดหมู่:</span>
        <select
          value={selectedCatFilter}
          onChange={(e) => setSelectedCatFilter(e.target.value)}
          className="px-3 py-1.5 bg-background border border-input rounded-lg text-sm font-medium"
        >
          <option value="">ทั้งหมดทุกหมวดหมู่</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-16">ลำดับ</th>
              <th>หมวดหมู่</th>
              <th>ข้อคำถาม</th>
              <th>คำอธิบายเกณฑ์</th>
              <th className="text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-muted-foreground">กำลังโหลดคำถาม...</td>
              </tr>
            ) : questions.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-muted-foreground">ไม่พบข้อคำถาม</td>
              </tr>
            ) : (
              questions.map((q) => (
                <tr key={q.id}>
                  <td className="font-mono text-center text-xs text-muted-foreground">{q.sortOrder}</td>
                  <td>
                    <span className="font-semibold text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {q.category?.name}
                    </span>
                  </td>
                  <td className="font-medium text-foreground">{q.text}</td>
                  <td className="text-xs text-muted-foreground">{q.description || "-"}</td>
                  <td className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingQuestion(q);
                          setFormData({
                            categoryId: q.categoryId,
                            text: q.text,
                            description: q.description || "",
                            sortOrder: q.sortOrder,
                          });
                          setFormError("");
                          setShowModal(true);
                        }}
                        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => handleDelete(q)}
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
              {editingQuestion ? `แก้ไขคำถาม` : "เพิ่มคำถามใหม่"}
            </h2>
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
                {formError}
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">หมวดหมู่ *</label>
                <select
                  required
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                >
                  <option value="">เลือกหมวดหมู่</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ข้อคำถาม (หัวข้อประเมิน) *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น คุณภาพงานที่ส่งมอบ, ความถูกต้องของงาน"
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">คำอธิบายรายละเอียด</label>
                <textarea
                  rows={2}
                  placeholder="คำอธิบายเพิ่มเติมเพื่อให้ผู้ประเมินเข้าใจเกณฑ์"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ลำดับการแสดงผล</label>
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
                  {submitting ? "กำลังบันทึก..." : "บันทึกคำถาม"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
