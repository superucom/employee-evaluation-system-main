"use client";

import { useState, useEffect, useMemo } from "react";
import { exportToCSV } from "@/lib/export";
import { getMainTeamName } from "@/lib/utils";

interface EvaluatorInfo {
  id: string;
  name: string;
  weight: number;
}

interface CompletionItem {
  employee: { id: string; name: string; employeeCode: string };
  department: { id: string; name: string };
  team: { id: string; name: string } | null;
  completedScore: number;
  totalExpectedScore: number;
  isComplete: boolean;
  completedEvaluators: EvaluatorInfo[];
  pendingEvaluators: EvaluatorInfo[];
}

interface Period {
  id: string;
  name: string;
  expectedWorkingDays: number;
}

interface Department {
  id: string;
  name: string;
  teams: { id: string; name: string }[];
}

export default function CompletionReportPage() {
  const [data, setData] = useState<CompletionItem[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [period, setPeriod] = useState<Period | null>(null);
  const [overall, setOverall] = useState<{ totalEmployees: number; completedEmployees: number }>({
    totalEmployees: 0,
    completedEmployees: 0,
  });

  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [search, setSearch] = useState("");

  const fetchFilters = async () => {
    try {
      const [pRes, dRes] = await Promise.all([
        fetch("/api/evaluation-periods"),
        fetch("/api/departments?includeTeams=true"),
      ]);
      const [pData, dData] = await Promise.all([pRes.json(), dRes.json()]);
      if (pRes.ok) {
        setPeriods(pData.data || []);
        if (pData.data?.length > 0) setPeriodFilter(pData.data[0].id);
      }
      if (dRes.ok) setDepartments(dData.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCompletion = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (periodFilter) params.set("periodId", periodFilter);
      if (deptFilter) params.set("departmentId", deptFilter);
      if (teamFilter) params.set("teamId", teamFilter);

      const res = await fetch(`/api/reports/completion?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setData(json.data || []);
        setPeriod(json.period || null);
        setOverall(json.overall || { totalEmployees: 0, completedEmployees: 0 });
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
      fetchCompletion();
    }
  }, [periodFilter, deptFilter, teamFilter]);

  const filteredData = useMemo(() => {
    if (!search) return data;
    const s = search.toLowerCase();
    return data.filter(
      (d) =>
        d.employee.name.toLowerCase().includes(s) ||
        d.employee.employeeCode.toLowerCase().includes(s) ||
        d.pendingEvaluators.some((ev) => ev.name.toLowerCase().includes(s))
    );
  }, [data, search]);

  const handleExport = () => {
    const exportData = filteredData.map((d, index) => ({
      ลำดับ: index + 1,
      รหัสพนักงาน: d.employee.employeeCode,
      ชื่อพนักงาน: d.employee.name,
      แผนก: d.department?.name || "",
      ทีม: getMainTeamName(d.team),
      คะแนนที่ได้รับการประเมินแล้ว: `${d.completedScore} / 15 คะแนน`,
      สถานะการประเมิน: d.isComplete ? "ประเมินครบแล้ว (15 คะแนน)" : "ยังประเมินไม่ครบ",
      ผู้ประเมินที่ประเมินแล้ว: d.completedEvaluators.map((e) => `${e.name} (${e.weight.toFixed(1)} คะแนน)`).join(", "),
      ยังไม่ได้รับการประเมินจาก: d.isComplete
        ? "-"
        : d.pendingEvaluators.length > 0
        ? d.pendingEvaluators.map((e) => `${e.name} (${e.weight.toFixed(1)} คะแนน)`).join(", ")
        : "ยังไม่ได้รับการประเมินจากใครเลย",
    }));

    exportToCSV(exportData, `รายงานความสำเร็จการประเมิน_${new Date().toISOString().split("T")[0]}`);
  };

  const selectedDeptTeams = departments.find((d) => d.id === deptFilter)?.teams || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">รายงานความสำเร็จการประเมิน (Completion Report)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ติดตามสถานะคะแนนการประเมินจริงเทียบกับสิทธิ์การประเมินเต็ม 15 คะแนน
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={filteredData.length === 0}
          className="px-4 py-2 border border-border bg-card hover:bg-muted text-foreground font-medium rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
        >
          📄 Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="text-xs text-muted-foreground font-medium">รอบการประเมิน</div>
          <div className="text-xl font-bold text-foreground mt-1">{period?.name || "-"}</div>
          <div className="text-xs text-muted-foreground mt-1">
            คะแนนเต็มเป้าหมาย: <span className="font-bold text-primary">15 คะแนน</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="text-xs text-muted-foreground font-medium">ประเมินครบ 15 คะแนนแล้ว</div>
          <div className="text-3xl font-bold text-green-500 mt-1">
            {overall.completedEmployees} / {overall.totalEmployees} คน
          </div>
          <div className="text-xs text-muted-foreground mt-1">จากพนักงานทั้งหมด {overall.totalEmployees} คน</div>
        </div>

        <div className="stat-card">
          <div className="text-xs text-muted-foreground font-medium">ยังประเมินไม่ครบ 15 คะแนน</div>
          <div className="text-3xl font-bold text-amber-500 mt-1">
            {overall.totalEmployees - overall.completedEmployees} คน
          </div>
          <div className="text-xs text-muted-foreground mt-1">กำลังรอผู้ประเมินดำเนินการ</div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-card p-4 rounded-xl border border-border flex flex-wrap gap-3">
        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          className="px-3 py-2 bg-background border border-input rounded-lg text-sm font-medium"
        >
          <option value="">เลือกรอบการประเมิน</option>
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
          className="flex-1 min-w-[200px] px-3 py-2 bg-background border border-input rounded-lg text-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>รหัสพนักงาน</th>
                <th>ชื่อพนักงาน</th>
                <th>แผนก / ทีม</th>
                <th className="text-center">คะแนนสะสม (จาก 15)</th>
                <th>สถานะการประเมิน</th>
                <th>ยังไม่ได้รับการประเมินจาก (ขาดคะแนน)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">กำลังประมวลผลรายงาน...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">ไม่พบข้อมูล</td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.employee.id} className="hover:bg-muted/30 transition-colors">
                    <td className="font-mono text-xs font-semibold text-primary">{item.employee.employeeCode}</td>
                    <td className="font-bold text-foreground text-sm">{item.employee.name}</td>
                    <td className="text-xs text-muted-foreground">
                      {item.department?.name || "-"}
                      {item.team ? ` / ${getMainTeamName(item.team)}` : ""}
                    </td>
                    <td className="text-center">
                      <span className="font-black text-base text-primary">
                        {item.completedScore}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground"> / 15</span>
                    </td>
                    <td>
                      {item.isComplete ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold">
                          <span>✅</span> ประเมินครบ 15 คะแนนแล้ว
                        </span>
                      ) : item.completedScore > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
                          <span>⏳</span> ได้รับ {item.completedScore} / 15 คะแนน
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold">
                          <span>❌</span> ยังไม่ได้รับการประเมิน
                        </span>
                      )}
                    </td>
                    <td>
                      {item.isComplete ? (
                        <span className="text-xs text-muted-foreground italic">-</span>
                      ) : item.pendingEvaluators.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 py-1">
                          {item.pendingEvaluators.map((ev) => (
                            <span
                              key={ev.id}
                              className="px-2 py-0.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold flex items-center gap-1"
                            >
                              <span>👤</span> {ev.name} ({ev.weight.toFixed(1)} คะแนน)
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-red-400 font-semibold">
                          ยังไม่ได้รับการประเมินจากผู้ประเมินท่านใดเลย
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

