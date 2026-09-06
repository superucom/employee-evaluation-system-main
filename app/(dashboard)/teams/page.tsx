"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getMainTeamName } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  departmentId: string;
  department: { id: string; name: string; code?: string };
  _count?: { employees: number };
}

interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  _count?: { employees: number };
  teams?: { id: string; name: string; code: string; _count?: { employees: number } }[];
}

interface Employee {
  id: string;
  name: string;
  nickname: string | null;
  position: string | null;
  employeeCode: string;
  status: string;
  startDate: string | null;
  department: { id: string; name: string };
  team: { id: string; name: string } | null;
}

interface UnifiedTeamGroup {
  key: string;
  name: string;
  code: string;
  badgeLetter: string;
  totalEmployees: number;
  isActive: boolean;
  colorTheme: {
    bg: string;
    border: string;
    text: string;
    badge: string;
  };
  departments: Array<{
    teamId: string;
    teamName: string;
    teamCode: string;
    deptId: string;
    deptName: string;
    deptCode: string;
    employeeCount: number;
    description: string | null;
    rawTeam: Team;
  }>;
}

export default function TeamsAndDepartmentsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"teams" | "departments">("teams");

  // Employee drill-down panel
  const [selectedDeptGroup, setSelectedDeptGroup] = useState<{
    teamId?: string;
    deptId?: string;
    title: string;
    subtitle: string;
  } | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empLoading, setEmpLoading] = useState(false);

  // Department Modal
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({
    name: "",
    code: "",
    description: "",
    isActive: true,
  });
  const [deptError, setDeptError] = useState("");
  const [deptSubmitting, setDeptSubmitting] = useState(false);

  // Team Modal
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamForm, setTeamForm] = useState({
    name: "",
    code: "",
    departmentId: "",
    description: "",
    isActive: true,
  });
  const [teamError, setTeamError] = useState("");
  const [teamSubmitting, setTeamSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [teamsRes, deptsRes] = await Promise.all([
        fetch(`/api/teams`),
        fetch(`/api/departments?includeTeams=true`),
      ]);
      const [teamsData, deptsData] = await Promise.all([
        teamsRes.json(),
        deptsRes.json(),
      ]);
      if (teamsRes.ok) setTeams(teamsData.data || []);
      if (deptsRes.ok) setDepartments(deptsData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchEmployees = async (params: { teamId?: string; departmentId?: string }) => {
    setEmpLoading(true);
    try {
      const q = new URLSearchParams();
      if (params.teamId) q.set("teamId", params.teamId);
      if (params.departmentId) q.set("departmentId", params.departmentId);
      q.set("limit", "200");
      const res = await fetch(`/api/employees?${q.toString()}`);
      const data = await res.json();
      if (res.ok) setEmployees(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setEmpLoading(false);
    }
  };

  const handleClickTeamDept = (dept: UnifiedTeamGroup["departments"][number], groupName: string) => {
    setSelectedDeptGroup({
      teamId: dept.teamId,
      deptId: dept.deptId,
      title: `${dept.deptName} (${groupName})`,
      subtitle: `รหัสทีม: ${dept.teamCode}`,
    });
    fetchEmployees({ teamId: dept.teamId });
  };

  const handleClickWholeDept = (d: Department) => {
    setSelectedDeptGroup({
      deptId: d.id,
      title: `แผนก ${d.name} (${d.code})`,
      subtitle: `พนักงานทุกทีมในแผนกนี้`,
    });
    fetchEmployees({ departmentId: d.id });
  };

  // Department Modal Handlers
  const handleOpenAddDept = () => {
    setEditingDept(null);
    setDeptForm({ name: "", code: "", description: "", isActive: true });
    setDeptError("");
    setShowDeptModal(true);
  };

  const handleOpenEditDept = (d: Department) => {
    setEditingDept(d);
    setDeptForm({
      name: d.name,
      code: d.code,
      description: d.description || "",
      isActive: d.isActive,
    });
    setDeptError("");
    setShowDeptModal(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeptSubmitting(true);
    setDeptError("");
    try {
      const url = editingDept ? `/api/departments/${editingDept.id}` : "/api/departments";
      const method = editingDept ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deptForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeptError(data.error || "เกิดข้อผิดพลาดในการบันทึก");
        return;
      }
      setShowDeptModal(false);
      fetchData();
    } catch {
      setDeptError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setDeptSubmitting(false);
    }
  };

  const handleDeleteDept = async (d: Department) => {
    if (!confirm(`คุณต้องการลบแผนก "${d.name}" (${d.code}) หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/departments/${d.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        fetchData();
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการลบแผนก");
      }
    } catch {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  // Team Modal Handlers
  const handleOpenAddTeam = () => {
    setEditingTeam(null);
    setTeamForm({
      name: "",
      code: "",
      departmentId: departments[0]?.id || "",
      description: "",
      isActive: true,
    });
    setTeamError("");
    setShowTeamModal(true);
  };

  const handleOpenEditTeam = (t: Team) => {
    setEditingTeam(t);
    setTeamForm({
      name: t.name,
      code: t.code,
      departmentId: t.departmentId,
      description: t.description || "",
      isActive: t.isActive,
    });
    setTeamError("");
    setShowTeamModal(true);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamSubmitting(true);
    setTeamError("");
    try {
      const url = editingTeam ? `/api/teams/${editingTeam.id}` : "/api/teams";
      const method = editingTeam ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teamForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setTeamError(data.error || "เกิดข้อผิดพลาดในการบันทึก");
        return;
      }
      setShowTeamModal(false);
      fetchData();
    } catch {
      setTeamError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setTeamSubmitting(false);
    }
  };

  const handleDeleteTeam = async (t: Team) => {
    if (!confirm(`คุณต้องการลบทีมย่อย "${t.name}" (${t.code}) หรือไม่?`)) return;
    setTeamSubmitting(true);
    setTeamError("");
    try {
      const res = await fetch(`/api/teams/${t.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setTeamError(data.error || "เกิดข้อผิดพลาดในการลบทีม");
        return;
      }
      setShowTeamModal(false);
      fetchData();
    } catch {
      setTeamError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setTeamSubmitting(false);
    }
  };

  // Group teams into 3 Unified Teams (Team A, Team B, Team C)
  const unifiedGroups = useMemo<UnifiedTeamGroup[]>(() => {
    const defs = [
      {
        key: "A",
        name: "ทีม A (Team A)",
        code: "TEAM_A",
        badgeLetter: "A",
        colorTheme: {
          bg: "from-blue-600/15 via-blue-900/10 to-transparent",
          border: "border-blue-500/30 hover:border-blue-500/60",
          text: "text-blue-400",
          badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        },
      },
      {
        key: "B",
        name: "ทีม B (Team B)",
        code: "TEAM_B",
        badgeLetter: "B",
        colorTheme: {
          bg: "from-purple-600/15 via-purple-900/10 to-transparent",
          border: "border-purple-500/30 hover:border-purple-500/60",
          text: "text-purple-400",
          badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        },
      },
      {
        key: "C",
        name: "ทีม C (Team C)",
        code: "TEAM_C",
        badgeLetter: "C",
        colorTheme: {
          bg: "from-emerald-600/15 via-emerald-900/10 to-transparent",
          border: "border-emerald-500/30 hover:border-emerald-500/60",
          text: "text-emerald-400",
          badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        },
      },
    ];

    return defs.map((d) => {
      const depts: UnifiedTeamGroup["departments"] = [];
      let total = 0;

      for (const t of teams) {
        const u = t.name.toUpperCase().trim();
        const cu = t.code.toUpperCase().trim();
        let match = false;
        if (d.key === "A" && (u.includes("TEAM A") || u.endsWith(" A") || cu.endsWith("_A") || cu.includes("TEAM_A"))) match = true;
        if (d.key === "B" && (u.includes("TEAM B") || u.endsWith(" B") || cu.endsWith("_B") || cu.includes("TEAM_B"))) match = true;
        if (d.key === "C" && (u.includes("TEAM C") || u.endsWith(" C") || cu.endsWith("_C") || cu.includes("TEAM_C"))) match = true;

        if (match) {
          const count = t._count?.employees || 0;
          total += count;
          depts.push({
            teamId: t.id,
            teamName: t.name,
            teamCode: t.code,
            deptId: t.department.id,
            deptName: t.department.name,
            deptCode: t.department.code || t.code.split("_")[0],
            employeeCount: count,
            description: t.description,
            rawTeam: t,
          });
        }
      }

      depts.sort((a, b) => a.deptName.localeCompare(b.deptName, "th"));

      return {
        ...d,
        totalEmployees: total,
        isActive: true,
        departments: depts,
      };
    });
  }, [teams]);

  const totalEmployeesAll = useMemo(() => {
    return unifiedGroups.reduce((acc, g) => acc + g.totalEmployees, 0);
  }, [unifiedGroups]);

  // Breakdown per department across Team A, Team B, Team C
  const departmentBreakdown = useMemo(() => {
    return departments.map((d) => {
      let countA = 0;
      let countB = 0;
      let countC = 0;
      let teamAObj: Team | null = null;
      let teamBObj: Team | null = null;
      let teamCObj: Team | null = null;

      const deptTeams = teams.filter((t) => t.departmentId === d.id);
      for (const t of deptTeams) {
        const u = t.name.toUpperCase().trim();
        const cu = t.code.toUpperCase().trim();
        const c = t._count?.employees || 0;
        if (u.includes("TEAM A") || u.endsWith(" A") || cu.endsWith("_A") || cu.includes("TEAM_A")) {
          countA += c;
          teamAObj = t;
        } else if (u.includes("TEAM B") || u.endsWith(" B") || cu.endsWith("_B") || cu.includes("TEAM_B")) {
          countB += c;
          teamBObj = t;
        } else if (u.includes("TEAM C") || u.endsWith(" C") || cu.endsWith("_C") || cu.includes("TEAM_C")) {
          countC += c;
          teamCObj = t;
        }
      }

      return {
        ...d,
        countA,
        countB,
        countC,
        totalCount: countA + countB + countC,
        teamAObj,
        teamBObj,
        teamCObj,
      };
    }).sort((a, b) => a.name.localeCompare(b.name, "th"));
  }, [departments, teams]);

  const filteredGroups = useMemo(() => {
    if (!search) return unifiedGroups;
    const s = search.toLowerCase();
    return unifiedGroups.map((g) => {
      const isGroupMatch = g.name.toLowerCase().includes(s) || g.code.toLowerCase().includes(s);
      const matchedDepts = g.departments.filter(
        (d) =>
          d.deptName.toLowerCase().includes(s) ||
          d.teamName.toLowerCase().includes(s) ||
          d.teamCode.toLowerCase().includes(s)
      );
      return {
        ...g,
        departments: isGroupMatch ? g.departments : matchedDepts,
      };
    }).filter((g) => g.departments.length > 0);
  }, [unifiedGroups, search]);

  const filteredDeptBreakdown = useMemo(() => {
    if (!search) return departmentBreakdown;
    const s = search.toLowerCase();
    return departmentBreakdown.filter(
      (d) =>
        d.name.toLowerCase().includes(s) ||
        d.code.toLowerCase().includes(s) ||
        (d.description && d.description.toLowerCase().includes(s))
    );
  }, [departmentBreakdown, search]);

  const getDeptIcon = (name: string) => {
    const n = name.toUpperCase();
    if (n.includes("CALL") && !n.includes("ADMIN")) return "🎧";
    if (n.includes("ADMIN") || n.includes("CCAD")) return "📑";
    if (n.includes("MARKET") || n.includes("MKT")) return "📢";
    if (n.includes("SALE") && !n.includes("CLOSE")) return "💰";
    if (n.includes("WITHDRAW")) return "💳";
    if (n.includes("CR") || n.includes("TELE")) return "📞";
    if (n.includes("QA")) return "🎯";
    if (n.includes("CLOSE")) return "🤝";
    if (n.includes("HEAD")) return "👑";
    if (n.includes("SUPER")) return "⭐";
    return "🏢";
  };

  const getPositionBadge = (pos: string | null) => {
    if (!pos) return { label: "พนักงาน", color: "bg-slate-700 text-slate-200" };
    const p = pos.toUpperCase();
    if (p.startsWith("SUPER") && !p.includes("SUPPORT")) return { label: "Super", color: "bg-blue-600/20 text-blue-300 border border-blue-500/30" };
    if (p.includes("SUPPORT.SUPER") || p.includes("SUPPORT SUPER") || p.includes("SUP.SUPER")) return { label: "S.Super", color: "bg-cyan-600/20 text-cyan-300 border border-cyan-500/30" };
    if (p.includes("SUPPORT.H") || p.includes("SUP.H") || p.includes("SUPPORT H")) return { label: "S.Head", color: "bg-teal-600/20 text-teal-300 border border-teal-500/30" };
    if (p.startsWith("H ") || p.startsWith("H.") || p.startsWith("H CC") || p.startsWith("H CR") || p.startsWith("H SP") || p.startsWith("H MKT") || p.startsWith("H CALL") || (p.length < 14 && p.startsWith("H") && !p.includes("HRD"))) return { label: "Head", color: "bg-purple-600/20 text-purple-300 border border-purple-500/30" };
    if (p === "HRD") return { label: "HRD", color: "bg-amber-600/20 text-amber-300 border border-amber-500/30" };
    return { label: "Staff", color: "bg-slate-700/50 text-slate-300" };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header with View Toggle & Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              จัดการทีมและแผนก (Teams & Departments)
            </h1>
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-primary/10 text-primary border border-primary/20">
              3 ทีมหลัก • {departments.length} แผนก • รวม {totalEmployeesAll} คน
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            โครงสร้างหลัก 3 ทีม (Team A, Team B, Team C) โดยแต่ละทีมประกอบด้วย {departments.length} แผนกงาน
          </p>
        </div>

        {/* Action buttons & View Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View switcher */}
          <div className="bg-card border border-border p-1 rounded-xl flex items-center shadow-sm">
            <button
              onClick={() => setViewMode("teams")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "teams"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>🗂️</span> มุมมอง 3 ทีมหลัก
            </button>
            <button
              onClick={() => setViewMode("departments")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "departments"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>🏢</span> มุมมองรายแผนก
            </button>
          </div>

          {/* Add Dept button */}
          <button
            onClick={handleOpenAddDept}
            className="px-3.5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span>+</span> เพิ่มแผนกใหม่
          </button>

          {/* Add Team button */}
          <button
            onClick={handleOpenAddTeam}
            className="px-3.5 py-2 bg-secondary text-secondary-foreground text-xs font-bold rounded-xl hover:bg-secondary/80 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span>+</span> เพิ่มทีมย่อย
          </button>
        </div>
      </div>

      {/* Overview Stat Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <div className="bg-card p-4 rounded-2xl border border-border flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">พนักงานทั้งหมด</p>
            <p className="text-2xl font-black text-foreground mt-0.5">{totalEmployeesAll} <span className="text-xs font-normal text-muted-foreground">คน</span></p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg">
            👥
          </div>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">แผนกทั้งหมด</p>
            <p className="text-2xl font-black text-foreground mt-0.5">{departments.length} <span className="text-xs font-normal text-muted-foreground">แผนก</span></p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-lg">
            🏢
          </div>
        </div>

        {unifiedGroups.map((g) => (
          <div key={g.key} className="bg-card p-4 rounded-2xl border border-border flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{g.name}</p>
              <p className="text-2xl font-black text-foreground mt-0.5">
                {g.totalEmployees} <span className="text-xs font-normal text-muted-foreground">คน ({g.departments.length} แผนก)</span>
              </p>
            </div>
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-sm font-black ${g.colorTheme.badge}`}>
              {g.badgeLetter}
            </div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="bg-card p-3 rounded-xl border border-border flex items-center gap-3">
        <span className="text-muted-foreground text-sm ml-2">🔍</span>
        <input
          type="text"
          placeholder="ค้นหาแผนก, รหัสทีม, หรือชื่อพนักงาน..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent border-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1">
            ล้างคำค้น
          </button>
        )}
      </div>

      {/* VIEW 1: 3 MAIN TEAMS VIEW */}
      {viewMode === "teams" && (
        <div className={`flex gap-5 transition-all ${selectedDeptGroup ? "flex-row" : ""}`}>
          {/* Teams Grid */}
          <div className={`transition-all ${selectedDeptGroup ? "w-[55%] min-w-0" : "w-full"}`}>
            {loading ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                กำลังโหลดข้อมูลทีมและแผนก...
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-border">
                ไม่พบข้อมูลทีมตามเงื่อนไขที่เลือก
              </div>
            ) : (
              <div className={`grid gap-5 ${selectedDeptGroup ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3"}`}>
                {filteredGroups.map((group) => (
                  <div
                    key={group.key}
                    className={`bg-card rounded-2xl border p-5 shadow-sm space-y-4 transition-all flex flex-col justify-between ${
                      selectedDeptGroup?.title.includes(group.name)
                        ? "border-primary shadow-primary/20 shadow-md"
                        : group.colorTheme.border
                    }`}
                  >
                    {/* Team Card Header */}
                    <div>
                      <div className={`p-4 rounded-xl bg-gradient-to-r ${group.colorTheme.bg} border border-border/60 mb-4 flex items-center justify-between`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center text-lg font-black shadow-sm ${group.colorTheme.badge}`}>
                            {group.badgeLetter}
                          </div>
                          <div>
                            <h2 className="font-extrabold text-foreground text-lg leading-tight">{group.name}</h2>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                              <span className="font-mono font-bold text-primary">{group.code}</span>
                              <span>•</span>
                              <span>{group.departments.length} แผนก</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block">รวมพนักงาน</span>
                          <span className={`text-xl font-black ${group.colorTheme.text}`}>{group.totalEmployees} คน</span>
                        </div>
                      </div>

                      {/* Department rows — clickable */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 mb-1">
                          <span>{group.departments.length} แผนกใน {group.name}</span>
                          <span>พนักงาน</span>
                        </div>

                        {group.departments.map((dept) => {
                          const isSelected = selectedDeptGroup?.teamId === dept.teamId;
                          return (
                            <div key={dept.teamId} className="group/row flex items-center gap-1">
                              <button
                                onClick={() => handleClickTeamDept(dept, group.name)}
                                className={`flex-1 flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all text-left ${
                                  isSelected
                                    ? "border-primary bg-primary/15 shadow-sm"
                                    : "border-border/70 bg-muted/40 hover:bg-muted/80 hover:border-primary/40"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="text-base flex-shrink-0">{getDeptIcon(dept.deptName)}</span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-foreground truncate">{dept.deptName}</span>
                                      <span className="text-[10px] text-muted-foreground font-mono">({dept.teamCode})</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2.5 py-0.5 rounded-lg font-bold text-xs ${isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                                    {dept.employeeCount} คน
                                  </span>
                                  <span className={`text-[10px] font-semibold transition-opacity ${isSelected ? "text-primary opacity-100" : "text-muted-foreground opacity-0 group-hover/row:opacity-100"}`}>
                                    {isSelected ? "▶ เปิดอยู่" : "ดูรายชื่อ →"}
                                  </span>
                                </div>
                              </button>

                              {/* Edit team button */}
                              <button
                                onClick={() => handleOpenEditTeam(dept.rawTeam)}
                                title="แก้ไขทีมย่อย"
                                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-transparent hover:border-border text-xs"
                              >
                                ✏️
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Team Card Footer */}
                    <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        สัดส่วน: {totalEmployeesAll > 0 ? ((group.totalEmployees / totalEmployeesAll) * 100).toFixed(1) : 0}% ของบริษัท
                      </span>
                      <Link
                        href={`/employees?mainTeam=${group.code}`}
                        className={`font-semibold hover:underline flex items-center gap-1 ${group.colorTheme.text}`}
                      >
                        ดูพนักงานทั้งทีม ({group.totalEmployees} คน) →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Employee List Side Panel */}
          {selectedDeptGroup && (
            <div className="flex-1 min-w-0 bg-card border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden" style={{ maxHeight: "calc(100vh - 180px)", minHeight: "450px" }}>
              {/* Panel Header */}
              <div className="p-4 border-b border-border bg-muted/50 flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                    <span>{getDeptIcon(selectedDeptGroup.title)}</span>
                    {selectedDeptGroup.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedDeptGroup.subtitle} • {empLoading ? "กำลังโหลด..." : `พนักงาน ${employees.length} คน`}
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedDeptGroup(null); setEmployees([]); }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Employee List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {empLoading ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                    <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mr-2" />
                    กำลังโหลดรายชื่อพนักงาน...
                  </div>
                ) : employees.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground text-sm">
                    ไม่มีพนักงานในแผนก/ทีมนี้
                  </div>
                ) : (
                  employees.map((emp, i) => {
                    const badge = getPositionBadge(emp.position);
                    return (
                      <div
                        key={emp.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/70 hover:border-primary/40 hover:bg-muted/70 transition-all"
                      >
                        {/* Number avatar */}
                        <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary flex-shrink-0">
                          {i + 1}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link href={`/employees/${emp.id}`} className="font-bold text-foreground text-sm hover:underline truncate">
                              {emp.name}
                            </Link>
                            {emp.nickname && (
                              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                ({emp.nickname})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-muted-foreground">
                            <span className="font-mono text-primary">{emp.employeeCode}</span>
                            {emp.position && (
                              <span className="text-slate-300 truncate max-w-[150px]">{emp.position}</span>
                            )}
                          </div>
                        </div>
                        {/* Badge */}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Panel Footer */}
              {employees.length > 0 && (
                <div className="p-3 border-t border-border flex-shrink-0">
                  <Link
                    href={`/employees?departmentId=${selectedDeptGroup.deptId || ""}`}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors border border-primary/20"
                  >
                    เปิดดูในหน้ารายชื่อพนักงาน →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: ALL DEPARTMENTS TABLE & BREAKDOWN VIEW */}
      {viewMode === "departments" && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>แผนก</th>
                  <th>รหัสแผนก</th>
                  <th>คำอธิบาย</th>
                  <th className="text-center">ทีม A (Team A)</th>
                  <th className="text-center">ทีม B (Team B)</th>
                  <th className="text-center">ทีม C (Team C)</th>
                  <th className="text-center">รวมพนักงาน</th>
                  <th>สถานะ</th>
                  <th className="text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                      กำลังโหลดข้อมูลแผนก...
                    </td>
                  </tr>
                ) : filteredDeptBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                      ไม่พบข้อมูลแผนก
                    </td>
                  </tr>
                ) : (
                  filteredDeptBreakdown.map((dept) => (
                    <tr key={dept.id} className="hover:bg-muted/40 transition-colors">
                      <td>
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{getDeptIcon(dept.name)}</span>
                          <div>
                            <button
                              onClick={() => handleClickWholeDept(dept)}
                              className="font-bold text-foreground hover:text-primary transition-colors text-left"
                            >
                              {dept.name}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                          {dept.code}
                        </span>
                      </td>
                      <td className="text-xs text-muted-foreground max-w-xs truncate">
                        {dept.description || "-"}
                      </td>
                      <td className="text-center">
                        <button
                          onClick={() => dept.teamAObj && handleClickTeamDept({
                            teamId: dept.teamAObj.id,
                            teamName: dept.teamAObj.name,
                            teamCode: dept.teamAObj.code,
                            deptId: dept.id,
                            deptName: dept.name,
                            deptCode: dept.code,
                            employeeCount: dept.countA,
                            description: dept.teamAObj.description,
                            rawTeam: dept.teamAObj,
                          }, "ทีม A")}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20"
                        >
                          {dept.countA} คน
                        </button>
                      </td>
                      <td className="text-center">
                        <button
                          onClick={() => dept.teamBObj && handleClickTeamDept({
                            teamId: dept.teamBObj.id,
                            teamName: dept.teamBObj.name,
                            teamCode: dept.teamBObj.code,
                            deptId: dept.id,
                            deptName: dept.name,
                            deptCode: dept.code,
                            employeeCount: dept.countB,
                            description: dept.teamBObj.description,
                            rawTeam: dept.teamBObj,
                          }, "ทีม B")}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20"
                        >
                          {dept.countB} คน
                        </button>
                      </td>
                      <td className="text-center">
                        <button
                          onClick={() => dept.teamCObj && handleClickTeamDept({
                            teamId: dept.teamCObj.id,
                            teamName: dept.teamCObj.name,
                            teamCode: dept.teamCObj.code,
                            deptId: dept.id,
                            deptName: dept.name,
                            deptCode: dept.code,
                            employeeCount: dept.countC,
                            description: dept.teamCObj.description,
                            rawTeam: dept.teamCObj,
                          }, "ทีม C")}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                        >
                          {dept.countC} คน
                        </button>
                      </td>
                      <td className="text-center font-black text-foreground text-sm">
                        {dept.totalCount} คน
                      </td>
                      <td>
                        <span className={dept.isActive ? "badge-active" : "badge-inactive"}>
                          {dept.isActive ? "เปิดใช้งาน" : "ปิด"}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleClickWholeDept(dept)}
                            className="px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg"
                          >
                            ดูรายชื่อ
                          </button>
                          <button
                            onClick={() => handleOpenEditDept(dept)}
                            className="px-2.5 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/10 rounded-lg"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => handleDeleteDept(dept)}
                            className="px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg"
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
      )}

      {/* Add / Edit Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground">
                {editingDept ? `แก้ไขแผนก: ${editingDept.name}` : "เพิ่มแผนกใหม่"}
              </h2>
              <button onClick={() => setShowDeptModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            {deptError && (
              <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20">{deptError}</div>
            )}
            <form onSubmit={handleSaveDept} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">ชื่อแผนก *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น Marketing, CallCenter"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">รหัสแผนก (Code) *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น MKT, CC, SALES"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">คำอธิบาย</label>
                <textarea
                  rows={2}
                  placeholder="รายละเอียดแผนก..."
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-muted"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={deptSubmitting}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {deptSubmitting ? "กำลังบันทึก..." : "บันทึกแผนก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Sub-Team Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground">
                {editingTeam ? `แก้ไขทีมย่อย: ${editingTeam.name}` : "เพิ่มทีมย่อยใหม่"}
              </h2>
              <button onClick={() => setShowTeamModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            {teamError && (
              <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20">{teamError}</div>
            )}
            <form onSubmit={handleSaveTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">ชื่อทีมย่อย *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น MKT Team A, Super B"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">รหัสทีมย่อย (Code) *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น MKT_TEAM_A, SUPER_B"
                  value={teamForm.code}
                  onChange={(e) => setTeamForm({ ...teamForm, code: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">แผนกที่สังกัด *</label>
                <select
                  required
                  value={teamForm.departmentId}
                  onChange={(e) => setTeamForm({ ...teamForm, departmentId: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm"
                >
                  <option value="">เลือกแผนก</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">คำอธิบาย</label>
                <textarea
                  rows={2}
                  value={teamForm.description}
                  onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm"
                />
              </div>
              <div className="pt-3 flex items-center justify-between gap-2 border-t border-border">
                {editingTeam ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteTeam(editingTeam)}
                    disabled={teamSubmitting}
                    className="px-3.5 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-colors disabled:opacity-50"
                  >
                    🗑️ ลบทีมย่อยนี้
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTeamModal(false)}
                    className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-muted"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={teamSubmitting}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    {teamSubmitting ? "กำลังบันทึก..." : "บันทึกทีม"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
