"use client";

import { useEffect, useMemo, useState } from "react";

type Rule = {
  id: string;
  code: string;
  targetGroup: string;
  evaluatorRole: string;
  evaluatorScope: string;
  categoryId: string | null;
  weightPoints: number;
  selectionMode: string;
  isActive: boolean;
  category?: { id: string; name: string } | null;
};

type RuleSet = { id: string; name: string; version: number; totalPoints: number; rules: Rule[] };
type Period = { id: string; name: string; status: string };
type User = { id: string; username: string; fullName: string; role: string; team: { name: string; code: string } | null };
type Selection = { slotKey: string; evaluatorUserId: string; mainTeamKey: string | null; evaluatorUser: User };

const slotLabels: Record<string, string> = {
  CR_SUPER_CR: "Super.CR",
  CR_SUPER: "Super ที่ใช้ประเมิน CR",
  CR_SUPPORT_SUPER: "Support Super ที่ใช้ประเมิน CR",
};

export default function EvaluationRulesPage() {
  const [ruleSet, setRuleSet] = useState<RuleSet | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [periodId, setPeriodId] = useState("");
  const [selections, setSelections] = useState<Record<string, string>>({ CR_SUPER_CR: "", CR_SUPER: "", CR_SUPPORT_SUPER: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [ruleRes, periodRes, userRes] = await Promise.all([
        fetch("/api/evaluation-rule-sets"),
        fetch("/api/evaluation-periods"),
        fetch("/api/users?limit=200"),
      ]);
      const [ruleData, periodData, userData] = await Promise.all([ruleRes.json(), periodRes.json(), userRes.json()]);
      const nextRuleSet = (ruleData.data || [])[0] as RuleSet | undefined;
      if (nextRuleSet) {
        setRuleSet(nextRuleSet);
        setRules(nextRuleSet.rules.map((r) => ({ ...r, weightPoints: Number(r.weightPoints) })));
      }
      const nextPeriods = periodData.data || [];
      setPeriods(nextPeriods);
      setUsers(userData.data || []);
      if (!periodId && nextPeriods.length > 0) setPeriodId(nextPeriods[0].id);
    } finally {
      setLoading(false);
    }
  };

  const loadSelections = async (id: string) => {
    if (!id) return;
    const res = await fetch(`/api/evaluation-periods/${id}/selections`);
    const data = await res.json();
    if (res.ok) {
      const next = { CR_SUPER_CR: "", CR_SUPER: "", CR_SUPPORT_SUPER: "" };
      for (const item of (data.data || []) as Selection[]) next[item.slotKey as keyof typeof next] = item.evaluatorUserId;
      setSelections(next);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { loadSelections(periodId); }, [periodId]);

  const roles = useMemo(() => users.filter((u) => ["SUPER", "SUPPORT_SUPER", "SUPER_CR"].includes(u.role)), [users]);

  const updateRule = (id: string, patch: Partial<Rule>) => setRules((current) => current.map((r) => r.id === id ? { ...r, ...patch } : r));

  const saveRules = async () => {
    if (!ruleSet) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/evaluation-rule-sets/${ruleSet.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ totalPoints: ruleSet.totalPoints, rules }) });
      const data = await res.json();
      setMessage(res.ok ? "บันทึกกฎและ Sync สิทธิ์แล้ว" : data.error || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const saveSelections = async () => {
    if (!periodId) return;
    setSaving(true);
    setMessage("");
    try {
      const selected = Object.entries(selections).filter(([, userId]) => userId).map(([slotKey, evaluatorUserId]) => ({ slotKey, evaluatorUserId, mainTeamKey: null }));
      const res = await fetch(`/api/evaluation-periods/${periodId}/selections`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selections: selected }) });
      const data = await res.json();
      setMessage(res.ok ? data.message : data.error || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-foreground">กฎการประเมินและผู้ประเมินประจำรอบ</h1>
        <p className="text-sm text-muted-foreground mt-1">ปรับน้ำหนักคะแนนและเปลี่ยนผู้ประเมินได้ โดยไม่ต้องแก้ไขโค้ด</p>
      </div>

      {message && <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20 font-semibold text-sm">{message}</div>}
      {loading ? <div className="py-12 text-center text-muted-foreground">กำลังโหลดกฎการประเมิน...</div> : (
        <>
          <section className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-lg">สัดส่วนคะแนนจากผู้ประเมิน</h2>
                <p className="text-xs text-muted-foreground">Rule Set: {ruleSet?.name} v{ruleSet?.version} | คะแนนเต็ม {ruleSet?.totalPoints || 15}</p>
              </div>
              <button onClick={saveRules} disabled={saving || !ruleSet} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50">บันทึกสัดส่วน</button>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>กลุ่มเป้าหมาย</th><th>ผู้ประเมิน</th><th>ขอบเขต</th><th>หมวดหมู่</th><th>คะแนน</th><th>ใช้งาน</th></tr></thead>
                <tbody>{rules.map((rule) => <tr key={rule.id}>
                  <td className="font-semibold">{rule.targetGroup}</td>
                  <td>{rule.evaluatorRole}</td>
                  <td className="text-xs">{rule.evaluatorScope}</td>
                  <td className="text-xs">{rule.category?.name || "อัตโนมัติ"}</td>
                  <td><input type="number" min={0} max={15} step={0.01} value={rule.weightPoints} onChange={(e) => updateRule(rule.id, { weightPoints: Number(e.target.value) })} className="w-24 px-2 py-1 bg-background border border-input rounded-lg" /></td>
                  <td><input type="checkbox" checked={rule.isActive} onChange={(e) => updateRule(rule.id, { isActive: e.target.checked })} /></td>
                </tr>)}</tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">ระบบตรวจสอบคะแนนรวมของแต่ละกลุ่มเป้าหมายให้เท่ากับ 15 คะแนนก่อนบันทึก</p>
          </section>

          <section className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="font-bold text-lg">ผู้ประเมิน CR ประจำรอบ</h2><p className="text-xs text-muted-foreground">เลือก Super.CR และ Super/Support Super ที่ใช้ในรอบนี้</p></div>
              <select value={periodId} onChange={(e) => setPeriodId(e.target.value)} className="px-3 py-2 bg-background border border-input rounded-xl text-sm">{periods.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.status})</option>)}</select>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(slotLabels).map(([slotKey, label]) => {
                const expectedRole = slotKey === "CR_SUPER_CR" ? "SUPER_CR" : slotKey === "CR_SUPER" ? "SUPER" : "SUPPORT_SUPER";
                return <label key={slotKey} className="space-y-1 text-sm font-semibold"><span>{label}</span><select value={selections[slotKey] || ""} onChange={(e) => setSelections({ ...selections, [slotKey]: e.target.value })} className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm"><option value="">-- เลือกผู้ประเมิน --</option>{roles.filter((u) => u.role === expectedRole).map((u) => <option key={u.id} value={u.id}>{u.fullName} (@{u.username})</option>)}</select></label>;
              })}
            </div>
            <button onClick={saveSelections} disabled={saving || !periodId} className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground font-bold text-sm disabled:opacity-50">บันทึกผู้ประเมินและ Sync</button>
          </section>
        </>
      )}
    </div>
  );
}
