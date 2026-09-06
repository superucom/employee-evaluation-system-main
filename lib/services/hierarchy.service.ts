/**
 * Organizational Hierarchy & Evaluator Scope Service
 *
 * โครงสร้างสายการบังคับบัญชาและการประเมินผล:
 *
 *                  ทีม (เช่น Team A)
 *                         │
 *                       Super
 *                         │
 *                    SuportSuper
 *                   ┌─────┴────────────────────────┐
 *          แผนก CallCenter                     แผนก Sales
 *                 │                                  │
 *               Head                               Head
 *                 │                                  │
 *             SuportHead                         SuportHead
 *              ┌──┴──┐                            ┌──┴──┐
 *           พนักงาน พนักงาน                     พนักงาน พนักงาน
 *
 * กฎการประเมิน:
 * 1. Super: ประเมินทุกคนทุกแผนกของทีมตัวเอง + ประเมิน SuportSuper
 * 2. SuportSuper: ประเมินทุกคนทุกแผนกในทีมตัวเอง ยกเว้น Super
 * 3. Head: ประเมินพนักงานในแผนกของทีมตัวเอง + ประเมิน SuportHead
 * 4. SuportHead: ประเมินพนักงานในแผนกและทีมของตัวเอง ยกเว้น Head
 */

export type HierarchyRoleLevel = "SUPER" | "SUPORT_SUPER" | "HEAD" | "SUPORT_HEAD" | "STAFF";

/**
 * Extract normalized base team identifier (e.g., "CC Team A" and "Sale Team A" -> "TEAM_A")
 */
export function normalizeTeamIdentifier(teamNameOrCode: string | null | undefined): string {
  if (!teamNameOrCode) return "";
  const s = teamNameOrCode.toUpperCase().replace(/[\s_-]+/g, "");

  if (s.includes("TEAMA") || s.includes("TEAM1") || s.endsWith("A")) return "TEAM_A";
  if (s.includes("TEAMB") || s.includes("TEAM2") || s.endsWith("B")) return "TEAM_B";
  if (s.includes("TEAMC") || s.includes("TEAM3") || s.endsWith("C")) return "TEAM_C";
  if (s.includes("TEAMD") || s.includes("TEAM4") || s.endsWith("D")) return "TEAM_D";

  return s;
}

/**
 * Detect position level of user or employee
 */
export function getHierarchyLevel(positionOrTitle: string | null | undefined, username?: string): HierarchyRoleLevel {
  const text = `${positionOrTitle || ""} ${username || ""}`.toLowerCase().replace(/[\s._-]+/g, "");

  // 1. SuportSuper / S.Sup
  if (
    text.includes("suportsuper") ||
    text.includes("supportsuper") ||
    text.includes("ssup") ||
    text.includes("subsuper") ||
    text.includes("seniorsuper")
  ) {
    return "SUPORT_SUPER";
  }

  // 2. Super
  if (text.includes("super") || text.includes("supervisor")) {
    return "SUPER";
  }

  // 3. SuportHead / SH / S.Head
  if (
    text.includes("suporthead") ||
    text.includes("supporthead") ||
    text.includes("shead") ||
    text.includes("subhead") ||
    text.includes("suph") ||
    text.includes("sh")
  ) {
    return "SUPORT_HEAD";
  }

  // 4. Head / Lead
  if (
    text.includes("head") ||
    text.includes("leader") ||
    text.includes("lead") ||
    text.includes("manager") ||
    text.startsWith("h")
  ) {
    return "HEAD";
  }

  return "STAFF";
}

/**
 * Check if evaluator can evaluate the target employee based on hierarchy rules
 */
export function canEvaluateEmployee(
  evaluator: {
    id: string;
    role?: string;
    position?: string | null;
    username?: string;
    teamNameOrCode?: string | null;
    departmentId?: string | null;
  },
  target: {
    id: string;
    position?: string | null;
    name?: string;
    teamNameOrCode?: string | null;
    departmentId?: string | null;
  }
): boolean {
  // Manager can evaluate anyone
  if (evaluator.role === "MANAGER") return true;

  // Cannot evaluate oneself
  if (evaluator.id === target.id) return false;

  const evalLevel = getHierarchyLevel(evaluator.position, evaluator.username);
  const targetLevel = getHierarchyLevel(target.position, target.name);

  const evalTeam = normalizeTeamIdentifier(evaluator.teamNameOrCode);
  const targetTeam = normalizeTeamIdentifier(target.teamNameOrCode);

  // Must belong to the same team group (e.g. Team A)
  if (evalTeam && targetTeam && evalTeam !== targetTeam) {
    return false;
  }

  // Rule 1: Super
  // ประเมินทุกคนทุกแผนกของทีมตัวเอง (รวม SuportSuper, Head, SuportHead, Staff)
  if (evalLevel === "SUPER") {
    // Super cannot evaluate other Supers
    return targetLevel !== "SUPER";
  }

  // Rule 2: SuportSuper
  // ประเมินทุกคนในทีมตัวเอง ยกเว้น Super
  if (evalLevel === "SUPORT_SUPER") {
    return targetLevel !== "SUPER" && targetLevel !== "SUPORT_SUPER";
  }

  // Same department check for Head & SuportHead
  const isSameDept =
    !evaluator.departmentId ||
    !target.departmentId ||
    evaluator.departmentId === target.departmentId;

  // Rule 3: Head
  // ประเมินพนักงานในแผนกของทีมตัวเอง + ประเมิน SuportHead (ไม่ประเมิน Super, S.Sup)
  if (evalLevel === "HEAD") {
    if (!isSameDept) return false;
    return targetLevel === "SUPORT_HEAD" || targetLevel === "STAFF";
  }

  // Rule 4: SuportHead
  // ประเมินพนักงานในแผนกและทีมของตัวเอง ยกเว้น Head
  if (evalLevel === "SUPORT_HEAD") {
    if (!isSameDept) return false;
    return targetLevel === "STAFF";
  }

  return false;
}
