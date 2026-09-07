"use client";

import React, { useState, useEffect, useMemo } from "react";
import { formatDate, getMainTeamName } from "@/lib/utils";
import { exportToCSV, exportToExcel, exportMonthlyEvaluationExcel } from "@/lib/export";
import { calculateGrade } from "@/lib/calculations/score";

interface PerformanceRecord {
  id: string;
  evalStartDate: string;
  evalEndDate: string;
  workingDaysCount: number;
  rawScore: number | null;
  weightedScore: number | null;
  finalPercentage: number | null;
  workScore: number | null;
  behaviorScore: number | null;
  supervisorScore: number | null;
  totalScore: number | null;
  grade: string | null;
  comment: string | null;
  isOverride: boolean;
  employee: {
    id: string;
    name: string;
    employeeCode: string;
    department: { name: string };
    team: { name: string } | null;
  };
  evaluatorUser: { id: string; fullName: string };
  period: { id: string; name: string };
}

interface AggregatedEmployee {
  employeeId: string;
  employeeCode: string;
  name: string;
  departmentName: string;
  teamName: string | null;
  periodName: string;
  evaluators: string[];
  earliestStartDate: string;
  latestEndDate: string;
  totalWorkingDays: number;
  evaluationCount: number;
  finalPercentage: number | null;
  grade: string | null;
  comments: string[];
  records: PerformanceRecord[];
}

interface Period {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
  teams: { id: string; name: string }[];
}

export default function PerformanceReportPage() {
  const [records, setRecords] = useState<PerformanceRecord[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [grades, setGrades] = useState<{ label: string; minPercentage: number; maxPercentage: number }[] | null>(null);
  const [gradesLoading, setGradesLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  // View Mode: "aggregated" (1 แถวต่อ 1 คน รวมคะแนน) หรือ "detailed" (แยกรายครั้ง)
  const [viewMode, setViewMode] = useState<"aggregated" | "detailed">("aggregated");
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);

  // Filters
  const [periodFilter, setPeriodFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [search, setSearch] = useState("");

  const fetchFilters = async () => {
    try {
      const [pRes, dRes, gRes] = await Promise.all([
        fetch("/api/evaluation-periods"),
        fetch("/api/departments?includeTeams=true"),
        fetch("/api/grades"),
      ]);
      const [pData, dData, gData] = await Promise.all([pRes.json(), dRes.json(), gRes.json()]);
      if (pRes.ok) {
        setPeriods(pData.data || []);
        if (pData.data?.length > 0) setPeriodFilter(pData.data[0].id);
      }
      if (dRes.ok) setDepartments(dData.data || []);
      if (gRes.ok && gData.data?.length > 0) {
        setGrades(
          gData.data.map((g: any) => ({
            label: g.label,
            minPercentage: Number(g.minPercentage),
            maxPercentage: Number(g.maxPercentage),
          }))
        );
      }
      // grades loaded (even if empty — will show N/A instead of wrong hardcoded grade)
    } catch (err) {
      console.error(err);
    } finally {
      setGradesLoading(false);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (periodFilter) params.set("periodId", periodFilter);
      if (deptFilter) params.set("departmentId", deptFilter);
      if (teamFilter) params.set("teamId", teamFilter);
      params.set("limit", "500");

      const res = await fetch(`/api/reports/performance?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setRecords(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    if (periodFilter !== undefined) {
      fetchReport();
    }
  }, [periodFilter, deptFilter, teamFilter]);

  // Aggregate records by Employee ID
  const aggregatedEmployees = useMemo<AggregatedEmployee[]>(() => {
    const map = new Map<string, PerformanceRecord[]>();

    for (const r of records) {
      const empId = r.employee.id;
      if (!map.has(empId)) {
        map.set(empId, []);
      }
      map.get(empId)!.push(r);
    }

    const result: AggregatedEmployee[] = [];

    map.forEach((empRecords, empId) => {
      const first = empRecords[0];
      let totalDays = 0;
      let totalWeightedSum = 0;
      let totalWeightSum = 0;
      let hasWeightedScores = false;
      const evaluatorsSet = new Set<string>();
      const comments: string[] = [];
      const hasCompleteTotalScore = empRecords.every((r) => r.totalScore !== null && r.totalScore !== undefined);

      let earliestStart = empRecords[0].evalStartDate;
      let latestEnd = empRecords[0].evalEndDate;

      for (const r of empRecords) {
        const days = r.workingDaysCount || 1;
        totalDays += days;

        if (r.evaluatorUser?.fullName) {
          evaluatorsSet.add(r.evaluatorUser.fullName);
        }
        if (r.comment?.trim()) {
          const evalName = r.evaluatorUser?.fullName || "ผู้ประเมิน";
          comments.push(`[${evalName}]: "${r.comment.trim()}"`);
        }

        if (new Date(r.evalStartDate) < new Date(earliestStart)) {
          earliestStart = r.evalStartDate;
        }
        if (new Date(r.evalEndDate) > new Date(latestEnd)) {
          latestEnd = r.evalEndDate;
        }

        if (r.weightedScore !== null && r.weightedScore !== undefined && r.finalPercentage !== null) {
          const rawPct = Number(r.finalPercentage || 0);
          const wScore = Number(r.weightedScore || 0);
          totalWeightedSum += wScore;
          const weight = rawPct > 0 ? (wScore / rawPct) * 100 : 0;
          totalWeightSum += weight;
          hasWeightedScores = true;
        }
      }

      let finalPercentage: number | null = null;
      if (hasCompleteTotalScore) {
        finalPercentage = empRecords.reduce((sum, r) => sum + Number(r.totalScore || 0), 0) / empRecords.length;
      } else if (hasWeightedScores && totalWeightSum > 0) {
        finalPercentage = (totalWeightedSum / totalWeightSum) * 100;
      } else if (empRecords.length > 0 && empRecords.every((r) => r.finalPercentage !== null)) {
        finalPercentage = empRecords.reduce((sum, r) => sum + Number(r.finalPercentage || 0), 0) / empRecords.length;
      }
      const grade = finalPercentage === null ? null : calculateGrade(finalPercentage, grades ?? []);

      result.push({
        employeeId: empId,
        employeeCode: first.employee.employeeCode,
        name: first.employee.name,
        departmentName: first.employee.department?.name || "-",
        teamName: getMainTeamName(first.employee.team),
        periodName: first.period.name,
        evaluators: Array.from(evaluatorsSet),
        earliestStartDate: earliestStart,
        latestEndDate: latestEnd,
        totalWorkingDays: totalDays,
        evaluationCount: empRecords.length,
        finalPercentage: finalPercentage === null ? null : Math.round(finalPercentage * 10) / 10,
        grade,
        comments,
        records: empRecords.sort((a, b) => new Date(a.evalStartDate).getTime() - new Date(b.evalStartDate).getTime()),
      });
    });

    return result.sort((a, b) => a.name.localeCompare(b.name, "th"));
  }, [records, grades]);

  // Client search filter
  const filteredAggregated = useMemo(() => {
    if (!search) return aggregatedEmployees;
    const s = search.toLowerCase();
    return aggregatedEmployees.filter(
      (a) =>
        a.name.toLowerCase().includes(s) ||
        a.employeeCode.toLowerCase().includes(s) ||
        a.evaluators.some((ev) => ev.toLowerCase().includes(s))
    );
  }, [aggregatedEmployees, search]);

  const filteredDetailed = useMemo(() => {
    if (!search) return records;
    const s = search.toLowerCase();
    return records.filter(
      (r) =>
        r.employee.name.toLowerCase().includes(s) ||
        r.employee.employeeCode.toLowerCase().includes(s) ||
        r.evaluatorUser.fullName.toLowerCase().includes(s)
    );
  }, [records, search]);

  // Overall Statistics
  const totalEmployeesCount = filteredAggregated.length;
  const completedTotalCount = filteredAggregated.filter((a) => a.finalPercentage !== null).length;
  const avgScore =
    completedTotalCount > 0
      ? filteredAggregated.reduce((sum, a) => sum + (a.finalPercentage ?? 0), 0) / completedTotalCount
      : null;

  const gradeCounts: Record<string, number> = {};
  filteredAggregated.forEach((a) => {
    if (a.grade) gradeCounts[a.grade] = (gradeCounts[a.grade] || 0) + 1;
  });

  // Export Data
  const getExportData = () => {
    if (viewMode === "aggregated") {
      return filteredAggregated.map((a, index) => ({
        ลำดับ: index + 1,
        รหัสพนักงาน: a.employeeCode,
        ชื่อพนักงาน: a.name,
        แผนก: a.departmentName,
        ทีม: a.teamName || "",
        ผู้ประเมิน: a.evaluators.join(", "),
        รอบการประเมิน: a.periodName,
        ช่วงวันที่: `${formatDate(a.earliestStartDate)} - ${formatDate(a.latestEndDate)}`,
        จำนวนวันรวม: a.totalWorkingDays,
        จำนวนครั้งที่ประเมิน: a.evaluationCount,
        คะแนนรวม: a.finalPercentage === null ? "รอคะแนนส่วนอื่น" : `${a.finalPercentage.toFixed(1)} / 100`,
        เกรด: a.grade || "รอคะแนนครบ",
        ความคิดเห็น: a.comments.join(" | "),
      }));
    }

    return filteredDetailed.map((r, index) => ({
      ลำดับ: index + 1,
      รหัสพนักงาน: r.employee.employeeCode,
      ชื่อพนักงาน: r.employee.name,
      แผนก: r.employee.department?.name || "",
      ทีม: getMainTeamName(r.employee.team),
      ผู้ประเมิน: r.evaluatorUser.fullName,
      รอบการประเมิน: r.period.name,
      วันที่เริ่มประเมิน: r.evalStartDate ? r.evalStartDate.split("T")[0] : "",
      วันที่สิ้นสุดประเมิน: r.evalEndDate ? r.evalEndDate.split("T")[0] : "",
      จำนวนวัน: r.workingDaysCount,
      คะแนนเปอร์เซ็นต์: r.finalPercentage ? `${Number(r.finalPercentage).toFixed(1)}%` : "",
      เกรด: r.grade || "",
      ความคิดเห็น: r.comment || "",
    }));
  };

  const handleExportCSV = () => {
    const data = getExportData();
    exportToCSV(data, `รายงานผลการประเมิน_${new Date().toISOString().split("T")[0]}`);
  };

  const handleExportExcel = () => {
    const data = getExportData();
    exportToExcel(data, `รายงานผลการประเมิน_${new Date().toISOString().split("T")[0]}`, "Performance");
  };

  const handleExportStructuredExcel = () => {
    const currentPeriod = periods.find((p) => p.id === periodFilter);
    const currentDept = departments.find((d) => d.id === deptFilter);
    const currentTeam = currentDept?.teams?.find((t) => t.id === teamFilter);

    const teamOrDeptName = currentTeam?.name
      ? `ทีม ${currentTeam.name}`
      : currentDept?.name
      ? `แผนก ${currentDept.name}`
      : "ทุกแผนก/ทีม";

    exportMonthlyEvaluationExcel({
      periodName: currentPeriod?.name || "ประจำเดือน",
      teamOrDeptName,
      records: filteredDetailed,
      filename: `สรุปคะแนนประเมิน_${(currentPeriod?.name || "เดือน").replace(/\s+/g, "_")}`,
    });
  };

  const selectedDeptTeams = departments.find((d) => d.id === deptFilter)?.teams || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">รายงานผลการประเมิน (Performance Report)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            สรุปคะแนนผลการปฏิบัติงานรายบุคคล รวมคะแนนและคำนวณเกรดอัตโนมัติ
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportStructuredExcel}
            disabled={filteredDetailed.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm transition-all shadow-md disabled:opacity-50 flex items-center gap-2 border border-emerald-500"
          >
            📊 Export แบบฟอร์มองค์กร (Excel)
          </button>
          <button
            onClick={handleExportExcel}
            disabled={filteredAggregated.length === 0}
            className="px-3.5 py-2 border border-border bg-card hover:bg-muted text-foreground font-medium rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            📋 ตารางทั่วไป (Excel)
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredAggregated.length === 0}
            className="px-3.5 py-2 border border-border bg-card hover:bg-muted text-foreground font-medium rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            📄 CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="text-xs text-muted-foreground font-medium">พนักงานที่ประเมินแล้ว</div>
          <div className="text-3xl font-bold text-foreground mt-1">{totalEmployeesCount} คน</div>
          <div className="text-xs text-muted-foreground mt-1">จากตัวกรองปัจจุบัน</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-muted-foreground font-medium">คะแนนเฉลี่ยรวม</div>
          <div className="text-3xl font-bold text-primary mt-1">
            {avgScore === null ? "-" : `${avgScore.toFixed(1)} / 100`}
          </div>
          <div className="text-xs text-muted-foreground mt-1">ภาพรวมคะแนนผลงาน</div>
        </div>
        <div className="stat-card col-span-2">
          <div className="text-xs text-muted-foreground font-medium mb-1.5">การกระจายตัวของเกรด (Grade Distribution)</div>
          <div className="flex items-center gap-2 flex-wrap">
            {["A", "B", "C", "D", "F"].map((grade) => (
              <div key={grade} className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-lg border text-xs">
                <span className="font-bold text-primary">{grade}:</span>
                <span className="font-semibold text-foreground">{gradeCounts[grade] || 0} คน</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Bar & View Toggle */}
      <div className="bg-card p-4 rounded-xl border border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0 sm:min-w-[300px]">
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-3 py-2 bg-background border border-input rounded-lg text-sm font-medium"
          >
            <option value="">ทุกรอบการประเมิน</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setTeamFilter("");
            }}
            className="px-3 py-2 bg-background border border-input rounded-lg text-sm"
          >
            <option value="">ทุกแผนก</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            disabled={!deptFilter}
            className="px-3 py-2 bg-background border border-input rounded-lg text-sm disabled:opacity-50"
          >
            <option value="">ทุกทีม</option>
            {selectedDeptTeams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="ค้นหาชื่อ, รหัสพนักงาน หรือผู้ประเมิน..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 sm:min-w-[200px] px-3 py-2 bg-background border border-input rounded-lg text-sm"
          />
        </div>

        {/* Toggle Mode */}
        <div className="flex items-center rounded-lg border border-border bg-background p-1 text-xs">
          <button
            onClick={() => setViewMode("aggregated")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              viewMode === "aggregated"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            👥 รวมคะแนนรายคน (1 แถว)
          </button>
          <button
            onClick={() => setViewMode("detailed")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              viewMode === "detailed"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📋 แยกตามรอบวันที่
          </button>
        </div>
      </div>

      {/* Table Section */}
      {viewMode === "aggregated" ? (
        /* AGGREGATED VIEW (1 ROW PER EMPLOYEE) */
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>พนักงาน</th>
                  <th>แผนก / ทีม</th>
                  <th>ผู้ประเมิน</th>
                  <th>ช่วงวันที่ประเมิน</th>
                  <th className="text-center">วันรวม</th>
                  <th className="text-center">จำนวนครั้ง</th>
                  <th>คะแนนรวม (%)</th>
                  <th>เกรด</th>
                  <th className="text-center">รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-muted-foreground">กำลังประมวลผลรายงาน...</td>
                  </tr>
                ) : filteredAggregated.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-muted-foreground">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td>
                  </tr>
                ) : (
                  filteredAggregated.map((emp) => {
                    const isExpanded = expandedEmployeeId === emp.employeeId;
                    return (
                      <React.Fragment key={emp.employeeId}>
                        <tr className="hover:bg-muted/30 transition-colors">
                          <td className="font-mono text-xs font-semibold text-primary">{emp.employeeCode}</td>
                          <td className="font-bold text-foreground text-sm">{emp.name}</td>
                          <td className="text-xs text-muted-foreground">
                            {emp.departmentName}
                            {emp.teamName ? ` / ${emp.teamName}` : ""}
                          </td>
                          <td className="text-xs font-medium">{emp.evaluators.join(", ") || "-"}</td>
                          <td className="text-xs text-muted-foreground">
                            {formatDate(emp.earliestStartDate)} - {formatDate(emp.latestEndDate)}
                          </td>
                          <td className="text-xs text-center font-bold" style={{ color: "var(--info)" }}>
                            {emp.totalWorkingDays} วัน
                          </td>
                          <td className="text-xs text-center">
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                              {emp.evaluationCount} ครั้ง
                            </span>
                          </td>
                          <td>
                            <span className="font-extrabold text-base text-primary">
                              {emp.finalPercentage === null ? "รอคะแนนส่วนอื่น" : `${emp.finalPercentage.toFixed(1)}%`}
                            </span>
                          </td>
                          <td>
                            <span
                              className="w-7 h-7 rounded-lg font-bold text-xs inline-flex items-center justify-center shadow-sm"
                              style={{
                                background:
                                  emp.grade === "A"
                                    ? "rgba(71, 122, 97, 0.14)"
                                    : emp.grade === "B"
                                    ? "rgba(85, 123, 120, 0.14)"
                                    : emp.grade === "C"
                                    ? "rgba(164, 119, 50, 0.14)"
                                    : "rgba(182, 83, 83, 0.1)",
                                color:
                                  emp.grade === "A"
                                    ? "var(--success)"
                                    : emp.grade === "B"
                                    ? "var(--info)"
                                    : emp.grade === "C"
                                    ? "var(--warning)"
                                    : "var(--destructive)",
                                border: `1px solid ${
                                  emp.grade === "A"
                                    ? "rgba(71, 122, 97, 0.38)"
                                    : emp.grade === "B"
                                    ? "rgba(85, 123, 120, 0.38)"
                                    : emp.grade === "C"
                                    ? "rgba(164, 119, 50, 0.38)"
                                    : "rgba(182, 83, 83, 0.3)"
                                }`,
                              }}
                            >
                              {emp.grade}
                            </span>
                          </td>
                          <td className="text-center">
                            {emp.evaluationCount > 1 ? (
                              <button
                                onClick={() => setExpandedEmployeeId(isExpanded ? null : emp.employeeId)}
                                className="px-2 py-1 text-xs rounded border border-border bg-background hover:bg-muted font-medium transition-colors"
                              >
                                {isExpanded ? "▲ ซ่อน" : `▼ ดูย่อย (${emp.evaluationCount})`}
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>

                        {/* Expandable row showing individual evaluations */}
                        {isExpanded && (
                          <tr key={`${emp.employeeId}-expanded`} className="bg-background dark:bg-muted/15">
                            <td colSpan={10} className="p-4 pl-10 sm:pl-12 bg-background dark:bg-muted/20 border-y border-border">
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-bold text-muted-foreground dark:text-foreground flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-primary" />
                                    <span>รายการประเมินย่อยของ <strong>{emp.name}</strong> ({emp.evaluationCount} รายการ):</span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                  {emp.records.map((r, i) => (
                                    <div
                                      key={r.id}
                                      className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border dark:border-border bg-card dark:bg-card shadow-sm hover:border-primary/50 transition-colors text-xs"
                                    >
                                      <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                                        <span className="w-5 h-5 rounded-full bg-secondary dark:bg-primary/20 text-primary dark:text-primary font-bold text-[11px] flex items-center justify-center font-mono">
                                          {i + 1}
                                        </span>
                                        <span className="font-semibold text-foreground dark:text-foreground">
                                          {formatDate(r.evalStartDate)} - {formatDate(r.evalEndDate)}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold text-[11px] border border-blue-200 dark:border-blue-800/40">
                                          {r.workingDaysCount} วัน
                                        </span>
                                        <span className="text-muted-foreground dark:text-muted-foreground font-medium">
                                          ผู้ประเมิน: <strong className="text-foreground dark:text-foreground">{r.evaluatorUser.fullName}</strong>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2.5 flex-shrink-0">
                                        <span className="font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-2.5 py-1 rounded-lg">
                                          {r.finalPercentage ? `${Number(r.finalPercentage).toFixed(1)}%` : "-"}
                                        </span>
                                        <span className="font-bold text-amber-900 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-950/50 border border-amber-300/80 dark:border-amber-800/40 px-2 py-0.5 rounded-md">
                                          เกรด {r.grade || "-"}
                                        </span>
                                        {r.comment && (
                                          <span className="text-muted-foreground dark:text-muted-foreground italic bg-muted/80 dark:bg-muted/40 px-2.5 py-1 rounded-lg max-w-xs truncate border border-border/60 dark:border-border">
                                            "{r.comment}"
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* DETAILED VIEW (EACH INDIVIDUAL EVALUATION RECORD) */
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>พนักงาน</th>
                  <th>แผนก / ทีม</th>
                  <th>ผู้ประเมิน</th>
                  <th>ช่วงวันที่</th>
                  <th>วันทำงาน</th>
                  <th>คะแนน (%)</th>
                  <th>เกรด</th>
                  <th>ความคิดเห็น</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-muted-foreground">กำลังประมวลผลรายงาน...</td>
                  </tr>
                ) : filteredDetailed.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-muted-foreground">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td>
                  </tr>
                ) : (
                  filteredDetailed.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="font-mono text-xs font-semibold text-primary">{r.employee.employeeCode}</td>
                      <td className="font-medium text-foreground">{r.employee.name}</td>
                      <td className="text-xs text-muted-foreground">
                        {r.employee.department?.name || "-"}
                        {r.employee.team ? ` / ${getMainTeamName(r.employee.team)}` : ""}
                      </td>
                      <td className="text-xs">{r.evaluatorUser.fullName}</td>
                      <td className="text-xs text-muted-foreground">
                        {formatDate(r.evalStartDate)} - {formatDate(r.evalEndDate)}
                      </td>
                      <td className="text-xs text-center font-medium">{r.workingDaysCount} วัน</td>
                      <td>
                        <span className="font-bold text-sm text-primary">
                          {r.finalPercentage ? `${Number(r.finalPercentage).toFixed(1)}%` : "-"}
                        </span>
                      </td>
                      <td>
                        {r.grade ? (
                          <span className="w-6 h-6 rounded bg-primary/10 text-primary font-bold text-xs inline-flex items-center justify-center">
                            {r.grade}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="text-xs text-muted-foreground max-w-xs truncate">{r.comment || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
