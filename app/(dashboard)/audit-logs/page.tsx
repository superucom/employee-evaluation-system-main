"use client";

import { useState, useEffect } from "react";
import { formatDateTime } from "@/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: any;
  newValue: any;
  reason: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; username: string; fullName: string } | null;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.set("action", actionFilter);
      if (entityFilter) params.set("entityType", entityFilter);
      params.set("page", page.toString());
      params.set("limit", "25");

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setLogs(data.data || []);
        setTotal(data.meta?.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter, page]);

  const getActionBadge = (action: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      CREATE: { bg: "bg-green-100 text-green-800", text: "CREATE" },
      UPDATE: { bg: "bg-blue-100 text-blue-800", text: "UPDATE" },
      DELETE: { bg: "bg-red-100 text-red-800", text: "DELETE" },
      OVERRIDE: { bg: "bg-amber-100 text-amber-800 font-bold", text: "OVERRIDE" },
      RESET_PASSWORD: { bg: "bg-secondary text-primary", text: "RESET_PASSWORD" },
      CHANGE_PASSWORD: { bg: "bg-muted text-foreground", text: "CHANGE_PASSWORD" },
      SUBMIT_EVALUATION: { bg: "bg-emerald-100 text-emerald-800", text: "SUBMIT_EVAL" },
      LOCK_PERIOD: { bg: "bg-red-100 text-red-800", text: "LOCK_PERIOD" },
      UNLOCK_PERIOD: { bg: "bg-primary/10 text-primary", text: "UNLOCK_PERIOD" },
    };

    const config = map[action] || { bg: "bg-muted text-foreground", text: action };
    return (
      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${config.bg}`}>
        {config.text}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">บันทึกประวัติการใช้งาน (Audit Logs)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            บันทึกประวัติการกระทำและเปลี่ยนแปลงข้อมูลในระบบแบบไม่สามารถแก้ไขได้ (Immutable) ทั้งหมด {total} รายการ
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card p-4 rounded-xl border border-border flex flex-wrap gap-3">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 bg-background border border-input rounded-lg text-sm"
        >
          <option value="">ทุก Action</option>
          <option value="OVERRIDE">OVERRIDE (Manager)</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="RESET_PASSWORD">RESET_PASSWORD</option>
          <option value="SUBMIT_EVALUATION">SUBMIT_EVALUATION</option>
          <option value="LOCK_PERIOD">LOCK_PERIOD</option>
        </select>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3 py-2 bg-background border border-input rounded-lg text-sm"
        >
          <option value="">ทุก Entity Type</option>
          <option value="EvaluationRecord">EvaluationRecord</option>
          <option value="User">User</option>
          <option value="Employee">Employee</option>
          <option value="Department">Department</option>
          <option value="Team">Team</option>
          <option value="EvaluationPeriod">EvaluationPeriod</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>เวลา (Timestamp)</th>
                <th>ผู้ดำเนินการ (Actor)</th>
                <th>Action</th>
                <th>Entity Type</th>
                <th>เหตุผล / หมายเหตุ</th>
                <th className="text-right">รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">กำลังโหลด Audit Logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">ไม่พบบันทึกการใช้งาน</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-xs text-muted-foreground font-mono">{formatDateTime(log.createdAt)}</td>
                    <td>
                      {log.user ? (
                        <div>
                          <span className="font-semibold text-foreground text-xs">{log.user.fullName}</span>
                          <span className="text-xs text-muted-foreground ml-1">(@{log.user.username})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">System</span>
                      )}
                    </td>
                    <td>{getActionBadge(log.action)}</td>
                    <td>
                      <span className="font-mono text-xs text-primary">{log.entityType}</span>
                    </td>
                    <td className="text-xs max-w-xs truncate text-muted-foreground">
                      {log.reason || "-"}
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg"
                      >
                        ดู Diff JSON
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail JSON Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">Audit Log รายการ: {selectedLog.id}</h2>
                  {getActionBadge(selectedLog.action)}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  เวลา: {formatDateTime(selectedLog.createdAt)} • ผู้ดำเนินการ: {selectedLog.user?.fullName || "System"}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {selectedLog.reason && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <span className="font-bold">เหตุผลการกระทำ (Reason): </span>
                {selectedLog.reason}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  ค่าเดิม (Old Value):
                </span>
                <pre className="p-3 bg-muted/60 rounded-xl border text-xs font-mono overflow-x-auto max-h-60 text-foreground">
                  {selectedLog.oldValue ? JSON.stringify(selectedLog.oldValue, null, 2) : "null"}
                </pre>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  ค่าใหม่ (New Value):
                </span>
                <pre className="p-3 bg-muted/60 rounded-xl border text-xs font-mono overflow-x-auto max-h-60 text-foreground">
                  {selectedLog.newValue ? JSON.stringify(selectedLog.newValue, null, 2) : "null"}
                </pre>
              </div>
            </div>

            <div className="pt-3 flex justify-end border-t border-border">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg text-sm hover:bg-primary/90"
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
