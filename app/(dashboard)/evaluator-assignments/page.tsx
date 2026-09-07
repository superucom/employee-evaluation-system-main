"use client";

import { useState, useEffect, useMemo } from "react";
import { getMainTeamName, extractNickname } from "@/lib/utils";

interface EvaluatorAssignment {
  id: string;
  assignmentType: "EMPLOYEE" | "DEPARTMENT" | "TEAM";
  source?: "AUTO" | "MANUAL" | "LEGACY";
  weightPoints?: number | null;
  weightPercentage: number;
  isActive: boolean;
  evaluatorUser: { id: string; fullName: string; username: string };
  targetEmployee: { id: string; name: string; nickname: string | null; employeeCode: string } | null;
  targetDepartment: { id: string; name: string } | null;
  targetTeam: {
    id: string;
    name: string;
    code?: string;
    department?: { id: string; name: string; code?: string };
  } | null;
  period: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
}

interface User {
  id: string;
  fullName: string;
  username: string;
}

interface Employee {
  id: string;
  name: string;
  nickname: string | null;
  employeeCode: string;
  position: string | null;
}

interface Department {
  id: string;
  name: string;
  code: string;
  teams: { id: string; name: string }[];
}

interface EvaluationPeriod {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

// Weight presets aligned with org chart (base = 15 pts)
const COMMON_WEIGHT_PRESETS = [
  { label: "Super → SupportSuper: 15/15 (100%)", value: 100,   desc: "Super ประเมิน SupportSuper" },
  { label: "Super → Head: 10/15 (66.7%)",        value: 66.67, desc: "Super ประเมิน Head" },
  { label: "Super → SHead/Staff: 5/15 (33.3%)",  value: 33.33, desc: "Super ประเมิน SHead / พนักงาน" },
  { label: "SSuper → Head: 5/15 (33.3%)",        value: 33.33, desc: "SupportSuper ประเมิน Head" },
  { label: "SSuper → SHead/Staff: 2.5/15 (16.7%)", value: 16.67, desc: "SupportSuper ประเมิน SHead / พนักงาน" },
  { label: "Head → SHead: 7.5/15 (50.0%)",       value: 50.0,  desc: "Head ประเมิน SupportHead" },
  { label: "Head → Staff (มี SHead): 6.25/15 (41.7%)", value: 41.67, desc: "Head ประเมิน พนักงาน (CC/CCAD/CS/MKT/WD)" },
  { label: "Head → Staff (ไม่มี SHead): 7.5/15 (50%)", value: 50.0, desc: "Head ประเมิน พนักงาน (CR/SALES/QA)" },
  { label: "SHead → Staff: 1.25/15 (8.3%)",      value: 8.33,  desc: "SupportHead ประเมิน พนักงาน" },
];

export default function EvaluatorAssignmentsPage() {
  const [assignments, setAssignments] = useState<EvaluatorAssignment[]>([]);
  const [evaluators, setEvaluators] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [periods, setPeriods] = useState<EvaluationPeriod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Manual Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    evaluatorUserId: "",
    assignmentType: "TEAM" as "EMPLOYEE" | "DEPARTMENT" | "TEAM",
    targetEmployeeId: "",
    targetDepartmentId: "",
    targetMainTeam: "TEAM_A",
    excludedDepartmentIds: [] as string[],
    targetTeamId: "",
    specifySubTeam: false,
    periodId: "",
    categoryId: "",
    weightPercentage: 100,
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEvaluatorId, setFilterEvaluatorId] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterCategoryId, setFilterCategoryId] = useState("");

  // One-Click Preset Package Modal
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [packageData, setPackageData] = useState({
    evaluatorUserId: "",
    targetMainTeam: "TEAM_A",
    packageType: "SUPER" as "SUPER" | "SUPPORT_SUPER" | "HEAD" | "SUPPORT_HEAD",
    targetDeptId: "",
  });
  const [packageSubmitting, setPackageSubmitting] = useState(false);
  const [packageError, setPackageError] = useState("");

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/evaluator-assignments");
      const data = await res.json();
      if (res.ok) setAssignments(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/evaluator-assignments/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "ไม่สามารถ Sync สิทธิ์ได้");
        return;
      }
      alert(`สร้างสิทธิ์การประเมินอัตโนมัติแล้ว ${data.count || 0} รายการ`);
      await fetchAssignments();
    } catch {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSyncing(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [usersRes, empRes, deptRes, periodRes, catRes] = await Promise.all([
        fetch("/api/users?limit=200"),
        fetch("/api/employees?limit=200"),
        fetch("/api/departments?includeTeams=true"),
        fetch("/api/evaluation-periods"),
        fetch("/api/evaluation-categories"),
      ]);

      const [usersData, empData, deptData, periodData, catData] = await Promise.all([
        usersRes.json(),
        empRes.json(),
        deptRes.json(),
        periodRes.json(),
        catRes.json(),
      ]);

      if (usersRes.ok) setEvaluators(usersData.data || []);
      if (empRes.ok) setEmployees(empData.data || []);
      if (deptRes.ok) setDepartments(deptData.data || []);
      if (periodRes.ok) setPeriods(periodData.data || []);
      if (catRes.ok) setCategories(catData.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAssignments();
    fetchDependencies();
  }, []);

  const handleToggleExcludeDept = (deptId: string) => {
    setFormData((prev) => {
      const exists = prev.excludedDepartmentIds.includes(deptId);
      return {
        ...prev,
        excludedDepartmentIds: exists
          ? prev.excludedDepartmentIds.filter((id) => id !== deptId)
          : [...prev.excludedDepartmentIds, deptId],
      };
    });
  };

  // Helper to find category ID by search query keyword
  const findCategory = (keyword: string): string => {
    const found = categories.find((c) => c.name.toLowerCase().includes(keyword.toLowerCase()));
    return found ? found.id : "";
  };

  // Quick Preset Handlers in Modal
  const applyQuickTarget = (type: "HEAD" | "QA_SUP" | "STAFF" | "ALL") => {
    const headCatId = findCategory("head");
    const staffCatId = findCategory("พนักงาน");

    if (type === "HEAD") {
      // Only Head: exclude everything except Head
      const excluded = departments.filter((d) => !d.name.toUpperCase().includes("HEAD") || d.name.toUpperCase().includes("SUPPORT")).map((d) => d.id);
      setFormData((prev) => ({
        ...prev,
        excludedDepartmentIds: excluded,
        categoryId: headCatId || prev.categoryId,
        weightPercentage: 66.67,
      }));
    } else if (type === "QA_SUP") {
      // Only QA and Support Head: exclude everything else
      const excluded = departments.filter((d) => {
        const n = d.name.toUpperCase();
        return !n.includes("QA") && !n.includes("SUPPORT HEAD");
      }).map((d) => d.id);
      setFormData((prev) => ({
        ...prev,
        excludedDepartmentIds: excluded,
        categoryId: headCatId || prev.categoryId,
        weightPercentage: 33.33,
      }));
    } else if (type === "STAFF") {
      // General staff 7 depts: exclude Head, QA, Super, Support Head
      const excluded = departments.filter((d) => {
        const n = d.name.toUpperCase();
        return (n === "HEAD" || n.includes("HEAD") || n.includes("QA") || n.includes("SUPER") || n.includes("SUPPORT HEAD")) && !n.includes("CALL") && !n.includes("CLOSE");
      }).map((d) => d.id);
      setFormData((prev) => ({
        ...prev,
        excludedDepartmentIds: excluded,
        categoryId: staffCatId || prev.categoryId,
        weightPercentage: 33.33,
      }));
    } else if (type === "ALL") {
      setFormData((prev) => ({
        ...prev,
        excludedDepartmentIds: [],
        weightPercentage: 100,
      }));
    }
  };

  // One-click Package Submit (all 4 role types)
  const handlePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPackageSubmitting(true);
    setPackageError("");

    try {
      const headCatId = findCategory("head");
      const staffCatId = findCategory("พนักงาน");

      // Helper: exclude all depts EXCEPT those matching codes
      const excludeExcept = (keepCodes: string[]) =>
        departments.filter((d) => !keepCodes.includes(d.code)).map((d) => d.id);

      // Groups for TEAM-based assignments
      const headDepts = ["CC", "CCAD", "CS", "MKT", "SALES", "QA", "WITHDRAW", "CR"]; // all non-super
      const sheadDepts  = ["CC", "CCAD", "CS", "MKT", "WITHDRAW"]; // depts with SHead
      const noSheadDepts = ["CR", "SALES", "QA"];

      let items: any[] = [];

      if (packageData.packageType === "SUPER") {
        // Super evaluates:
        // SupportSuper employees (SUPER dept) @ 100% (15 pts)
        // Head employees (all team non-super depts) @ 66.7% (10 pts)
        // SHead employees (CC,CCAD,CS,MKT,WD) @ 33.3% (5 pts)
        // Regular staff (all) @ 33.3% (5 pts)
        items = [
          // All non-super employees @ 5 pts
          { evaluatorUserId: packageData.evaluatorUserId, assignmentType: "TEAM",
            targetMainTeam: packageData.targetMainTeam,
            excludedDepartmentIds: excludeExcept(headDepts),
            categoryId: staffCatId || null, periodId: null, weightPercentage: 33.33 },
          // Dedicated: SHead depts (use Head category, same weight 5pts)
          { evaluatorUserId: packageData.evaluatorUserId, assignmentType: "TEAM",
            targetMainTeam: packageData.targetMainTeam,
            excludedDepartmentIds: excludeExcept(sheadDepts),
            categoryId: headCatId || null, periodId: null, weightPercentage: 33.33 },
          // QA dept - head category @ 5 pts
          { evaluatorUserId: packageData.evaluatorUserId, assignmentType: "TEAM",
            targetMainTeam: packageData.targetMainTeam,
            excludedDepartmentIds: excludeExcept(["QA"]),
            categoryId: headCatId || null, periodId: null, weightPercentage: 33.33 },
        ];
      } else if (packageData.packageType === "SUPPORT_SUPER") {
        // SupportSuper evaluates everyone EXCEPT Super dept
        // Head @ 5 pts, SHead @ 2.5 pts, Staff @ 2.5 pts
        items = [
          // All non-super staff @ 2.5 pts
          { evaluatorUserId: packageData.evaluatorUserId, assignmentType: "TEAM",
            targetMainTeam: packageData.targetMainTeam,
            excludedDepartmentIds: excludeExcept(headDepts),
            categoryId: staffCatId || null, periodId: null, weightPercentage: 16.67 },
          // SHead depts - head category @ 2.5 pts
          { evaluatorUserId: packageData.evaluatorUserId, assignmentType: "TEAM",
            targetMainTeam: packageData.targetMainTeam,
            excludedDepartmentIds: excludeExcept(sheadDepts),
            categoryId: headCatId || null, periodId: null, weightPercentage: 16.67 },
          // QA dept @ 2.5 pts
          { evaluatorUserId: packageData.evaluatorUserId, assignmentType: "TEAM",
            targetMainTeam: packageData.targetMainTeam,
            excludedDepartmentIds: excludeExcept(["QA"]),
            categoryId: headCatId || null, periodId: null, weightPercentage: 16.67 },
        ];
      } else if (packageData.packageType === "HEAD") {
        // Head evaluates own team's staff
        // If dept has SHead: staff @ 6.25 pts, SHead @ 7.5 pts
        // If dept has no SHead: staff @ 7.5 pts
        if (!packageData.targetDeptId) {
          setPackageError("กรุณาเลือกแผนกที่ Head ดูแล");
          return;
        }
        const selectedDept = departments.find((d) => d.id === packageData.targetDeptId);
        const deptCode = selectedDept?.code || "";
        const deptHasSHead = sheadDepts.includes(deptCode);
        const empWeight = deptHasSHead ? 41.67 : 50.0; // 6.25 or 7.5 pts
        items = [
          { evaluatorUserId: packageData.evaluatorUserId, assignmentType: "DEPARTMENT",
            targetDepartmentId: packageData.targetDeptId,
            categoryId: deptCode === "QA" ? headCatId || null : staffCatId || null,
            periodId: null, weightPercentage: empWeight },
          ...(deptHasSHead ? [{
            evaluatorUserId: packageData.evaluatorUserId, assignmentType: "DEPARTMENT",
            targetDepartmentId: packageData.targetDeptId,
            categoryId: headCatId || null, periodId: null, weightPercentage: 50.0,
          }] : []),
        ];
      } else if (packageData.packageType === "SUPPORT_HEAD") {
        // SupportHead evaluates own dept staff @ 1.25 pts
        if (!packageData.targetDeptId) {
          setPackageError("กรุณาเลือกแผนกที่ Support Head ดูแล");
          return;
        }
        items = [
          { evaluatorUserId: packageData.evaluatorUserId, assignmentType: "DEPARTMENT",
            targetDepartmentId: packageData.targetDeptId,
            categoryId: staffCatId || null, periodId: null, weightPercentage: 8.33 },
        ];
      }

      for (const item of items) {
        const res = await fetch("/api/evaluator-assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        if (!res.ok) {
          const errData = await res.json();
          setPackageError(errData.error || "เกิดข้อผิดพลาดในการบันทึก");
          return;
        }
      }

      setShowPackageModal(false);
      fetchAssignments();
    } catch {
      setPackageError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setPackageSubmitting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      const payload: any = {
        evaluatorUserId: formData.evaluatorUserId,
        assignmentType: formData.assignmentType,
        periodId: formData.periodId || null,
        categoryId: formData.categoryId || null,
        weightPercentage: Number(formData.weightPercentage),
      };

      if (formData.assignmentType === "EMPLOYEE") {
        payload.targetEmployeeId = formData.targetEmployeeId;
      } else if (formData.assignmentType === "DEPARTMENT") {
        payload.targetDepartmentId = formData.targetDepartmentId;
      } else if (formData.assignmentType === "TEAM") {
        if (formData.specifySubTeam && formData.targetTeamId) {
          payload.targetTeamId = formData.targetTeamId;
        } else {
          payload.targetMainTeam = formData.targetMainTeam;
          payload.excludedDepartmentIds = formData.excludedDepartmentIds;
        }
      }

      const res = await fetch("/api/evaluator-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "เกิดข้อผิดพลาดในการบันทึก");
        return;
      }

      setShowModal(false);
      fetchAssignments();
    } catch {
      setFormError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`คุณต้องการยกเลิกการมอบหมายนี้หรือไม่?`)) return;

    try {
      await Promise.all(
        ids.map((id) => fetch(`/api/evaluator-assignments/${id}`, { method: "DELETE" }))
      );
      fetchAssignments();
    } catch (err) {
      console.error(err);
    }
  };

  // Group assignments for display so whole-team assignments don't clutter the table into 10 separate rows
  const groupedAssignments = useMemo(() => {
    const map = new Map<string, {
      id: string;
      ids: string[];
      evaluatorUser: EvaluatorAssignment["evaluatorUser"];
      assignmentType: EvaluatorAssignment["assignmentType"];
      mainTeamName?: string;
      targetLabel: string;
      includedDeptsText?: string;
      deptCount?: number;
      targetBadgeStyle: string;
      category: EvaluatorAssignment["category"];
      period: EvaluatorAssignment["period"];
      source?: EvaluatorAssignment["source"];
      weightPercentage: number;
      includedDeptIds: Set<string>;
    }>();

    for (const a of assignments) {
      if (a.assignmentType === "TEAM" && a.targetTeam) {
        const mainTeamLabel = getMainTeamName(a.targetTeam);
        const groupKey = `TEAM_${a.evaluatorUser?.id}_${mainTeamLabel}_${a.period?.id || "ALL"}_${a.category?.id || "ALL"}_${a.weightPercentage}`;
        const deptId = a.targetTeam.department?.id;

        if (map.has(groupKey)) {
          const item = map.get(groupKey)!;
          item.ids.push(a.id);
          if (deptId) item.includedDeptIds.add(deptId);
        } else {
          let badgeStyle = "bg-blue-500/15 text-blue-400 border-blue-500/30";
          if (mainTeamLabel.includes("B")) badgeStyle = "bg-purple-500/15 text-purple-400 border-purple-500/30";
          if (mainTeamLabel.includes("C")) badgeStyle = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";

          const includedSet = new Set<string>();
          if (deptId) includedSet.add(deptId);

          map.set(groupKey, {
            id: a.id,
            ids: [a.id],
            evaluatorUser: a.evaluatorUser,
            assignmentType: "TEAM",
            mainTeamName: mainTeamLabel,
            targetLabel: `${mainTeamLabel}`,
            targetBadgeStyle: badgeStyle,
            category: a.category,
            period: a.period,
            source: a.source,
            weightPercentage: a.weightPercentage,
            includedDeptIds: includedSet,
          });
        }
      } else if (a.assignmentType === "DEPARTMENT" && a.targetDepartment) {
        const groupKey = `DEPT_${a.id}`;
        map.set(groupKey, {
          id: a.id,
          ids: [a.id],
          evaluatorUser: a.evaluatorUser,
          assignmentType: "DEPARTMENT",
          targetLabel: `แผนก: ${a.targetDepartment.name}`,
          targetBadgeStyle: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
          category: a.category,
          period: a.period,
          source: a.source,
          weightPercentage: a.weightPercentage,
          includedDeptIds: new Set(),
        });
      } else if (a.assignmentType === "EMPLOYEE" && a.targetEmployee) {
        const groupKey = `EMP_${a.id}`;
        map.set(groupKey, {
          id: a.id,
          ids: [a.id],
          evaluatorUser: a.evaluatorUser,
          assignmentType: "EMPLOYEE",
          targetLabel: `${[a.targetEmployee.name, a.targetEmployee.nickname].filter(Boolean).join(" ")} (${a.targetEmployee.employeeCode})`,
          targetBadgeStyle: "bg-amber-500/15 text-amber-400 border-amber-500/30",
          category: a.category,
          period: a.period,
          source: a.source,
          weightPercentage: a.weightPercentage,
          includedDeptIds: new Set(),
        });
      }
    }

    // Enrich team items with included dept info
    return Array.from(map.values()).map((item) => {
      if (item.assignmentType === "TEAM" && item.mainTeamName) {
        const totalDepts = departments.length || 10;
        const incCount = item.includedDeptIds.size || item.ids.length;

        if (incCount < totalDepts && departments.length > 0) {
          const included = departments.filter((d) => item.includedDeptIds.has(d.id));
          return {
            ...item,
            deptCount: incCount,
            targetLabel: `${item.mainTeamName} (${incCount} แผนก)`,
            includedDeptsText: included.map((d) => d.name).join(", "),
          };
        }
        return {
          ...item,
          deptCount: totalDepts,
          targetLabel: `ทั้ง${item.mainTeamName} (ครบทุกแผนก)`,
          includedDeptsText: "ทุกแผนกในทีมนี้",
        };
      }
      return item;
    });
  }, [assignments, departments]);

  const filteredGroupedAssignments = useMemo(() => {
    return groupedAssignments.filter((a) => {
      if (filterEvaluatorId && a.evaluatorUser.id !== filterEvaluatorId) {
        return false;
      }
      if (filterType !== "ALL" && a.assignmentType !== filterType) {
        return false;
      }
      if (filterCategoryId) {
        if (!a.category || a.category.id !== filterCategoryId) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const evalName = (a.evaluatorUser.fullName || "").toLowerCase();
        const evalUsername = (a.evaluatorUser.username || "").toLowerCase();
        const targetLabel = (a.targetLabel || "").toLowerCase();
        const includedDepts = (a.includedDeptsText || "").toLowerCase();
        const catName = (a.category?.name || "").toLowerCase();
        const periodName = (a.period?.name || "").toLowerCase();

        const isMatch =
          evalName.includes(q) ||
          evalUsername.includes(q) ||
          targetLabel.includes(q) ||
          includedDepts.includes(q) ||
          catName.includes(q) ||
          periodName.includes(q);

        if (!isMatch) return false;
      }
      return true;
    });
  }, [groupedAssignments, filterEvaluatorId, filterType, filterCategoryId, searchQuery]);

  const selectedDeptTeams = departments.find((d) => d.id === formData.targetDepartmentId)?.teams || [];

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

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">การมอบหมายผู้ประเมินและสัดส่วนคะแนน (Evaluator Assignments)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ระบบสร้างสิทธิ์จาก Role ทีม แผนก และกฎของรอบประเมินโดยอัตโนมัติ สามารถกด Sync เพื่อคำนวณใหม่
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleAutoSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-sm text-sm disabled:opacity-50"
          >
            <span>🔄</span> {syncing ? "กำลัง Sync..." : "Sync สิทธิ์อัตโนมัติ"}
          </button>

          {/* 1-Click Package Setup Button */}
          <button
            onClick={() => {
              setPackageData({
                evaluatorUserId: evaluators[0]?.id || "",
                targetMainTeam: "TEAM_A",
                packageType: "SUPER",
                targetDeptId: "",
              });
              setPackageError("");
              setShowPackageModal(true);
            }}
            className="hidden"
          >
            <span>⚡</span> มอบหมายชุดสิทธิ์มาตรฐาน
          </button>

          {/* Manual Add Button */}
          <button
            onClick={() => {
              setFormData({
                evaluatorUserId: evaluators[0]?.id || "",
                assignmentType: "TEAM",
                targetEmployeeId: employees[0]?.id || "",
                targetDepartmentId: departments[0]?.id || "",
                targetMainTeam: "TEAM_A",
                excludedDepartmentIds: [],
                targetTeamId: "",
                specifySubTeam: false,
                periodId: periods[0]?.id || "",
                categoryId: "",
                weightPercentage: 100,
              });
              setFormError("");
              setShowModal(true);
            }}
            className="hidden"
          >
            <span>+</span> กำหนดสิทธิ์แบบกำหนดเอง
          </button>
        </div>
      </div>

      {/* Quick reference matrix banner */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-border text-xs space-y-2">
        <div className="font-bold text-foreground flex items-center gap-2">
          <span>📊</span>
          <span>เกณฑ์สัดส่วนคะแนน 15 คะแนน (ตามแผนผังองค์กร):</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="font-bold text-amber-400">👑 SupportSuper:</span>
            <p className="text-slate-300 mt-0.5">Super <b>15</b> pts (100%)</p>
          </div>
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <span className="font-bold text-blue-400">🔵 Head:</span>
            <p className="text-slate-300 mt-0.5">Super <b>10</b> / S.Super <b>5</b></p>
          </div>
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <span className="font-bold text-purple-400">🛡️ SupportHead:</span>
            <p className="text-slate-300 mt-0.5">Super <b>5</b> / S.Super <b>2.5</b> / Head <b>7.5</b></p>
          </div>
          <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20">
            <span className="font-bold text-teal-400">👥 Staff (มี SHead):</span>
            <p className="text-slate-300 mt-0.5">Super <b>5</b> / S.Super <b>2.5</b> / Head <b>6.25</b> / SHead <b>1.25</b></p>
            <p className="text-slate-500 mt-0.5 text-[10px]">CC, CCAD, CS, MKT, WD</p>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="font-bold text-emerald-400">👤 Staff (ไม่มี SHead):</span>
            <p className="text-slate-300 mt-0.5">Super <b>5</b> / S.Super <b>2.5</b> / Head <b>7.5</b></p>
            <p className="text-slate-500 mt-0.5 text-[10px]">CR, SALES (SP), QA</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-card p-4 rounded-2xl border border-border space-y-3 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0 sm:min-w-[260px]">
            <input
              type="text"
              placeholder="🔍 ค้นหาชื่อผู้ประเมิน, @username, เป้าหมาย (ชื่อ/รหัส), แผนก, หรือหมวดหมู่..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-background border border-input rounded-xl text-sm font-medium focus:border-primary transition-colors"
            />
            <span className="absolute left-3 top-2.5 text-muted-foreground text-xs">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-xs text-muted-foreground hover:text-foreground font-bold p-1"
                title="ล้างคำค้นหา"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Filter Evaluator */}
            <select
              value={filterEvaluatorId}
              onChange={(e) => setFilterEvaluatorId(e.target.value)}
              className="px-3 py-2 bg-background border border-input rounded-xl text-xs font-semibold focus:border-primary max-w-[200px]"
            >
              <option value="">👤 ผู้ประเมินทั้งหมด</option>
              {evaluators.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.fullName} (@{ev.username})
                </option>
              ))}
            </select>

            {/* Filter Type */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-background border border-input rounded-xl text-xs font-semibold focus:border-primary"
            >
              <option value="ALL">🎯 ทุกประเภทการมอบหมาย</option>
              <option value="EMPLOYEE">👤 รายบุคคล (Employee)</option>
              <option value="TEAM">👥 ทั้งทีมหลัก (Main Team)</option>
              <option value="DEPARTMENT">🏢 ทั้งแผนก (Department)</option>
            </select>

            {/* Filter Category */}
            <select
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
              className="px-3 py-2 bg-background border border-input rounded-xl text-xs font-semibold focus:border-primary max-w-[180px]"
            >
              <option value="">📝 ทุกหมวดหมู่คำถาม</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Reset Button */}
            {(searchQuery || filterEvaluatorId || filterType !== "ALL" || filterCategoryId) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterEvaluatorId("");
                  setFilterType("ALL");
                  setFilterCategoryId("");
                }}
                className="px-3 py-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold transition-colors"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>

        {/* Count summary bar */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
          <span>
            แสดง <b className="text-primary font-bold">{filteredGroupedAssignments.length}</b> รายการ (จากทั้งหมด {groupedAssignments.length} กลุ่มสิทธิ์ / {assignments.length} สิทธิ์ย่อย)
          </span>
          {(searchQuery || filterEvaluatorId || filterType !== "ALL" || filterCategoryId) && (
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <span>⚡</span> กำลังใช้ตัวกรอง
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <table className="data-table">
          <thead>
            <tr>
              <th>ผู้ประเมิน (Evaluator)</th>
              <th>ประเภทการมอบหมาย</th>
              <th>เป้าหมายที่ถูกประเมิน (Target)</th>
              <th>หมวดหมู่คำถาม (Category)</th>
              <th>รอบการประเมิน</th>
              <th>น้ำหนักคะแนน (จาก 15)</th>
              <th className="text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  กำลังโหลดข้อมูลการมอบหมาย...
                </td>
              </tr>
            ) : filteredGroupedAssignments.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  {searchQuery || filterEvaluatorId || filterType !== "ALL" || filterCategoryId
                    ? "ไม่พบข้อมูลการมอบหมายตามเงื่อนไขที่ค้นหา"
                    : "ยังไม่มีการมอบหมายผู้ประเมิน"}
                </td>
              </tr>
            ) : (
              filteredGroupedAssignments.map((a) => (
                <tr key={a.id} className="hover:bg-muted/40 transition-colors">
                  <td>
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      {a.evaluatorUser.fullName}
                      {extractNickname(a.evaluatorUser.fullName) && (
                        <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">
                          {extractNickname(a.evaluatorUser.fullName)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>@{a.evaluatorUser.username}</span>
                      {a.source === "AUTO" && <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">AUTO</span>}
                    </div>
                  </td>
                  <td>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-muted text-foreground">
                      {a.assignmentType === "EMPLOYEE" && "รายบุคคล (Employee)"}
                      {a.assignmentType === "DEPARTMENT" && "ทั้งแผนก (Department)"}
                      {a.assignmentType === "TEAM" && "ทั้งทีมหลัก (Main Team)"}
                    </span>
                  </td>
                  <td className="font-medium text-foreground">
                    <div className="space-y-1.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${a.targetBadgeStyle}`}>
                        {a.targetLabel}
                      </span>
                      {a.includedDeptsText && (
                        <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold">🎯 แผนกที่ประเมิน:</span>
                          <span className="text-slate-300 font-normal">{a.includedDeptsText}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    {a.category ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                        <span>📝</span> {a.category.name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        อัตโนมัติตามตำแหน่ง
                      </span>
                    )}
                  </td>
                  <td className="text-sm text-muted-foreground">{a.period?.name || "ทุกรอบ"}</td>
                  <td>
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-black text-primary text-base">
                        {(Number(a.weightPercentage) / 100 * 15 % 1 === 0
                          ? (Number(a.weightPercentage) / 100 * 15).toFixed(0)
                          : (Number(a.weightPercentage) / 100 * 15).toFixed(1)
                        )} <span className="text-sm font-semibold text-muted-foreground">/ 15 คะแนน</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        ({Number(a.weightPercentage).toFixed(1)}%)
                      </span>
                    </div>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => handleDelete(a.ids)}
                      className="px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      ยกเลิก
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ONE-CLICK PACKAGE MODAL - UPDATED */}
      {showPackageModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl p-6 space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>⚡</span> มอบหมายชุดสิทธิ์มาตรฐาน (1-Click Package)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  สร้างชุดการมอบหมายพร้อมน้ำหนักคะแนนตามโครงสร้างองค์กร ครอบคลุมทุกรอบ (ไม่จำกัดรอบ)
                </p>
              </div>
              <button onClick={() => setShowPackageModal(false)} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
            </div>

            {packageError && (
              <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20">
                {packageError}
              </div>
            )}

            <form onSubmit={handlePackageSubmit} className="space-y-5">
              {/* Evaluator */}
              <div>
                <label className="block text-sm font-bold mb-1 text-foreground">เลือกผู้ประเมิน (Evaluator) *</label>
                <select
                  required
                  value={packageData.evaluatorUserId}
                  onChange={(e) => setPackageData({ ...packageData, evaluatorUserId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm font-semibold"
                >
                  <option value="">เลือกผู้ประเมิน</option>
                  {evaluators.map((u) => {
                    const nick = extractNickname(u.fullName);
                    return (
                      <option key={u.id} value={u.id}>
                        {u.fullName}{nick ? ` ("${nick}")` : ""} — @{u.username}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Package Role Cards (4 types) */}
              <div>
                <label className="block text-sm font-bold mb-2 text-foreground">เลือกบทบาทผู้ประเมิน (Role Template) *</label>
                <div className="grid grid-cols-2 gap-3">

                  {/* SUPER */}
                  <div onClick={() => setPackageData({ ...packageData, packageType: "SUPER" })}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      packageData.packageType === "SUPER" ? "border-amber-500 bg-amber-500/10" : "border-border bg-background hover:bg-muted/50"
                    }`}>
                    <div className="font-extrabold text-sm text-foreground flex items-center gap-1.5">👑 Super</div>
                    <div className="mt-2 text-[11px] space-y-0.5 text-slate-300">
                      <div>• SupportSuper: <b>15 pts</b> (100%)</div>
                      <div>• Head: <b>10 pts</b> (66.7%)</div>
                      <div>• SHead / Staff: <b>5 pts</b> (33.3%)</div>
                    </div>
                  </div>

                  {/* SUPPORT SUPER */}
                  <div onClick={() => setPackageData({ ...packageData, packageType: "SUPPORT_SUPER" })}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      packageData.packageType === "SUPPORT_SUPER" ? "border-orange-500 bg-orange-500/10" : "border-border bg-background hover:bg-muted/50"
                    }`}>
                    <div className="font-extrabold text-sm text-foreground flex items-center gap-1.5">🛡️ Support Super</div>
                    <div className="mt-2 text-[11px] space-y-0.5 text-slate-300">
                      <div>• Head: <b>5 pts</b> (33.3%)</div>
                      <div>• SHead / QA / Staff: <b>2.5 pts</b> (16.7%)</div>
                      <div className="text-slate-500">ไม่ประเมิน Super</div>
                    </div>
                  </div>

                  {/* HEAD */}
                  <div onClick={() => setPackageData({ ...packageData, packageType: "HEAD" })}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      packageData.packageType === "HEAD" ? "border-blue-500 bg-blue-500/10" : "border-border bg-background hover:bg-muted/50"
                    }`}>
                    <div className="font-extrabold text-sm text-foreground flex items-center gap-1.5">🔵 Head</div>
                    <div className="mt-2 text-[11px] space-y-0.5 text-slate-300">
                      <div>• SupportHead: <b>7.5 pts</b> (50%)</div>
                      <div>• Staff (มี SHead): <b>6.25 pts</b> (41.7%)</div>
                      <div>• Staff (ไม่มี SHead): <b>7.5 pts</b> (50%)</div>
                    </div>
                  </div>

                  {/* SUPPORT HEAD */}
                  <div onClick={() => setPackageData({ ...packageData, packageType: "SUPPORT_HEAD" })}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      packageData.packageType === "SUPPORT_HEAD" ? "border-emerald-500 bg-emerald-500/10" : "border-border bg-background hover:bg-muted/50"
                    }`}>
                    <div className="font-extrabold text-sm text-foreground flex items-center gap-1.5">🟢 Support Head</div>
                    <div className="mt-2 text-[11px] space-y-0.5 text-slate-300">
                      <div>• พนักงานในแผนก: <b>1.25 pts</b> (8.3%)</div>
                      <div className="text-slate-500">เฉพาะแผนก CC, CCAD, CS, MKT, WD</div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Team selection - only for Super/SSuper */}
              {(packageData.packageType === "SUPER" || packageData.packageType === "SUPPORT_SUPER") && (
                <div>
                  <label className="block text-sm font-bold mb-1 text-foreground">ทีมหลักที่ดูแล *</label>
                  <select
                    required
                    value={packageData.targetMainTeam}
                    onChange={(e) => setPackageData({ ...packageData, targetMainTeam: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm font-bold text-primary"
                  >
                    <option value="TEAM_A">🔵 ทีม A</option>
                    <option value="TEAM_B">🟣 ทีม B</option>
                    <option value="TEAM_C">🟢 ทีม C</option>
                  </select>
                </div>
              )}

              {/* Dept selection - only for Head/SupportHead */}
              {(packageData.packageType === "HEAD" || packageData.packageType === "SUPPORT_HEAD") && (
                <div>
                  <label className="block text-sm font-bold mb-1 text-foreground">แผนกที่ดูแล *</label>
                  <select
                    required
                    value={packageData.targetDeptId}
                    onChange={(e) => setPackageData({ ...packageData, targetDeptId: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm font-semibold"
                  >
                    <option value="">เลือกแผนก</option>
                    {departments
                      .filter((d) => packageData.packageType === "HEAD"
                        ? !["SUPER"].includes(d.code)
                        : ["CC", "CCAD", "CS", "MKT", "WITHDRAW"].includes(d.code)
                      )
                      .map((d) => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                  </select>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-900 border border-border text-xs text-slate-300 flex items-center gap-2">
                <span>💡</span>
                <span>Assignments ทั้งหมดจะครอบคลุม <b>ทุกรอบประเมิน รวมถึงรอบในอนาคต</b> (periodId = ไม่จำกัด)</span>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border">
                <button type="button" onClick={() => setShowPackageModal(false)}
                  className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-muted">ยกเลิก</button>
                <button type="submit" disabled={packageSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-bold hover:from-amber-600 hover:to-orange-700 shadow-md disabled:opacity-50">
                  {packageSubmitting ? "กำลังสร้างชุดสิทธิ์..." : "🚀 บันทึกชุดสิทธิ์"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-6 space-y-4 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground">มอบหมายผู้ประเมิน (กำหนดเอง)</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">เลือกผู้ประเมิน (Evaluator) *</label>
                <select
                  required
                  value={formData.evaluatorUserId}
                  onChange={(e) => setFormData({ ...formData, evaluatorUserId: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm font-medium"
                >
                  <option value="">เลือกผู้ประเมิน</option>
                  {evaluators.map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName} (@{u.username})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">ประเภทการมอบหมาย *</label>
                <select
                  value={formData.assignmentType}
                  onChange={(e) => setFormData({ ...formData, assignmentType: e.target.value as any })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm font-medium"
                >
                  <option value="TEAM">ประเมินทั้งทีม (Team Assignment)</option>
                  <option value="DEPARTMENT">ประเมินทั้งแผนก (Department Assignment)</option>
                  <option value="EMPLOYEE">ประเมินรายบุคคล (Employee Assignment)</option>
                </select>
              </div>

              {/* TEAM ASSIGNMENT: Choice of Main Team + Exclude Departments */}
              {formData.assignmentType === "TEAM" && (
                <div className="space-y-3.5 p-4 rounded-xl bg-muted/40 border border-border">
                  <div>
                    <label className="block text-sm font-bold mb-1 text-foreground">เลือกทีมหลัก (Main Team) *</label>
                    <select
                      required
                      value={formData.targetMainTeam}
                      onChange={(e) => setFormData({ ...formData, targetMainTeam: e.target.value })}
                      className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm font-bold text-primary"
                    >
                      <option value="TEAM_A">🔵 ทีม A (Team A) — ทั้งทีม A (10 แผนก, รวม 55 คน)</option>
                      <option value="TEAM_B">🟣 ทีม B (Team B) — ทั้งทีม B (10 แผนก, รวม 53 คน)</option>
                      <option value="TEAM_C">🟢 ทีม C (Team C) — ทั้งทีม C (10 แผนก, รวม 59 คน)</option>
                    </select>
                  </div>

                  {/* Exclude Departments Section */}
                  <div className="p-3 rounded-xl bg-background/80 border border-border space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <span>🎯</span> เลือกกลุ่มแผนกที่ประเมินอย่างรวดเร็ว:
                      </span>
                    </div>

                    {/* Quick Group Selection Buttons */}
                    <div className="grid grid-cols-2 gap-1.5 pb-1">
                      <button
                        type="button"
                        onClick={() => applyQuickTarget("HEAD")}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold text-left transition-colors"
                      >
                        👑 เฉพาะ Head (1 แผนก)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyQuickTarget("QA_SUP")}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold text-left transition-colors"
                      >
                        🎯 QA & Sup.Head (2 แผนก)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyQuickTarget("STAFF")}
                        className="px-2.5 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-bold text-left transition-colors"
                      >
                        👥 พนักงาน 7 แผนกทั่วไป
                      </button>
                      <button
                        type="button"
                        onClick={() => applyQuickTarget("ALL")}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold text-left transition-colors"
                      >
                        ✨ ครบทุกแผนก (10 แผนก)
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {departments.map((dept) => {
                        const isExcluded = formData.excludedDepartmentIds.includes(dept.id);
                        return (
                          <button
                            key={dept.id}
                            type="button"
                            onClick={() => handleToggleExcludeDept(dept.id)}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs text-left transition-all ${
                              isExcluded
                                ? "bg-red-500/15 border-red-500/40 text-red-300 font-bold shadow-sm opacity-60"
                                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold"
                            }`}
                          >
                            <span className="text-sm">{isExcluded ? "✕" : getDeptIcon(dept.name)}</span>
                            <span className="truncate flex-1">{dept.name}</span>
                            <span className="text-[10px] px-1 py-0.2 rounded font-bold">
                              {isExcluded ? "ยกเว้น" : "ประเมิน"}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Summary text */}
                    <div className="text-xs font-semibold pt-1">
                      {formData.excludedDepartmentIds.length === 0 ? (
                        <span className="text-emerald-400">✓ ประเมินครบทั้ง {departments.length} แผนก</span>
                      ) : (
                        <span className="text-primary font-bold">
                          🎯 ประเมิน {departments.length - formData.excludedDepartmentIds.length} จาก {departments.length} แผนก
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Optional: specify exact single sub-team */}
                  <div className="pt-2 border-t border-border">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.specifySubTeam}
                        onChange={(e) => setFormData({ ...formData, specifySubTeam: e.target.checked })}
                        className="rounded border-input text-primary focus:ring-primary"
                      />
                      <span>ต้องการระบุเฉพาะทีมในแผนกใดแผนกหนึ่ง</span>
                    </label>

                    {formData.specifySubTeam && (
                      <div className="mt-2 space-y-2">
                        <select
                          value={formData.targetDepartmentId}
                          onChange={(e) => setFormData({ ...formData, targetDepartmentId: e.target.value, targetTeamId: "" })}
                          className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm"
                        >
                          <option value="">เลือกแผนก</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                        <select
                          value={formData.targetTeamId}
                          onChange={(e) => setFormData({ ...formData, targetTeamId: e.target.value })}
                          className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm"
                        >
                          <option value="">เลือกทีมในแผนก</option>
                          {selectedDeptTeams.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {formData.assignmentType === "DEPARTMENT" && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">เลือกแผนก *</label>
                  <select
                    required
                    value={formData.targetDepartmentId}
                    onChange={(e) => setFormData({ ...formData, targetDepartmentId: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm font-medium"
                  >
                    <option value="">เลือกแผนก</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.teams.length} ทีม)</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.assignmentType === "EMPLOYEE" && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">เลือกพนักงานที่ถูกประเมิน *</label>
                  <select
                    required
                    value={formData.targetEmployeeId}
                    onChange={(e) => setFormData({ ...formData, targetEmployeeId: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm font-medium"
                  >
                    <option value="">เลือกพนักงาน</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {[emp.name, emp.nickname].filter(Boolean).join(" ")} ({emp.employeeCode}) {emp.position ? `[${emp.position}]` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Evaluation Category Selection */}
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center justify-between text-foreground">
                  <span>หมวดหมู่คำถามการประเมิน (Evaluation Category)</span>
                  <span className="text-[11px] text-primary font-normal">✨ เลือกตามแต่ละแผนก/ระดับ</span>
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm font-medium"
                >
                  <option value="">ทุกหมวดหมู่ / อัตโนมัติตามตำแหน่งพนักงาน</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      📝 {c.name} {c.description ? `(${c.description})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">รอบการประเมิน</label>
                  <select
                    value={formData.periodId}
                    onChange={(e) => setFormData({ ...formData, periodId: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm"
                  >
                    <option value="">ทุกรอบ (ค่าเริ่มต้นตลอดไป)</option>
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">
                    สัดส่วนน้ำหนักคะแนน (Weight %) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={formData.weightPercentage}
                    onChange={(e) => setFormData({ ...formData, weightPercentage: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm font-bold text-primary"
                  />
                </div>
              </div>

              {/* Presets Quick Picker */}
              <div>
                <div className="text-xs text-muted-foreground font-medium mb-1.5">⚡ เลือกค่าน้ำหนักด่วนตามเกณฑ์ 15 คะแนน:</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {COMMON_WEIGHT_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setFormData({ ...formData, weightPercentage: preset.value })}
                      className={`px-2.5 py-1.5 text-left rounded-xl border text-xs transition-all ${
                        formData.weightPercentage === preset.value
                          ? "border-primary bg-primary/10 text-primary font-bold"
                          : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <div className="font-semibold truncate">{preset.label}</div>
                      <div className="text-[10px] text-muted-foreground opacity-80">{preset.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border">
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
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? "กำลังบันทึก..." : "บันทึกการมอบหมาย"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
