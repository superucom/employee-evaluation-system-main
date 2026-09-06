"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { formatDate, getMainTeamName } from "@/lib/utils";

interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  nickname: string | null;
  position: string | null;
  status: string;
  startDate: string | null;
  department: { id: string; name: string };
  team: { id: string; name: string; code?: string } | null;
}

interface Department {
  id: string;
  name: string;
  code: string;
  teams: { id: string; name: string; code: string }[];
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mainTeamFilter, setMainTeamFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("DEFAULT");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedMainTeam, setSelectedMainTeam] = useState("TEAM_A");
  const [formData, setFormData] = useState({
    employeeCode: "",
    name: "",
    nickname: "",
    departmentId: "",
    teamId: "",
    position: "",
    startDate: "",
    status: "active",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (mainTeamFilter) params.set("mainTeam", mainTeamFilter);
      if (deptFilter) params.set("departmentId", deptFilter);
      if (statusFilter) params.set("status", statusFilter);
      params.set("sortBy", sortBy);
      params.set("page", page.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/employees?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.data || []);
        setTotal(data.meta?.total || 0);
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
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [mainTeamFilter, deptFilter, statusFilter, sortBy, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEmployees();
  };

  // Helper to find matching sub-team id given departmentId and mainTeam key ("A", "B", "C")
  // Always returns first team if no match found, never returns ""
  const resolveTeamId = (deptId: string, mainTeamKey: string): string => {
    const dept = departments.find((d) => d.id === deptId);
    if (!dept || dept.teams.length === 0) return "";
    const suffix = mainTeamKey.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(-1);
    const matched = dept.teams.find((t) => {
      const u = t.name.toUpperCase();
      const c = (t.code || "").toUpperCase();
      if (suffix === "A") return u.includes("TEAM A") || u.endsWith(" A") || c.endsWith("_A") || c.includes("TEAM_A");
      if (suffix === "B") return u.includes("TEAM B") || u.endsWith(" B") || c.endsWith("_B") || c.includes("TEAM_B");
      if (suffix === "C") return u.includes("TEAM C") || u.endsWith(" C") || c.endsWith("_C") || c.includes("TEAM_C");
      if (suffix === "D") return u.includes("TEAM D") || u.endsWith(" D") || c.endsWith("_D") || c.includes("TEAM_D");
      return false;
    });
    // Always fall back to first team — never send empty string to avoid FK violation
    return matched?.id || dept.teams[0]?.id || "";
  };

  // Get available sub-teams for current department selection
  const availableTeams = useMemo(() => {
    return departments.find((d) => d.id === formData.departmentId)?.teams || [];
  }, [departments, formData.departmentId]);

  const handleOpenAddModal = () => {
    setEditingEmployee(null);
    const firstDeptId = departments[0]?.id || "";
    const initialMain = "TEAM_A";
    setSelectedMainTeam(initialMain);
    setFormData({
      employeeCode: "",
      name: "",
      nickname: "",
      departmentId: firstDeptId,
      teamId: resolveTeamId(firstDeptId, initialMain),
      position: "",
      startDate: new Date().toISOString().split("T")[0],
      status: "active",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    const mainTeamLabel = getMainTeamName(emp.team);
    let mainKey = "TEAM_A";
    if (mainTeamLabel.includes("B")) mainKey = "TEAM_B";
    else if (mainTeamLabel.includes("C")) mainKey = "TEAM_C";
    else if (mainTeamLabel.includes("D")) mainKey = "TEAM_D";

    setSelectedMainTeam(mainKey);
    setFormData({
      employeeCode: emp.employeeCode,
      name: emp.name,
      nickname: emp.nickname || "",
      departmentId: emp.department?.id || "",
      teamId: emp.team?.id || "",
      position: emp.position || "",
      startDate: emp.startDate ? emp.startDate.split("T")[0] : "",
      status: emp.status,
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      const url = editingEmployee ? `/api/employees/${editingEmployee.id}` : "/api/employees";
      const method = editingEmployee ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "เกิดข้อผิดพลาดในการบันทึก");
        return;
      }

      setShowModal(false);
      setEditingEmployee(null);
      fetchEmployees();
    } catch {
      setFormError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`คุณต้องการลบพนักงาน ${emp.name} (${emp.employeeCode}) หรือไม่?`)) return;

    try {
      const res = await fetch(`/api/employees/${emp.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        fetchEmployees();
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการลบ");
      }
    } catch {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  const getTeamBadgeStyle = (teamName: string) => {
    if (teamName.includes("A")) return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    if (teamName.includes("B")) return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    if (teamName.includes("C")) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">จัดการข้อมูลพนักงาน (Employees)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            พนักงานทั้งหมด {total} คน (แบ่งตาม 3 ทีมหลัก: ทีม A, ทีม B, ทีม C)
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-sm text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          เพิ่มพนักงานใหม่
        </button>
      </div>

      {/* Filter & Search */}
      <div className="bg-card p-4 rounded-xl border border-border flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder="ค้นหารหัสพนักงาน ชื่อ หรือชื่อเล่น..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-xl text-sm font-medium hover:bg-secondary/80"
          >
            ค้นหา
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {/* Main Team Filter */}
          <select
            value={mainTeamFilter}
            onChange={(e) => {
              setMainTeamFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-background border border-input rounded-xl text-sm font-medium"
          >
            <option value="">ทุกทีมหลัก (All Teams)</option>
            <option value="TEAM_A">ทีม A (Team A)</option>
            <option value="TEAM_B">ทีม B (Team B)</option>
            <option value="TEAM_C">ทีม C (Team C)</option>
          </select>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-background border border-input rounded-xl text-sm"
          >
            <option value="">ทุกแผนก (All Departments)</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-background border border-input rounded-xl text-sm"
          >
            <option value="">ทุกสถานะ</option>
            <option value="active">Active (ทำงานอยู่)</option>
            <option value="inactive">Inactive (ระงับ/ลาออก)</option>
          </select>

          {/* Sort By Filter */}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-background border border-input rounded-xl text-sm font-medium text-foreground"
          >
            <option value="DEFAULT">🏆 เรียง: ทีม &gt; ตำแหน่ง &gt; แผนก &gt; วันเริ่มงาน</option>
            <option value="NAME_ASC">👤 ชื่อพนักงาน (ก-ฮ / A-Z)</option>
            <option value="NAME_DESC">👤 ชื่อพนักงาน (ฮ-ก / Z-A)</option>
            <option value="TEAM_ASC">👥 ทีมหลัก (ทีม A → B → C)</option>
            <option value="TEAM_DESC">👥 ทีมหลัก (ทีม C → B → A)</option>
            <option value="CODE_ASC">🔢 รหัสพนักงาน (น้อย → มาก)</option>
            <option value="CODE_DESC">🔢 รหัสพนักงาน (มาก → น้อย)</option>
            <option value="START_DATE_ASC">📅 วันเริ่มงาน (เริ่มก่อน → หลัง)</option>
            <option value="START_DATE_DESC">📅 วันเริ่มงาน (เริ่มล่าสุด → ก่อน)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>รหัสพนักงาน</th>
                <th>ชื่อ-นามสกุล</th>
                <th>ชื่อเล่น</th>
                <th>แผนก</th>
                <th>ทีมหลัก</th>
                <th>ตำแหน่ง</th>
                <th>วันที่เริ่มงาน</th>
                <th>สถานะ</th>
                <th className="text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-muted-foreground">
                    กำลังโหลดข้อมูลพนักงาน...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-muted-foreground">
                    ไม่พบข้อมูลพนักงานตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const mainTeam = getMainTeamName(emp.team);
                  const teamStyle = getTeamBadgeStyle(mainTeam);

                  return (
                    <tr key={emp.id} className="hover:bg-muted/40 transition-colors">
                      <td className="font-mono font-semibold text-primary">
                        <Link href={`/employees/${emp.id}`} className="hover:underline">
                          {emp.employeeCode}
                        </Link>
                      </td>
                      <td className="font-medium text-foreground">
                        <Link href={`/employees/${emp.id}`} className="hover:underline">
                          {emp.name}
                        </Link>
                      </td>
                      <td>{emp.nickname || "-"}</td>
                      <td>
                        <span className="font-medium text-foreground">{emp.department?.name || "-"}</span>
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border ${teamStyle}`}>
                          {mainTeam}
                        </span>
                      </td>
                      <td className="text-xs text-slate-300">{emp.position || "-"}</td>
                      <td className="text-xs text-muted-foreground">{formatDate(emp.startDate)}</td>
                      <td>
                        <span className={emp.status === "active" ? "badge-active" : "badge-inactive"}>
                          {emp.status === "active" ? "ทำงานอยู่" : "ลาออก/พักงาน"}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={`/employees/${emp.id}`}
                            className="px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg"
                          >
                            ดูประวัติ
                          </Link>
                          <button
                            onClick={() => handleOpenEditModal(emp)}
                            className="px-2 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/10 rounded-lg"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => handleDelete(emp)}
                            className="px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg"
                          >
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Info */}
        {total > 0 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>
              แสดงหน้า {page} (รวม {total} คน)
            </span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 rounded-lg border border-border hover:bg-muted disabled:opacity-40"
              >
                ← ก่อนหน้า
              </button>
              <button
                disabled={page * 20 >= total}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 rounded-lg border border-border hover:bg-muted disabled:opacity-40"
              >
                ถัดไป →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                {editingEmployee ? `แก้ไขพนักงาน: ${editingEmployee.name}` : "เพิ่มพนักงานใหม่"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">รหัสพนักงาน *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น EMP001"
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">ชื่อเล่น</label>
                  <input
                    type="text"
                    placeholder="เช่น ชาย, นิด"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">ชื่อ-นามสกุล *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สมชาย ใจดี"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">ทีมหลัก *</label>
                  <select
                    required
                    value={selectedMainTeam}
                    onChange={(e) => {
                      const newMain = e.target.value;
                      setSelectedMainTeam(newMain);
                      setFormData({
                        ...formData,
                        teamId: resolveTeamId(formData.departmentId, newMain),
                      });
                    }}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm font-bold text-primary"
                  >
                    <option value="TEAM_A">ทีม A (Team A)</option>
                    <option value="TEAM_B">ทีม B (Team B)</option>
                    <option value="TEAM_C">ทีม C (Team C)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">แผนก *</label>
                  <select
                    required
                    value={formData.departmentId}
                    onChange={(e) => {
                      const newDept = e.target.value;
                      const newTeamId = resolveTeamId(newDept, selectedMainTeam);
                      setFormData({
                        ...formData,
                        departmentId: newDept,
                        teamId: newTeamId,
                      });
                    }}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm"
                  >
                    <option value="">เลือกแผนก</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sub-team selection — shown when dept has multiple teams */}
              {availableTeams.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">
                    ทีมย่อย (Sub-team)
                    {availableTeams.length === 1 && <span className="ml-1 text-xs text-muted-foreground">(กำหนดอัตโนมัติ)</span>}
                  </label>
                  <select
                    required
                    value={formData.teamId}
                    onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm font-medium"
                  >
                    <option value="">เลือกทีมย่อย</option>
                    {availableTeams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {!formData.teamId && (
                    <p className="text-xs text-red-400 mt-1">กรุณาเลือกทีมย่อย</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">ตำแหน่ง</label>
                  <input
                    type="text"
                    placeholder="เช่น Support Agent"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">วันที่เริ่มงาน</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">สถานะ</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm"
                >
                  <option value="active">Active (ทำงานอยู่)</option>
                  <option value="inactive">Inactive (ระงับ/ลาออก)</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-muted"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
