import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${Number(value).toFixed(2)}%`;
}

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return Number(value).toFixed(2);
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "ฉบับร่าง",
    SUBMITTED: "ส่งแล้ว",
    LOCKED: "ล็อกแล้ว",
    ACTIVE: "ใช้งาน",
    CLOSED: "ปิดแล้ว",
  };
  return labels[status] ?? status;
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    MANAGER: "ผู้จัดการ",
    SUPER: "Super",
    SUPPORT_SUPER: "Support Super",
    SUPER_CR: "Super.CR",
    HEAD: "หัวหน้าแผนก (Head)",
    SUPPORT_HEAD: "ผู้ช่วยหัวหน้าแผนก (Support Head)",
    EVALUATOR: "ผู้ประเมิน",
  };
  return labels[role] ?? role;
}

/**
 * Extracts a person's nickname or personal name from their role/position-prefixed fullName
 * e.g. "HeadCC หมู" -> "หมู", "Support Head CC มะเดี่ยว" -> "มะเดี่ยว", "HeadCR ดารารัตน์" -> "ดารารัตน์"
 */
export function extractNickname(fullName: string | null | undefined): string {
  if (!fullName) return "";
  const trimmed = fullName.trim();
  if (trimmed === "ผู้จัดการระบบ" || trimmed === "ผู้จัดการ" || trimmed === "Manager") return "";

  // Remove known role prefixes
  const clean = trimmed
    .replace(/^(SupportSuper|Super|HeadCCAD|HeadCC|HeadCR|HeadCS|HeadMKT|HeadRD|HeadSP|Tranfer|STranfer|Support\s*Head\s*(CCAD|CC|CS|MKT|Withdraw|Transfer)?|Head\s*(CR|CloseSale|Marketing|QA|RD|SalePromotion|Withdraw|Transfer)?)\s*/i, "")
    .trim();

  return clean !== trimmed || !trimmed.includes(" ") ? clean : trimmed;
}

export function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    DRAFT: "badge-draft",
    SUBMITTED: "badge-submitted",
    LOCKED: "badge-locked",
    ACTIVE: "badge-active",
    active: "badge-active",
    inactive: "badge-inactive",
  };
  return classes[status] ?? "badge-draft";
}

/**
 * Returns the primary team label (ทีม A, ทีม B, ทีม C) from a team object or string
 */
export function getMainTeamName(team: { name?: string; code?: string } | string | null | undefined): string {
  if (!team) return "-";
  const nameStr = typeof team === "string" ? team : (team.name || team.code || "");
  const codeStr = typeof team === "string" ? "" : (team.code || "");
  const upper = nameStr.toUpperCase().trim();
  const codeUpper = codeStr.toUpperCase().trim();

  if (
    upper.includes("TEAM A") ||
    upper.endsWith(" A") ||
    upper === "A" ||
    upper === "ทีม A" ||
    codeUpper.endsWith("_A") ||
    codeUpper.includes("TEAM_A")
  ) {
    return "ทีม A";
  }
  if (
    upper.includes("TEAM B") ||
    upper.endsWith(" B") ||
    upper === "B" ||
    upper === "ทีม B" ||
    codeUpper.endsWith("_B") ||
    codeUpper.includes("TEAM_B")
  ) {
    return "ทีม B";
  }
  if (
    upper.includes("TEAM C") ||
    upper.endsWith(" C") ||
    upper === "C" ||
    upper === "ทีม C" ||
    codeUpper.endsWith("_C") ||
    codeUpper.includes("TEAM_C")
  ) {
    return "ทีม C";
  }
  if (
    upper.includes("TEAM D") ||
    upper.endsWith(" D") ||
    upper === "D" ||
    upper === "ทีม D" ||
    codeUpper.endsWith("_D") ||
    codeUpper.includes("TEAM_D")
  ) {
    return "ทีม D";
  }
  return nameStr || "-";
}

/**
 * Returns the position hierarchy rank:
 * 1 = Super (Super, Support.SUPER, S.Sup)
 * 2 = Head (Head, Leader, TF, HRD, Support Head)
 * 3 = Staff / General Employee
 */
export function getPositionRank(pos: string | null | undefined): number {
  if (!pos) return 3;
  const p = pos.toUpperCase().trim();
  // Super
  if (p.includes("SUPER") || p.includes("S.SUP") || p === "SUP") {
    return 1;
  }
  // Head / Leader / TF / HRD / S.H
  if (
    p.includes("HEAD") ||
    p.includes("SUPPORT.H") ||
    p.includes("LEAD") ||
    p.includes("HRD") ||
    p.includes("TF") ||
    p.includes("S.H") ||
    p.includes("หัวหน้า")
  ) {
    return 2;
  }
  // Staff
  return 3;
}

/**
 * Returns the numeric rank of a team (Team A = 1, Team B = 2, Team C = 3)
 */
export function getTeamRank(team: { name?: string; code?: string } | string | null | undefined): number {
  const main = getMainTeamName(team);
  if (main.includes("A")) return 1;
  if (main.includes("B")) return 2;
  if (main.includes("C")) return 3;
  if (main.includes("D")) return 4;
  return 5;
}

/**
 * Compares two employees according to the default business hierarchy:
 * 1. ทีมหลัก (Team A > Team B > Team C)
 * 2. ตำแหน่ง (Super > Head > Staff)
 * 3. แผนก (Department name ก-ฮ)
 * 4. วันเริ่มงาน (Start Date: เริ่มงานก่อน -> หลัง)
 * 5. รหัสพนักงาน / ชื่อ
 */
export function compareEmployeesByDefaultHierarchy(a: any, b: any): number {
  // 1. Team: Team A < Team B < Team C
  const teamRankA = getTeamRank(a.team);
  const teamRankB = getTeamRank(b.team);
  if (teamRankA !== teamRankB) return teamRankA - teamRankB;

  // 2. Position: Super (1) < Head (2) < Staff (3)
  const posRankA = getPositionRank(a.position);
  const posRankB = getPositionRank(b.position);
  if (posRankA !== posRankB) return posRankA - posRankB;

  // 3. Department: alphabetical (ก-ฮ / A-Z)
  const deptA = a.department?.name || "";
  const deptB = b.department?.name || "";
  const deptCmp = deptA.localeCompare(deptB, "th");
  if (deptCmp !== 0) return deptCmp;

  // 4. Start Date: oldest first (เริ่มงานก่อน -> หลัง)
  const dateA = a.startDate ? new Date(a.startDate).getTime() : Infinity;
  const dateB = b.startDate ? new Date(b.startDate).getTime() : Infinity;
  if (dateA !== dateB) return dateA - dateB;

  // 5. Employee code / Name
  const codeA = a.employeeCode || "";
  const codeB = b.employeeCode || "";
  return codeA.localeCompare(codeB, undefined, { numeric: true });
}

/**
 * Sorts an array of employee items based on a given sort mode.
 */
export function sortEmployees<T extends {
  name: string;
  employeeCode?: string;
  position?: string | null;
  startDate?: string | Date | null;
  department?: { name?: string } | null;
  team?: { name?: string; code?: string } | null;
}>(list: T[], sortBy: string): T[] {
  const cloned = [...list];
  return cloned.sort((a, b) => {
    switch (sortBy) {
      case "DEFAULT":
        return compareEmployeesByDefaultHierarchy(a, b);
      case "NAME_ASC":
        return (a.name || "").localeCompare(b.name || "", "th");
      case "NAME_DESC":
        return (b.name || "").localeCompare(a.name || "", "th");
      case "TEAM_ASC": {
        const trA = getTeamRank(a.team);
        const trB = getTeamRank(b.team);
        if (trA !== trB) return trA - trB;
        return compareEmployeesByDefaultHierarchy(a, b);
      }
      case "TEAM_DESC": {
        const trA = getTeamRank(a.team);
        const trB = getTeamRank(b.team);
        if (trA !== trB) return trB - trA;
        return compareEmployeesByDefaultHierarchy(a, b);
      }
      case "CODE_ASC":
        return (a.employeeCode || "").localeCompare(b.employeeCode || "", undefined, { numeric: true });
      case "CODE_DESC":
        return (b.employeeCode || "").localeCompare(a.employeeCode || "", undefined, { numeric: true });
      case "START_DATE_ASC": {
        const dA = a.startDate ? new Date(a.startDate).getTime() : Infinity;
        const dB = b.startDate ? new Date(b.startDate).getTime() : Infinity;
        return dA - dB;
      }
      case "START_DATE_DESC": {
        const dA = a.startDate ? new Date(a.startDate).getTime() : -Infinity;
        const dB = b.startDate ? new Date(b.startDate).getTime() : -Infinity;
        return dB - dA;
      }
      default:
        return compareEmployeesByDefaultHierarchy(a, b);
    }
  });
}
