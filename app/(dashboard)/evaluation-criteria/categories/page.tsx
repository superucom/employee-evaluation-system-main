"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  questions: { id: string; text: string; sortOrder: number }[];
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", sortOrder: 0 });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/evaluation-categories");
      const data = await res.json();
      if (res.ok) {
        setCategories(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      const url = editingCategory
        ? `/api/evaluation-categories/${editingCategory.id}`
        : "/api/evaluation-categories";
      const method = editingCategory ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
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
      setEditingCategory(null);
      fetchCategories();
    } catch {
      setFormError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`คุณต้องการลบหมวดหมู่ "${cat.name}" หรือไม่?`)) return;

    try {
      const res = await fetch(`/api/evaluation-categories/${cat.id}`, { method: "DELETE" });
      if (res.ok) fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-3 text-sm font-medium">
        <Link href="/evaluation-criteria/categories" className="text-primary border-b-2 border-primary pb-3 -mb-3 px-2">
          หมวดหมู่การประเมิน
        </Link>
        <Link href="/evaluation-criteria/questions" className="text-muted-foreground hover:text-foreground px-2">
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
          <h1 className="text-2xl font-bold text-foreground">หมวดหมู่การประเมิน (Evaluation Categories)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            กำหนดหมวดหมู่หลักในการประเมินผลการปฏิบัติงาน เช่น การมาปฏิบัติงาน, คุณภาพงาน, การทำงานเป็นทีม
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            setFormData({ name: "", description: "", sortOrder: categories.length + 1 });
            setFormError("");
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm"
        >
          + เพิ่มหมวดหมู่ใหม่
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">กำลังโหลดข้อมูล...</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">ยังไม่มีหมวดหมู่การประเมิน</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {cat.sortOrder}
                    </span>
                    <h2 className="text-base font-bold text-foreground">{cat.name}</h2>
                  </div>
                  {cat.description && (
                    <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingCategory(cat);
                      setFormData({
                        name: cat.name,
                        description: cat.description || "",
                        sortOrder: cat.sortOrder,
                      });
                      setFormError("");
                      setShowModal(true);
                    }}
                    className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                  >
                    ลบ
                  </button>
                </div>
              </div>

              {/* Questions preview */}
              <div className="pt-2 border-t border-border">
                <div className="text-xs font-semibold text-muted-foreground mb-1.5 flex justify-between">
                  <span>คำถามในหมวดนี้ ({cat.questions?.length || 0})</span>
                  <Link href={`/evaluation-criteria/questions?categoryId=${cat.id}`} className="text-primary hover:underline">
                    จัดการคำถาม →
                  </Link>
                </div>
                <div className="space-y-1">
                  {cat.questions?.map((q) => (
                    <div key={q.id} className="text-xs bg-muted/40 p-2 rounded flex items-center gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>{q.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-xl p-6 space-y-4 animate-fade-in">
            <h2 className="text-lg font-bold">
              {editingCategory ? `แก้ไขหมวดหมู่: ${editingCategory.name}` : "เพิ่มหมวดหมู่ใหม่"}
            </h2>
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
                {formError}
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">ชื่อหมวดหมู่ *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น คุณภาพงาน, การทำงานเป็นทีม"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">คำอธิบาย</label>
                <textarea
                  rows={2}
                  placeholder="คำอธิบายสั้นๆ เกี่ยวกับหมวดหมู่นี้"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ลำดับการแสดงผล (Sort Order)</label>
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
                  {submitting ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
