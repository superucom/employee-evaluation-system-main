"use client";

import { Fragment, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { formatDate, getStatusClass, getStatusLabel } from "@/lib/utils";
import { groupEvaluationsByEvaluator, EvaluationGroup } from "@/lib/evaluations/grouping";

interface EvaluationRecord {
  id: string;
  evalStartDate: string;
  evalEndDate: string;
  workingDaysCount: number;
  status: "DRAFT" | "SUBMITTED" | "LOCKED";
  rawScore: number | null;
  weightedScore: number | null;
  finalPercentage: number | null;
  workScore: number | null;
  behaviorScore: number | null;
  supervisorScore: number | null;
  totalScore: number | null;
  grade: string | null;
  isOverride: boolean;
  comment: string | null;
  createdAt: string;
  employee: {
    id: string;
    name: string;
    employeeCode: string;
    nickname?: string | null;
    position?: string | null;
    department?: { id: string; name: string; code?: string } | null;
    team?: { id: string; name: string; code?: string } | null;
  };
  evaluatorUser: { id: string; fullName: string; username: string };
  period: { id: string; name: string; status?: string };
}

interface EvaluationPeriod {
  id: string;
  name: string;
}

export default function EvaluationsListPage() {
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [periods, setPeriods] = useState<EvaluationPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [periodFilter, setPeriodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());
  const [exportingGroupKey, setExportingGroupKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchEvaluations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (periodFilter) params.set("periodId", periodFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/evaluations?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setEvaluations(data.data || []);
        setSelectedIds(new Set()); // Reset selections on fetch
        setExpandedGroupKeys(new Set());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriods = async () => {
    try {
      const res = await fetch("/api/evaluation-periods");
      const data = await res.json();
      if (res.ok) setPeriods(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    fetchEvaluations();
  }, [periodFilter, statusFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.size === evaluations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(evaluations.map((e) => e.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const evaluationGroups = useMemo(
    () => groupEvaluationsByEvaluator(evaluations),
    [evaluations]
  );

  const toggleGroupExpanded = (groupKey: string) => {
    setExpandedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const toggleSelectGroup = (group: EvaluationGroup<EvaluationRecord>) => {
    const groupIds = group.records.map((record) => record.id);
    const allSelected = groupIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      groupIds.forEach((id) => {
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  };

  const handleExportGroup = async (group: EvaluationGroup<EvaluationRecord>) => {
    setExportingGroupKey(group.key);
    setStatusMessage(null);

    try {
      const params = new URLSearchParams({
        periodId: group.period.id,
        evaluatorUserId: group.evaluatorUser.id,
      });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/evaluations/export?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({ type: "error", text: data.error || "ไม่สามารถเตรียมไฟล์ Export ได้" });
        return;
      }

      const records = data.data || [];
      if (records.length === 0) {
        setStatusMessage({ type: "error", text: "ไม่พบข้อมูลสำหรับ Export ตามตัวกรองปัจจุบัน" });
        return;
      }

      const teams = Array.from(
        new Set(records.map((record: EvaluationRecord) => record.employee?.team?.name).filter(Boolean))
      );
      const teamName = teams.length === 1 ? String(teams[0]) : teams.length > 1 ? "หลายทีม" : "ทุกทีม";
      const safeEvaluatorName = group.evaluatorUser.fullName.replace(/[\\/:*?"<>|]/g, " ").trim();
      const safePeriodName = group.period.name.replace(/[\\/:*?"<>|]/g, " ").trim();
      const { exportEvaluatorEvaluationExcel } = await import("@/lib/export");

      exportEvaluatorEvaluationExcel({
        evaluator: data.data[0]?.evaluatorUser || group.evaluatorUser,
        period: data.data[0]?.period || group.period,
        records,
        teamName,
        filename: `${safeEvaluatorName} ${teamName} ประเมิน ${safePeriodName}`,
      });
      setStatusMessage({ type: "success", text: `Export ผลการประเมินของ ${group.evaluatorUser.fullName} สำเร็จ` });
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: "error", text: "เกิดข้อผิดพลาดในการสร้างไฟล์ Export" });
    } finally {
      setExportingGroupKey(null);
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;

    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบผลการประเมินที่เลือกจำนวน ${count} รายการ? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      return;
    }

    setDeleting(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/evaluations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatusMessage({ type: "error", text: data.error || "เกิดข้อผิดพลาดในการลบรายการ" });
      } else {
        setStatusMessage({ type: "success", text: `🎉 ${data.message || `ลบรายการสำเร็จ ${count} รายการ`}` });
        fetchEvaluations();
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์" });
    } finally {
      setDeleting(false);
    }
  };

  const isAllSelected = useMemo(
    () => evaluations.length > 0 && selectedIds.size === evaluations.length,
    [evaluations, selectedIds]
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ผลการประเมินการปฏิบัติงาน (Evaluations)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ผู้ประเมิน {evaluationGroups.length} กลุ่ม / รายการประเมิน {evaluations.length} รายการ
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-sm transition-all shadow-md flex items-center gap-2 border border-red-500 animate-pulse"
            >
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  กำลังลบข้อมูล...
                </>
              ) : (
                <>
                  <span>🗑️</span> ลบรายการที่เลือก ({selectedIds.size} รายการ)
                </>
              )}
            </button>
          )}
          <Link
            href="/evaluations/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            ประเมินผลใหม่
          </Link>
        </div>
      </div>

      {/* Alert Status */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-green-500/10 text-green-400 border-green-500/30"
              : "bg-red-500/10 text-red-400 border-red-500/30"
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-xs opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-card p-4 rounded-xl border border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>กรองข้อมูล:</span>
          </div>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-3 py-1.5 bg-background border border-input rounded-lg text-sm"
          >
            <option value="">ทุกรอบการประเมิน</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-background border border-input rounded-lg text-sm"
          >
            <option value="">ทุกสถานะ</option>
            <option value="SUBMITTED">ส่งผลแล้ว (Submitted)</option>
            <option value="DRAFT">ฉบับร่าง (Draft)</option>
            <option value="LOCKED">ล็อกแล้ว (Locked)</option>
          </select>
        </div>

        {/* Selection Status */}
        {selectedIds.size > 0 && (
          <div className="text-xs font-bold text-primary flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
            <span>เลือกแล้ว {selectedIds.size} จาก {evaluations.length} รายการ</span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs underline hover:text-foreground ml-1"
            >
              ยกเลิกการเลือก
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10 text-center py-3 px-3">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    disabled={evaluations.length === 0}
                    className="w-4 h-4 rounded border-input text-primary focus:ring-primary cursor-pointer accent-primary"
                  />
                </th>
                <th>ผู้ประเมิน</th>
                <th>ช่วงวันที่ประเมิน</th>
                <th>รอบ</th>
                <th className="text-center">พนักงาน</th>
                <th>สถานะ</th>
                <th className="text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    กำลังโหลดผลการประเมิน...
                  </td>
                </tr>
              ) : evaluationGroups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    ไม่พบข้อมูลผลการประเมิน
                  </td>
                </tr>
              ) : (
                evaluationGroups.map((group) => {
                  const groupSelectedCount = group.records.filter((record) => selectedIds.has(record.id)).length;
                  const isGroupSelected = groupSelectedCount === group.records.length;
                  const isGroupPartiallySelected = groupSelectedCount > 0 && !isGroupSelected;
                  const isExpanded = expandedGroupKeys.has(group.key);

                  return (
                    <Fragment key={group.key}>
                      <tr className={`transition-colors ${groupSelectedCount > 0 ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/30"}`}>
                        <td className="text-center py-3 px-3">
                          <input
                            type="checkbox"
                            checked={isGroupSelected}
                            ref={(element) => {
                              if (element) element.indeterminate = isGroupPartiallySelected;
                            }}
                            onChange={() => toggleSelectGroup(group)}
                            className="w-4 h-4 rounded border-input text-primary focus:ring-primary cursor-pointer accent-primary"
                            aria-label={`เลือกผลการประเมินของ ${group.evaluatorUser.fullName}`}
                          />
                        </td>
                        <td>
                          <div className="font-semibold text-foreground">{group.evaluatorUser.fullName}</div>
                          <div className="text-xs text-muted-foreground font-mono">@{group.evaluatorUser.username}</div>
                        </td>
                        <td className="text-xs">
                          {group.dateRange
                            ? `${formatDate(group.dateRange.start)} - ${formatDate(group.dateRange.end)}`
                            : "หลายช่วงวันที่"}
                        </td>
                        <td className="text-xs text-muted-foreground">{group.period.name}</td>
                        <td className="font-semibold text-xs text-center">{group.employeeCount} คน</td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {(["SUBMITTED", "DRAFT", "LOCKED"] as const).map((status) =>
                              group.statusCounts[status] > 0 ? (
                                <span key={status} className={getStatusClass(status)}>
                                  {getStatusLabel(status)} {group.statusCounts[status]}
                                </span>
                              ) : null
                            )}
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => toggleGroupExpanded(group.key)}
                              className="px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg"
                              aria-expanded={isExpanded}
                            >
                              {isExpanded ? "ซ่อนรายการ" : `ดูรายการ (${group.records.length})`}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportGroup(group)}
                              disabled={exportingGroupKey !== null}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 rounded-lg disabled:opacity-50"
                            >
                              {exportingGroupKey === group.key ? (
                                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <span>⇩</span>
                              )}
                              Export
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${group.key}-details`} className="bg-muted/20">
                          <td colSpan={7} className="p-0">
                            <div className="px-6 py-4 border-y border-border/70">
                              <div className="text-xs font-bold text-muted-foreground mb-2">
                                รายการพนักงานที่ {group.evaluatorUser.fullName} ประเมิน ({group.records.length} รายการ)
                              </div>
                              <div className="overflow-x-auto rounded-xl border border-border/70">
                                <table className="data-table text-xs">
                                  <thead>
                                    <tr>
                                      <th>พนักงาน</th>
                                      <th className="text-center">คะแนนหัวหน้างาน</th>
                                      <th>คะแนนรวม / 100</th>
                                      <th>เกรด</th>
                                      <th>สถานะ</th>
                                      <th className="text-right">จัดการ</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.records.map((item) => {
                                      const isChecked = selectedIds.has(item.id);
                                      return (
                                        <tr key={item.id} className={isChecked ? "bg-primary/10" : ""}>
                                          <td>
                                            <div className="font-semibold text-foreground">{item.employee.name}</div>
                                            <div className="text-[11px] text-muted-foreground font-mono">{item.employee.employeeCode}</div>
                                          </td>
                                          <td className="font-medium text-center">
                                            {item.supervisorScore !== null && item.supervisorScore !== undefined
                                              ? `${Number(item.supervisorScore).toFixed(1)} / 15`
                                              : "-"}
                                          </td>
                                          <td>
                                            <span className="font-bold text-primary">
                                              {item.totalScore !== null && item.totalScore !== undefined
                                                ? `${Number(item.totalScore).toFixed(1)} / 100`
                                                : "รอคะแนนส่วนอื่น"}
                                            </span>
                                          </td>
                                          <td>
                                            {item.grade ? (
                                              <span className="w-6 h-6 rounded bg-primary/10 text-primary font-bold inline-flex items-center justify-center">
                                                {item.grade}
                                              </span>
                                            ) : (
                                              "-"
                                            )}
                                          </td>
                                          <td>
                                            <span className={getStatusClass(item.status)}>{getStatusLabel(item.status)}</span>
                                            {item.isOverride && (
                                              <span className="ml-1 text-[10px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-semibold">
                                                Override
                                              </span>
                                            )}
                                          </td>
                                          <td className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleSelectOne(item.id)}
                                                className="w-4 h-4 rounded border-input text-primary focus:ring-primary cursor-pointer accent-primary"
                                                aria-label={`เลือกผลการประเมินของ ${item.employee.name}`}
                                              />
                                              <Link
                                                href={`/evaluations/${item.id}`}
                                                className="px-2.5 py-1 font-medium text-primary hover:bg-primary/10 rounded-lg"
                                              >
                                                ดูรายละเอียด
                                              </Link>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
