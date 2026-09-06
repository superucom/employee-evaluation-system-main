"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// ---- Clean Minimalist Icons (18x18) ----
const DashboardIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const UsersIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const ClipboardIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);
const CalendarIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const StarIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const ChartIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
    <path d="M18 20V10M12 20V4M6 20v-6" />
  </svg>
);
const ShieldIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const UserIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const FileIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
  </svg>
);
const PeopleIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    <circle cx="9" cy="7" r="4" />
  </svg>
);
const KeyIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
    <circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2l-9.6 9.6M15.5 7.5l3 3" />
  </svg>
);
const LogoutIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);
const MenuIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
    <path d="M3 12h18M3 6h18M3 18h18" />
  </svg>
);
const CloseIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const MANAGER_NAV: NavGroup[] = [
  {
    label: "ภาพรวม",
    items: [{ label: "Dashboard", href: "/dashboard", icon: <DashboardIcon /> }],
  },
  {
    label: "การประเมิน",
    items: [
      { label: "รอบการประเมิน", href: "/evaluation-periods", icon: <CalendarIcon /> },
      { label: "ประเมินผลพนักงาน", href: "/my-employees", icon: <UsersIcon /> },
      { label: "ผลการประเมิน", href: "/evaluations", icon: <ClipboardIcon /> },
    ],
  },
  {
    label: "พนักงาน",
    items: [
      { label: "พนักงาน", href: "/employees", icon: <UsersIcon /> },
      { label: "ทีมและแผนก", href: "/teams", icon: <PeopleIcon /> },
    ],
  },
  {
    label: "ตั้งค่าเกณฑ์",
    items: [
      { label: "หมวดหมู่", href: "/evaluation-criteria/categories", icon: <StarIcon /> },
      { label: "คำถาม", href: "/evaluation-criteria/questions", icon: <ClipboardIcon /> },
      { label: "เกณฑ์คะแนน", href: "/evaluation-criteria/score-criteria", icon: <ChartIcon /> },
      { label: "กฎการประเมิน", href: "/evaluation-rules", icon: <ShieldIcon /> },
      { label: "เกรด", href: "/evaluation-criteria/grades", icon: <StarIcon /> },
    ],
  },
  {
    label: "ผู้ใช้งาน",
    items: [
      { label: "จัดการผู้ใช้", href: "/users", icon: <UserIcon /> },
      { label: "การมอบหมาย", href: "/evaluator-assignments", icon: <ShieldIcon /> },
    ],
  },
  {
    label: "รายงาน",
    items: [
      { label: "แปลผลคะแนนองค์กร", href: "/reports/matrix", icon: <FileIcon /> },
      { label: "รายงานผลงาน", href: "/reports/performance", icon: <FileIcon /> },
      { label: "รายงานความสำเร็จ", href: "/reports/completion", icon: <ChartIcon /> },
      { label: "Audit Log", href: "/audit-logs", icon: <ShieldIcon /> },
    ],
  },
];

const EVALUATOR_NAV: NavGroup[] = [
  {
    label: "ภาพรวม",
    items: [{ label: "Dashboard", href: "/dashboard", icon: <DashboardIcon /> }],
  },
  {
    label: "การประเมิน",
    items: [
      { label: "พนักงานของฉัน", href: "/my-employees", icon: <UsersIcon /> },
      { label: "รอการประเมิน", href: "/evaluations", icon: <ClipboardIcon /> },
    ],
  },
  {
    label: "บัญชีของฉัน",
    items: [{ label: "เปลี่ยน Password", href: "/change-password", icon: <KeyIcon /> }],
  },
];

const HEAD_NAV: NavGroup[] = [
  {
    label: "ภาพรวม",
    items: [{ label: "Dashboard", href: "/dashboard", icon: <DashboardIcon /> }],
  },
  {
    label: "การประเมิน",
    items: [
      { label: "ประเมินผลพนักงาน", href: "/my-employees", icon: <UsersIcon /> },
      { label: "ผลการประเมิน", href: "/evaluations", icon: <ClipboardIcon /> },
    ],
  },
  {
    label: "รายงาน",
    items: [
      { label: "รายงานผลงาน", href: "/reports/performance", icon: <FileIcon /> },
      { label: "รายงานความสำเร็จ", href: "/reports/completion", icon: <ChartIcon /> },
    ],
  },
  {
    label: "บัญชีของฉัน",
    items: [{ label: "เปลี่ยน Password", href: "/change-password", icon: <KeyIcon /> }],
  },
];

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const navGroups =
    role === "MANAGER"
      ? MANAGER_NAV
      : role === "HEAD" || role === "SUPPORT_HEAD"
      ? HEAD_NAV
      : EVALUATOR_NAV;
  const [open, setOpen] = useState(false);

  const getRoleIconAndText = () => {
    switch (role) {
      case "MANAGER":
        return { icon: "👔", text: "ผู้จัดการ (Manager)" };
      case "HEAD":
        return { icon: "👑", text: "หัวหน้าแผนก (Head)" };
      case "SUPPORT_HEAD":
        return { icon: "🛡️", text: "ผู้ช่วยหัวหน้าแผนก (Support Head)" };
      case "SUPER":
        return { icon: "👑", text: "Super" };
      case "SUPPORT_SUPER":
        return { icon: "🛡️", text: "Support Super" };
      case "SUPER_CR":
        return { icon: "☎️", text: "Super.CR" };
      case "EVALUATOR":
      default:
        return { icon: "📋", text: "ผู้ประเมิน (Evaluator)" };
    }
  };

  const roleInfo = getRoleIconAndText();

  const sidebarContent = (
    <>
      {/* Brand Header */}
      <div style={{ padding: "1.5rem 1.25rem 1.25rem", borderBottom: "1px solid rgba(36,53,45,0.18)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "0.65rem",
              background: "var(--background)",
              color: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              border: "1px solid var(--primary)",
            }}
          >
            <span style={{ fontSize: "16px" }}>⚡</span>
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#17251E", lineHeight: 1.2 }}>
              ระบบประเมินผล
            </p>
            <p style={{ fontSize: "0.7rem", color: "var(--primary)", letterSpacing: "0.04em" }}>
              Performance Evaluation
            </p>
          </div>
        </div>

        {/* Role Badge */}
        <div
          style={{
            marginTop: "0.85rem",
            padding: "0.25rem 0.65rem",
            borderRadius: "9999px",
            fontSize: "0.72rem",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            background: "var(--secondary)",
            color: "#24352D",
            border: "1px solid var(--primary)",
          }}
        >
          <span>{roleInfo.icon}</span>
          {roleInfo.text}
        </div>
      </div>

      {/* Navigation Groups */}
      <nav style={{ flex: 1, padding: "0.85rem 0.5rem", overflowY: "auto" }}>
        {navGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: "0.4rem" }}>
            <p
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "#304F40",
                letterSpacing: "0.05em",
                padding: "0.6rem 0.75rem 0.25rem",
              }}
            >
              {group.label}
            </p>
            {group.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.65rem",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "0.5rem",
                    fontSize: "0.88rem",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "#17251E" : "#304F40",
                    background: isActive ? "rgba(220,233,225,0.9)" : "transparent",
                    border: isActive ? "1px solid rgba(71,122,97,0.4)" : "1px solid transparent",
                    marginBottom: "0.15rem",
                    transition: "all 0.15s ease",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = "rgba(220,233,225,0.72)";
                      (e.currentTarget as HTMLElement).style.color = "#17251E";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "#304F40";
                    }
                  }}
                >
                  <span style={{ opacity: isActive ? 1 : 0.85, flexShrink: 0, color: isActive ? "#17251E" : "currentColor" }}>
                    {item.icon}
                  </span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.label}
                  </span>
                  {isActive && (
                    <span
                      style={{
                        marginLeft: "auto",
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "#477A61",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: "0.75rem 0.5rem", borderTop: "1px solid rgba(36,53,45,0.18)" }}>
        <button
          id="logout-btn"
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.65rem",
            padding: "0.6rem 0.75rem",
            borderRadius: "0.5rem",
            fontSize: "0.85rem",
            fontWeight: 500,
            color: "#8F4141",
            background: "transparent",
            border: "1px solid transparent",
            width: "100%",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(180,70,70,0.12)";
            (e.currentTarget as HTMLElement).style.border = "1px solid rgba(180,70,70,0.2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.border = "1px solid transparent";
          }}
        >
          <LogoutIcon />
          ออกจากระบบ
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          top: "1rem",
          left: "1rem",
          zIndex: 50,
          display: "none",
          padding: "0.5rem",
          background: "var(--primary)",
          border: "1px solid var(--primary-hover)",
          borderRadius: "0.5rem",
          color: "var(--primary-foreground)",
          cursor: "pointer",
        }}
        className="mobile-menu-btn"
        id="mobile-menu-btn"
      >
        <MenuIcon />
      </button>

      {/* Mobile Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(2px)",
            zIndex: 40,
          }}
        />
      )}

      {/* Sidebar Container */}
      <aside
        style={{
          width: "var(--sidebar-width)",
          minHeight: "100vh",
          backgroundColor: "var(--accent)",
          color: "#24352D",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          left: open ? 0 : undefined,
          top: 0,
          bottom: 0,
          zIndex: 45,
          borderRight: "1px solid var(--primary)",
          overflowY: "hidden",
        }}
      >
        {/* Mobile Close Button */}
        <button
          onClick={() => setOpen(false)}
          className="mobile-close-btn"
          style={{
            display: "none",
            position: "absolute",
            top: "0.75rem",
            right: "0.75rem",
            background: "none",
            border: "none",
            color: "#24352D",
            cursor: "pointer",
            padding: "0.25rem",
          }}
        >
          <CloseIcon />
        </button>

        {sidebarContent}
      </aside>
    </>
  );
}
