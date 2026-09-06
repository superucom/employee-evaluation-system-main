"use client";

import { useState, useEffect } from "react";
import { exportMonthlyEvaluationExcel } from "@/lib/export";

interface Period {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

export default function EvaluationMatrixPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [periodFilter, setPeriodFilter] = useState("");
  const [mainTeamFilter, setMainTeamFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const [periodInfo, setPeriodInfo] = useState<Period | null>(null);
  const [headEmployees, setHeadEmployees] = useState<any[]>([]);
  const [staffEmployees, setStaffEmployees] = useState<any[]>([]);
  const [qaEmployees, setQaEmployees] = useState<any[]>([]);
  const [rawRecords, setRawRecords] = useState<any[]>([]);
  const [selectedFeedbackEmployee, setSelectedFeedbackEmployee] = useState<any | null>(null);

  const fetchFilters = async () => {
    try {
      const [pRes, dRes] = await Promise.all([
        fetch("/api/evaluation-periods"),
        fetch("/api/departments"),
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

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (periodFilter) params.set("periodId", periodFilter);
      if (mainTeamFilter && mainTeamFilter !== "ALL") params.set("mainTeam", mainTeamFilter);
      if (deptFilter) params.set("departmentId", deptFilter);

      const res = await fetch(`/api/reports/matrix?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setPeriodInfo(data.period || null);
        setHeadEmployees(data.headEmployees || []);
        setStaffEmployees(data.staffEmployees || []);
        setQaEmployees(data.qaEmployees || []);
        setRawRecords(data.rawRecords || []);
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
      fetchMatrix();
    }
  }, [periodFilter, mainTeamFilter, deptFilter]);

  const handleExportStructuredExcel = () => {
    const currentPeriod = periods.find((p) => p.id === periodFilter);
    const currentDept = departments.find((d) => d.id === deptFilter);

    const teamLabel = mainTeamFilter === "TEAM_A" ? "ทีม A" : mainTeamFilter === "TEAM_B" ? "ทีม B" : mainTeamFilter === "TEAM_C" ? "ทีม C" : "ทุกทีม";
    const teamOrDeptName = currentDept?.name
      ? `${teamLabel} / แผนก ${currentDept.name}`
      : teamLabel;

    exportMonthlyEvaluationExcel({
      periodName: currentPeriod?.name || "ประจำเดือน",
      teamOrDeptName,
      records: rawRecords,
      filename: `แปลผลคะแนนประเมิน_${teamLabel}_${(currentPeriod?.name || "เดือน").replace(/\s+/g, "_")}`,
    });
  };

  const getInterpBadge = (interp: string) => {
    if (interp === "ดีเยี่ยม") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    if (interp === "ดี") return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    if (interp === "ผ่านเกณฑ์") return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    if (interp === "ต้องปรับปรุง") return "bg-orange-500/20 text-orange-300 border-orange-500/40";
    return "bg-slate-700 text-slate-400 border-slate-600";
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-card to-primary/10 p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
            <span>📊</span> แปลผลคะแนนประเมิน (สรุปรูปแบบองค์กร)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ประจำเดือน {periodInfo?.name || "-"} | แสดงคะแนนจำแนกตามผู้ประเมิน Super, Support Super, Head, Support Head
          </p>
        </div>
        <button
          onClick={handleExportStructuredExcel}
          disabled={rawRecords.length === 0}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl text-sm transition-all shadow-md disabled:opacity-50 flex items-center gap-2 border border-emerald-400/30"
        >
          <span>📊</span> Export แบบฟอร์มองค์กร (Excel)
        </button>
      </div>

      {/* Filter Bar: Period -> Main Team -> Department */}
      <div className="bg-card p-5 rounded-2xl border border-border space-y-3 shadow-sm">
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
          🎯 ตัวกรองการแสดงผล
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. Period */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">📅 รอบการประเมิน</label>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm font-semibold focus:border-primary transition-colors"
            >
              <option value="">ทุกรอบการประเมิน</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* 2. Main Team (First Level Team Selection) */}
          <div>
            <label className="block text-xs font-bold text-primary mb-1">👥 ทีมหลัก (Select Team First)</label>
            <select
              value={mainTeamFilter}
              onChange={(e) => setMainTeamFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-background border-2 border-primary/40 rounded-xl text-sm font-extrabold text-foreground focus:border-primary transition-colors shadow-sm"
            >
              <option value="ALL">👥 ทุกทีม (All Teams)</option>
              <option value="TEAM_A">ทีม A</option>
              <option value="TEAM_B">ทีม B</option>
              <option value="TEAM_C">ทีม C</option>
            </select>
          </div>

          {/* 3. Department */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">🏢 แผนกย่อย (Department)</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm font-medium focus:border-primary transition-colors"
            >
              <option value="">ทุกแผนก</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 1: แบบประเมินพนักงาน Head */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm space-y-2">
        <div className="bg-slate-800/80 px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-blue-400 flex items-center gap-2">
            <span>👑</span> แบบประเมินพนักงาน Head ({headEmployees.length} คน)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-200 font-bold border-b border-slate-700 text-center">
                <th className="py-2.5 px-3 text-left w-10 text-slate-300">No.</th>
                <th className="py-2.5 px-3 text-left min-w-[120px] text-foreground font-extrabold">Name</th>
                <th className="py-2.5 px-2 text-left min-w-[80px]"></th>
                <th className="py-2.5 px-3 text-left min-w-[120px] text-slate-300">Department</th>
                <th colSpan={4} className="py-2.5 px-2 border-l border-slate-700 bg-blue-950/60 text-blue-300 font-extrabold">
                  1. การทำงานร่วมกับทีม/ประสานงาน
                </th>
                <th colSpan={4} className="py-2.5 px-2 border-l border-slate-700 bg-purple-950/60 text-purple-300 font-extrabold">
                  2. ความสามารถในการตัดสินใจ
                </th>
                <th colSpan={4} className="py-2.5 px-2 border-l border-slate-700 bg-emerald-950/60 text-emerald-300 font-extrabold">
                  3. มีความยุติธรรม
                </th>
                <th rowSpan={2} className="py-2.5 px-3 border-l border-slate-700 bg-slate-900 text-amber-300 font-extrabold text-center min-w-[130px]">
                  ข้อเสนอแนะ
                </th>
              </tr>
              <tr className="bg-slate-800 text-slate-100 font-bold border-b border-slate-700 text-center text-xs">
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th className="py-2.5 px-2 border-l border-slate-700 w-12 text-slate-200">Super</th>
                <th className="py-2.5 px-2 w-12 text-slate-200">S.Sup</th>
                <th className="py-2.5 px-2 w-12 font-extrabold text-amber-300 bg-slate-900/80 border-x border-slate-700">Total</th>
                <th className="py-2.5 px-2 min-w-[90px] text-foreground">แปลผล</th>
                <th className="py-2.5 px-2 border-l border-slate-700 w-12 text-slate-200">Super</th>
                <th className="py-2.5 px-2 w-12 text-slate-200">S.Sup</th>
                <th className="py-2.5 px-2 w-12 font-extrabold text-amber-300 bg-slate-900/80 border-x border-slate-700">Total</th>
                <th className="py-2.5 px-2 min-w-[90px] text-foreground">แปลผล</th>
                <th className="py-2.5 px-2 border-l border-slate-700 w-12 text-slate-200">Super</th>
                <th className="py-2.5 px-2 w-12 text-slate-200">S.Sup</th>
                <th className="py-2.5 px-2 w-12 font-extrabold text-amber-300 bg-slate-900/80 border-x border-slate-700">Total</th>
                <th className="py-2.5 px-2 min-w-[90px] text-foreground">แปลผล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={17} className="text-center py-6 text-muted-foreground">กำลังประมวลผล...</td>
                </tr>
              ) : headEmployees.length === 0 ? (
                <tr>
                  <td colSpan={17} className="text-center py-6 text-muted-foreground">ไม่มีข้อมูลพนักงานระดับ Head ตามเงื่อนไขที่เลือก</td>
                </tr>
              ) : (
                headEmployees.map((emp, idx) => (
                  <tr key={emp.employeeId} className="hover:bg-slate-800/40 font-mono">
                    <td className="py-2.5 px-3 text-muted-foreground font-sans">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-foreground font-sans">{emp.name}</td>
                    <td className="py-2.5 px-2 text-primary font-sans">{emp.nickname}</td>
                    <td className="py-2.5 px-3 text-muted-foreground font-sans">{emp.departmentName}</td>
                    <td className="py-2.5 px-2 text-center border-l border-border">{emp.q1.super ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center">{emp.q1.ssuper ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center font-extrabold text-foreground bg-slate-100 dark:bg-slate-800/60">{emp.q1.total ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center font-sans">
                      <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${getInterpBadge(emp.q1.interp)}`}>
                        {emp.q1.interp}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center border-l border-border">{emp.q2.super ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center">{emp.q2.ssuper ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center font-extrabold text-foreground bg-slate-100 dark:bg-slate-800/60">{emp.q2.total ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center font-sans">
                      <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${getInterpBadge(emp.q2.interp)}`}>
                        {emp.q2.interp}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center border-l border-border">{emp.q3.super ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center">{emp.q3.ssuper ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center font-extrabold text-foreground bg-slate-100 dark:bg-slate-800/60">{emp.q3.total ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center font-sans">
                      <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${getInterpBadge(emp.q3.interp)}`}>
                        {emp.q3.interp}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center border-l border-border font-sans">
                      {emp.feedbacks && emp.feedbacks.length > 0 ? (
                        <button
                          onClick={() => setSelectedFeedbackEmployee(emp)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all hover:scale-105 cursor-pointer"
                          title="คลิกเพื่ออ่านข้อเสนอแนะ"
                        >
                          <span>💬</span>
                          <span>อ่านเพิ่มเติม ({emp.feedbacks.length})</span>
                        </button>
                      ) : (
                        <span className="text-muted-foreground/30 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: แบบประเมินพนักงาน Staff */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm space-y-2">
        <div className="bg-slate-800/80 px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-emerald-400 flex items-center gap-2">
            <span>👥</span> แบบประเมินพนักงาน Staff ({staffEmployees.length} คน)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-200 font-bold border-b border-slate-700 text-center">
                <th className="py-2.5 px-3 text-left w-10 text-slate-300">No.</th>
                <th className="py-2.5 px-3 text-left min-w-[120px] text-foreground font-extrabold">Name</th>
                <th className="py-2.5 px-2 text-left min-w-[80px]"></th>
                <th className="py-2.5 px-3 text-left min-w-[120px] text-slate-300">Department</th>
                <th colSpan={6} className="py-2.5 px-2 border-l border-slate-700 bg-blue-950/60 text-blue-300 font-extrabold">
                  1. การทำงานร่วมกับทีม/ประสานงาน
                </th>
                <th colSpan={6} className="py-2.5 px-2 border-l border-slate-700 bg-purple-950/60 text-purple-300 font-extrabold">
                  2. ความรับผิดชอบต่อหน้างาน
                </th>
                <th colSpan={6} className="py-2.5 px-2 border-l border-slate-700 bg-emerald-950/60 text-emerald-300 font-extrabold">
                  3. ความรู้ความสามารถเกี่ยวกับหน้างาน
                </th>
                <th rowSpan={2} className="py-2.5 px-3 border-l border-slate-700 bg-slate-900 text-amber-300 font-extrabold text-center min-w-[130px]">
                  ข้อเสนอแนะ
                </th>
              </tr>
              <tr className="bg-slate-800 text-slate-100 font-bold border-b border-slate-700 text-center text-xs">
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th className="py-2.5 px-2 border-l border-slate-700 w-12 text-slate-200">Super</th>
                <th className="py-2.5 px-2 w-12 text-slate-200">S.Super</th>
                <th className="py-2.5 px-2 w-12 text-slate-200">H.</th>
                <th className="py-2.5 px-2 w-12 text-slate-200">S.Head</th>
                <th className="py-2.5 px-2 w-12 font-extrabold text-amber-300 bg-slate-900/80 border-x border-slate-700">Total</th>
                <th className="py-2.5 px-2 min-w-[90px] text-foreground">แปลผล</th>
                <th className="py-2.5 px-2 border-l border-slate-700 w-12 text-slate-200">Super</th>
                <th className="py-2.5 px-2 w-12 text-slate-200">S.Super</th>
                <th className="py-2.5 px-2 w-12 text-slate-200">H.</th>
                <th className="py-2.5 px-2 w-12 text-slate-200">S.Head</th>
                <th className="py-2.5 px-2 w-12 font-extrabold text-amber-300 bg-slate-900/80 border-x border-slate-700">Total</th>
                <th className="py-2.5 px-2 min-w-[90px] text-foreground">แปลผล</th>
                <th className="py-2.5 px-2 border-l border-slate-700 w-12 text-slate-200">Super</th>
                <th className="py-2.5 px-2 w-12 text-slate-200">S.Super</th>
                <th className="py-2.5 px-2 w-12 text-slate-200">H.</th>
                <th className="py-2.5 px-2 w-12 text-slate-200">S.Head</th>
                <th className="py-2.5 px-2 w-12 font-extrabold text-amber-300 bg-slate-900/80 border-x border-slate-700">Total</th>
                <th className="py-2.5 px-2 min-w-[90px] text-foreground">แปลผล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={23} className="text-center py-6 text-muted-foreground">กำลังประมวลผล...</td>
                </tr>
              ) : staffEmployees.length === 0 ? (
                <tr>
                  <td colSpan={23} className="text-center py-6 text-muted-foreground">ไม่มีข้อมูลพนักงานทั่วไปตามเงื่อนไขที่เลือก</td>
                </tr>
              ) : (
                staffEmployees.map((emp, idx) => (
                  <tr key={emp.employeeId} className="hover:bg-slate-800/40 font-mono">
                    <td className="py-2.5 px-3 text-muted-foreground font-sans">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-foreground font-sans">{emp.name}</td>
                    <td className="py-2.5 px-2 text-primary font-sans">{emp.nickname}</td>
                    <td className="py-2.5 px-3 text-muted-foreground font-sans">{emp.departmentName}</td>
                    {/* Q1 */}
                    <td className="py-2.5 px-2 text-center border-l border-border">{emp.q1.super ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center">{emp.q1.ssuper ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center">{emp.q1.head ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center">{emp.q1.shead ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center font-extrabold text-foreground bg-slate-100 dark:bg-slate-800/60">{emp.q1.total ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center font-sans">
                      <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${getInterpBadge(emp.q1.interp)}`}>
                        {emp.q1.interp}
                      </span>
                    </td>
                    {/* Q2 */}
                    <td className="py-2.5 px-2 text-center border-l border-border">{emp.q2.super ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center">{emp.q2.ssuper ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center">{emp.q2.head ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center">{emp.q2.shead ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center font-extrabold text-foreground bg-slate-100 dark:bg-slate-800/60">{emp.q2.total ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center font-sans">
                      <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${getInterpBadge(emp.q2.interp)}`}>
                        {emp.q2.interp}
                      </span>
                    </td>
                    {/* Q3 */}
                    <td className="py-2.5 px-2 text-center border-l border-border">{emp.q3.super ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center">{emp.q3.ssuper ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center">{emp.q3.head ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center">{emp.q3.shead ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center font-extrabold text-foreground bg-slate-100 dark:bg-slate-800/60">{emp.q3.total ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center font-sans">
                      <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${getInterpBadge(emp.q3.interp)}`}>
                        {emp.q3.interp}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center border-l border-border font-sans">
                      {emp.feedbacks && emp.feedbacks.length > 0 ? (
                        <button
                          onClick={() => setSelectedFeedbackEmployee(emp)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all hover:scale-105 cursor-pointer"
                          title="คลิกเพื่ออ่านข้อเสนอแนะ"
                        >
                          <span>💬</span>
                          <span>อ่านเพิ่มเติม ({emp.feedbacks.length})</span>
                        </button>
                      ) : (
                        <span className="text-muted-foreground/30 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: แบบประเมินพนักงาน QA */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm space-y-2">
        <div className="bg-slate-800/80 px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-amber-400 flex items-center gap-2">
            <span>🔬</span> แบบประเมินพนักงาน QA ({qaEmployees.length} คน)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-200 font-bold border-b border-slate-700 text-center">
                <th className="py-2.5 px-3 text-left w-10 text-slate-300">No.</th>
                <th className="py-2.5 px-3 text-left min-w-[120px] text-foreground font-extrabold">Name</th>
                <th className="py-2.5 px-2 text-left min-w-[80px]"></th>
                <th className="py-2.5 px-3 text-left min-w-[120px] text-slate-300">Department</th>
                <th colSpan={6} className="py-2.5 px-2 border-l border-slate-700 bg-blue-950/60 text-blue-300 font-extrabold">
                  1. การทำงานร่วมกับทีม/ประสานงาน
                </th>
                <th colSpan={6} className="py-2.5 px-2 border-l border-slate-700 bg-purple-950/60 text-purple-300 font-extrabold">
                  2. ความสามารถในการตัดสินใจ
                </th>
                <th colSpan={6} className="py-2.5 px-2 border-l border-slate-700 bg-emerald-950/60 text-emerald-300 font-extrabold">
                  3. มีความยุติธรรม
                </th>
                <th rowSpan={2} className="py-2.5 px-3 border-l border-slate-700 bg-slate-900 text-amber-300 font-extrabold text-center min-w-[130px]">
                  ข้อเสนอแนะ
                </th>
              </tr>
              <tr className="bg-slate-800 text-slate-100 font-bold border-b border-slate-700 text-center text-xs">
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th className="py-2.5 px-2 border-l border-slate-700 w-12 text-slate-200">Super</th>
                <th className="py-2.5 px-2 w-12 text-slate-200">S.Super</th>
                <th className="py-2.5 px-2 w-12 text-slate-200">H.</th>
                <th className="py-2.5 px-2 w-12 text-slate-200">S.Head</th>
                <th className="py-2.5 px-2 w-12 font-extrabold text-amber-300 bg-slate-900/80 border-x border-slate-700">Total</th>
                <th className="py-2.5 px-2 min-w-[90px] text-foreground">แปลผล</th>
                <th className="py-2.5 px-2 border-l border-slate-700 w-12 text-slate-200">Super</th>
                <th className="py-2.5 px-2 w-12 text-slate-200">S.Super</th>
                <th className="py-2.5 px-2 w-12 text-slate-200">H.</th>
                <th className="py-2.5 px-2 w-12 text-slate-200">S.Head</th>
                <th className="py-2.5 px-2 w-12 font-extrabold text-amber-300 bg-slate-900/80 border-x border-slate-700">Total</th>
                <th className="py-2.5 px-2 min-w-[90px] text-foreground">แปลผล</th>
                <th className="py-2.5 px-2 border-l border-slate-700 w-12 text-slate-200">Super</th>
                <th className="py-2.5 px-2 w-12 text-slate-200">S.Super</th>
                <th className="py-2.5 px-2 w-12 text-slate-200">H.</th>
                <th className="py-2.5 px-2 w-12 text-slate-200">S.Head</th>
                <th className="py-2.5 px-2 w-12 font-extrabold text-amber-300 bg-slate-900/80 border-x border-slate-700">Total</th>
                <th className="py-2.5 px-2 min-w-[90px] text-foreground">แปลผล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={23} className="text-center py-6 text-muted-foreground">กำลังประมวลผล...</td>
                </tr>
              ) : qaEmployees.length === 0 ? (
                <tr>
                  <td colSpan={23} className="text-center py-6 text-muted-foreground">ไม่มีข้อมูลพนักงาน QA ตามเงื่อนไขที่เลือก</td>
                </tr>
              ) : (
                qaEmployees.map((emp, idx) => (
                  <tr key={emp.employeeId} className="hover:bg-slate-800/40 font-mono">
                    <td className="py-2.5 px-3 text-muted-foreground font-sans">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-foreground font-sans">{emp.name}</td>
                    <td className="py-2.5 px-2 text-primary font-sans">{emp.nickname}</td>
                    <td className="py-2.5 px-3 text-muted-foreground font-sans">{emp.departmentName}</td>
                    {/* Q1 */}
                    <td className="py-2.5 px-2 text-center border-l border-border">{emp.q1.super ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center">{emp.q1.ssuper ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center">{emp.q1.head ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center">{emp.q1.shead ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center font-extrabold text-foreground bg-slate-100 dark:bg-slate-800/60">{emp.q1.total ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center font-sans">
                      <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${getInterpBadge(emp.q1.interp)}`}>
                        {emp.q1.interp}
                      </span>
                    </td>
                    {/* Q2 */}
                    <td className="py-2.5 px-2 text-center border-l border-border">{emp.q2.super ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center">{emp.q2.ssuper ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center">{emp.q2.head ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center">{emp.q2.shead ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center font-extrabold text-foreground bg-slate-100 dark:bg-slate-800/60">{emp.q2.total ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center font-sans">
                      <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${getInterpBadge(emp.q2.interp)}`}>
                        {emp.q2.interp}
                      </span>
                    </td>
                    {/* Q3 */}
                    <td className="py-2.5 px-2 text-center border-l border-border">{emp.q3.super ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center">{emp.q3.ssuper ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center">{emp.q3.head ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center">{emp.q3.shead ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center font-extrabold text-foreground bg-slate-100 dark:bg-slate-800/60">{emp.q3.total ?? "-"}</td>
                    <td className="py-2.5 px-2 text-center font-sans">
                      <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${getInterpBadge(emp.q3.interp)}`}>
                        {emp.q3.interp}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center border-l border-border font-sans">
                      {emp.feedbacks && emp.feedbacks.length > 0 ? (
                        <button
                          onClick={() => setSelectedFeedbackEmployee(emp)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all hover:scale-105 cursor-pointer"
                          title="คลิกเพื่ออ่านข้อเสนอแนะ"
                        >
                          <span>💬</span>
                          <span>อ่านเพิ่มเติม ({emp.feedbacks.length})</span>
                        </button>
                      ) : (
                        <span className="text-muted-foreground/30 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feedback Modal Dialog */}
      {selectedFeedbackEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>💬</span> ข้อเสนอแนะการประเมิน
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  พนักงาน: <strong className="text-foreground">{selectedFeedbackEmployee.name}</strong>
                  {selectedFeedbackEmployee.nickname && ` (${selectedFeedbackEmployee.nickname})`} • แผนก {selectedFeedbackEmployee.departmentName}
                </p>
              </div>
              <button
                onClick={() => setSelectedFeedbackEmployee(null)}
                className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {selectedFeedbackEmployee.feedbacks && selectedFeedbackEmployee.feedbacks.length > 0 ? (
                selectedFeedbackEmployee.feedbacks.map((fb: any, i: number) => (
                  <div key={i} className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold text-[10px] flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="font-bold text-foreground">
                          ผู้ประเมิน: {fb.evaluatorName}
                        </span>
                      </div>
                      {fb.evaluatorUsername && (
                        <span className="font-mono text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          @{fb.evaluatorUsername}
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 rounded-lg bg-background/80 border border-border/60 text-xs text-foreground leading-relaxed italic">
                      "{fb.comment}"
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  ไม่มีข้อเสนอแนะสำหรับพนักงานท่านนี้
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <button
                onClick={() => setSelectedFeedbackEmployee(null)}
                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
