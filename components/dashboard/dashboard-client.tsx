"use client";

import Link from "next/link";

interface StatCard {
  label: string;
  value: number;
  icon: string;
  gradient: string;
  shadow: string;
}

interface QuickAction {
  label: string;
  href: string;
  icon: string;
  desc: string;
}

export function StatCards({ stats }: { stats: StatCard[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
        gap: "1rem",
        marginBottom: "1.75rem",
      }}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="stat-card-hover"
          style={{
            background: "var(--surface-strong)",
            border: "1px solid var(--border)",
            borderRadius: "1rem",
            padding: "1.25rem",
            position: "relative",
            overflow: "hidden",
            transition: "all 0.2s ease",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -20,
              right: -20,
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: stat.gradient,
              opacity: 0.1,
              filter: "blur(20px)",
            }}
          />
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "0.75rem",
              background: stat.gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              marginBottom: "0.85rem",
              boxShadow: `0 6px 16px ${stat.shadow}`,
            }}
          >
            {stat.icon}
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--foreground)", lineHeight: 1, marginBottom: "0.3rem" }}>
            {stat.value}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 500 }}>{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="quick-action-card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.85rem 1rem",
            borderRadius: "0.75rem",
            border: "1px solid var(--border)",
            background: "var(--surface-alt)",
            textDecoration: "none",
            transition: "all 0.15s ease",
            color: "var(--foreground)",
          }}
        >
          <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{action.icon}</span>
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--foreground)" }}>{action.label}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{action.desc}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function RecentTable({
  rows,
}: {
  rows: {
    id: string;
    employeeName: string;
    employeeCode: string;
    evaluatorName: string;
    periodName: string;
    finalPercentage: string | null;
    grade: string | null;
    status: string;
  }[];
}) {
  if (rows.length === 0) return null;

  const statusStyle = (status: string) => {
    if (status === "SUBMITTED")
      return {
        background: "rgba(85,123,120,0.14)",
        color: "var(--info)",
        border: "1px solid rgba(85,123,120,0.3)",
      };
    if (status === "LOCKED")
      return {
        background: "rgba(182,83,83,0.12)",
        color: "var(--destructive)",
        border: "1px solid rgba(182,83,83,0.3)",
      };
    return { background: "var(--muted)", color: "var(--text-secondary)" };
  };

  const statusLabel = (s: string) =>
    s === "SUBMITTED" ? "ส่งแล้ว" : s === "LOCKED" ? "ล็อกแล้ว" : "ฉบับร่าง";

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "1rem",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "1.1rem 1.5rem",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--foreground)" }}>การประเมินล่าสุด</h3>
        <Link href="/evaluations" style={{ fontSize: "0.8rem", color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>
          ดูทั้งหมด →
        </Link>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
          <thead>
            <tr style={{ background: "var(--muted)" }}>
              {["พนักงาน", "ผู้ประเมิน", "รอบ", "คะแนน", "เกรด", "สถานะ"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "0.75rem 1rem",
                    textAlign: "left",
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                    fontSize: "0.72rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderBottom: "1px solid var(--border)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="table-row-hover">
                <td style={{ padding: "0.85rem 1rem" }}>
                  <div style={{ fontWeight: 600, color: "var(--foreground)" }}>{r.employeeName}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{r.employeeCode}</div>
                </td>
                <td style={{ padding: "0.85rem 1rem", color: "var(--foreground)" }}>{r.evaluatorName}</td>
                <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)" }}>{r.periodName}</td>
                <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--info)" }}>
                  {r.finalPercentage ? `${r.finalPercentage}%` : "—"}
                </td>
                <td style={{ padding: "0.85rem 1rem", fontWeight: 800, color: "var(--primary)" }}>{r.grade || "—"}</td>
                <td style={{ padding: "0.85rem 1rem" }}>
                  <span
                    style={{
                      padding: "0.25rem 0.65rem",
                      borderRadius: "9999px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      display: "inline-block",
                      ...statusStyle(r.status),
                    }}
                  >
                    {statusLabel(r.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
