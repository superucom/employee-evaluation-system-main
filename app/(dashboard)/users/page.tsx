"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { formatDateTime, getRoleLabel, getMainTeamName, extractNickname } from "@/lib/utils";

interface User {
  id: string;
  username: string;
  fullName: string;
  role: "MANAGER" | "SUPER" | "SUPPORT_SUPER" | "SUPER_CR" | "HEAD" | "SUPPORT_HEAD" | "EVALUATOR";
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  department: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
}

interface Department {
  id: string;
  name: string;
  teams: { id: string; name: string }[];
}

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<{
    username: string;
    tempPassword?: string;
    warning?: string;
  } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullName: "",
    role: "EVALUATOR",
    departmentId: "",
    teamId: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("isActive", statusFilter);

      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments?includeTeams=true");
      const data = await res.json();
      if (res.ok) {
        setDepartments(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, [roleFilter, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          departmentId: formData.departmentId || null,
          teamId: formData.teamId || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน");
        return;
      }

      setShowCreateModal(false);
      setFormData({
        username: "",
        password: "",
        fullName: "",
        role: "EVALUATOR",
        departmentId: "",
        teamId: "",
      });
      fetchUsers();
    } catch {
      setFormError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          role: formData.role,
          departmentId: formData.departmentId || null,
          teamId: formData.teamId || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "เกิดข้อผิดพลาดในการแก้ไข");
        return;
      }

      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch {
      setFormError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    if (!confirm(`คุณต้องการ${user.isActive ? "ระงับ" : "เปิด"}การใช้งานผู้ใช้ ${user.username} หรือไม่?`)) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetPassword = async (user: User) => {
    if (!confirm(`คุณต้องการ Reset Password ของ ${user.username} หรือไม่?\nระบบจะสร้างรหัสผ่านชั่วคราวและแสดงให้คุณเห็นเพียงครั้งเดียว`)) return;

    try {
      const res = await fetch(`/api/users/${user.id}/reset-password`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        setResetPasswordResult({
          username: user.username,
          tempPassword: data.temporaryPassword,
          warning: data.warning,
        });
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการ Reset Password");
      }
    } catch {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`คุณต้องการลบผู้ใช้งาน ${user.username} (${user.fullName}) หรือไม่?`)) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (res.ok) {
        fetchUsers();
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการลบผู้ใช้งาน");
      }
    } catch {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  const availableTeams = useMemo(() => {
    if (formData.departmentId) {
      return departments.find((d) => d.id === formData.departmentId)?.teams || [];
    }
    return departments.flatMap((d) => d.teams);
  }, [departments, formData.departmentId]);

  // Unified Team Options (Group sub-teams into 3 Main Teams: ทีม A, ทีม B, ทีม C)
  const unifiedTeams = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();

    for (const t of availableTeams) {
      const cleanName = getMainTeamName(t);
      if (cleanName && cleanName !== "-") {
        if (!map.has(cleanName)) {
          map.set(cleanName, { id: t.id, name: cleanName });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "th"));
  }, [availableTeams]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">จัดการผู้ใช้งาน (User Management)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            จัดการบัญชีผู้ใช้งาน สิทธิ์การเข้าถึง และการ Reset Password
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              username: "",
              password: "",
              fullName: "",
              role: "EVALUATOR",
              departmentId: "",
              teamId: "",
            });
            setFormError("");
            setShowCreateModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          เพิ่มผู้ใช้งานใหม่
        </button>
      </div>

      {/* Filter & Search */}
      <div className="bg-card p-4 rounded-xl border border-border flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder="ค้นหา Username หรือชื่อ-นามสกุล..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80"
          >
            ค้นหา
          </button>
        </form>
        <div className="flex gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-background border border-input rounded-lg text-sm"
          >
            <option value="">ทุก Role</option>
                  <option value="MANAGER">Manager (ผู้จัดการ)</option>
                  <option value="SUPER">Super</option>
                  <option value="SUPPORT_SUPER">Support Super</option>
                  <option value="SUPER_CR">Super.CR</option>
                  <option value="HEAD">Head (หัวหน้าแผนก)</option>
            <option value="SUPPORT_HEAD">Support Head (ผู้ช่วยหัวหน้าแผนก)</option>
            <option value="EVALUATOR">Evaluator (ผู้ประเมิน)</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-background border border-input rounded-lg text-sm"
          >
            <option value="">ทุกสถานะ</option>
            <option value="true">เปิดใช้งาน</option>
            <option value="false">ระงับการใช้งาน</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>ชื่อ-นามสกุล</th>
                <th>Role</th>
                <th>แผนก / ทีม</th>
                <th>สถานะ</th>
                <th>เข้าสู่ระบบล่าสุด</th>
                <th className="text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    ไม่พบข้อมูลผู้ใช้งาน
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td className="font-semibold text-foreground">{u.username}</td>
                    <td>
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <span>{u.fullName}</span>
                        {extractNickname(u.fullName) && (
                          <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-bold border border-primary/20">
                            {extractNickname(u.fullName)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          u.role === "MANAGER"
                            ? "bg-purple-100 text-purple-900 border border-purple-200"
                            : u.role === "HEAD"
                            ? "bg-amber-100 text-amber-900 border border-amber-200"
                            : u.role === "SUPPORT_HEAD"
                            ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                            : "bg-blue-100 text-blue-900 border border-blue-200"
                        }`}
                      >
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="text-muted-foreground">
                      {u.department?.name ? (
                        <span>
                          {u.department.name}
                          {u.team ? ` / ${getMainTeamName(u.team)}` : ""}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <span className={u.isActive ? "badge-active" : "badge-inactive"}>
                        {u.isActive ? "เปิดใช้งาน" : "ระงับ"}
                      </span>
                      {u.mustChangePassword && (
                        <span className="ml-1 text-[10px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded">
                          ต้องเปลี่ยน Password
                        </span>
                      )}
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "ยังไม่เคยเข้าสู่ระบบ"}
                    </td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setFormData({
                              username: u.username,
                              password: "",
                              fullName: u.fullName,
                              role: u.role,
                              departmentId: u.department?.id || "",
                              teamId: u.team?.id || "",
                            });
                            setFormError("");
                            setShowEditModal(true);
                          }}
                          className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleResetPassword(u)}
                          className="px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded"
                        >
                          Reset Pass
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                        >
                          {u.isActive ? "ระงับ" : "เปิด"}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded"
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
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-xl overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold">เพิ่มผู้ใช้งานใหม่</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น super01, head01"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password เริ่มต้น *</label>
                <input
                  type="password"
                  required
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ผู้ใช้จะต้องเปลี่ยน Password ในการเข้าสู่ระบบครั้งแรก
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ชื่อ-นามสกุล *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สมศักดิ์ มีสุข"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                >
                  <option value="EVALUATOR">Evaluator (ผู้ประเมินทั่วไป)</option>
                  <option value="SUPER">Super</option>
                  <option value="SUPPORT_SUPER">Support Super</option>
                  <option value="SUPER_CR">Super.CR</option>
                  <option value="HEAD">Head (หัวหน้าแผนก)</option>
                  <option value="SUPPORT_HEAD">Support Head (ผู้ช่วยหัวหน้าแผนก)</option>
                  <option value="MANAGER">Manager (ผู้ดูแลระบบ)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">แผนก</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                  >
                    <option value="">ไม่ระบุ (เช่น Super)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ทีม *</label>
                  <select
                    value={formData.teamId}
                    onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-medium"
                  >
                    <option value="">ไม่ระบุทีม</option>
                    {unifiedTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-muted-foreground col-span-2">
                  💡 สำหรับผู้ประเมินระดับ Super/SuportSuper สามารถเลือกเฉพาะทีมโดยไม่ต้องเลือกแผนกได้ (เพราะดูแลทุกแผนกในทีมนั้น)
                </p>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? "กำลังบันทึก..." : "สร้างผู้ใช้งาน"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-xl overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold">แก้ไขผู้ใช้งาน: {selectedUser.username}</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">ชื่อ-นามสกุล *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                >
                  <option value="EVALUATOR">Evaluator (ผู้ประเมินทั่วไป)</option>
                  <option value="SUPER">Super</option>
                  <option value="SUPPORT_SUPER">Support Super</option>
                  <option value="SUPER_CR">Super.CR</option>
                  <option value="HEAD">Head (หัวหน้าแผนก)</option>
                  <option value="SUPPORT_HEAD">Support Head (ผู้ช่วยหัวหน้าแผนก)</option>
                  <option value="MANAGER">Manager (ผู้ดูแลระบบ)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">แผนก</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                  >
                    <option value="">ไม่ระบุ (เช่น Super)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ทีม *</label>
                  <select
                    value={formData.teamId}
                    onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-medium"
                  >
                    <option value="">ไม่ระบุทีม</option>
                    {unifiedTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-muted-foreground col-span-2">
                  💡 สำหรับผู้ประเมินระดับ Super/SuportSuper สามารถเลือกเฉพาะทีมโดยไม่ต้องเลือกแผนกได้ (เพราะดูแลทุกแผนกในทีมนั้น)
                </p>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Result Popup */}
      {resetPasswordResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                🔑
              </div>
              <div>
                <h3 className="font-bold text-foreground">Reset Password สำเร็จ</h3>
                <p className="text-xs text-muted-foreground">สำหรับผู้ใช้: {resetPasswordResult.username}</p>
              </div>
            </div>

            <div className="p-4 bg-muted/60 rounded-xl border border-border space-y-2">
              <span className="text-xs text-muted-foreground font-medium">Temporary Password (รหัสผ่านชั่วคราว):</span>
              <div className="flex items-center justify-between bg-background p-3 rounded-lg border font-mono text-lg font-bold text-primary">
                <span>{resetPasswordResult.tempPassword}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(resetPasswordResult.tempPassword || "");
                    alert("คัดลอกรหัสผ่านแล้ว!");
                  }}
                  className="px-2 py-1 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20"
                >
                  คัดลอก
                </button>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
              ⚠️ {resetPasswordResult.warning}
            </div>

            <button
              onClick={() => setResetPasswordResult(null)}
              className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg text-sm hover:bg-primary/90"
            >
              รับทราบและปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
