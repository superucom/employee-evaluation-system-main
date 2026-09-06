import { AssignmentSource, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db/client";

type DbClient = typeof prisma | Prisma.TransactionClient;

const DEFAULT_RULE_SET_NAME = "มาตรฐานการประเมิน 15 คะแนน";
const OPEN_PERIOD_STATUSES = ["DRAFT", "ACTIVE"] as const;

export type MainTeamKey = "TEAM_A" | "TEAM_B" | "TEAM_C" | "TEAM_D" | "";

export function getMainTeamKey(team: { name?: string | null; code?: string | null } | null | undefined): MainTeamKey {
  const value = `${team?.code || ""} ${team?.name || ""}`.toUpperCase().replace(/[\s._-]+/g, "");
  if (value.includes("TEAMA") || value.endsWith("A")) return "TEAM_A";
  if (value.includes("TEAMB") || value.endsWith("B")) return "TEAM_B";
  if (value.includes("TEAMC") || value.endsWith("C")) return "TEAM_C";
  if (value.includes("TEAMD") || value.endsWith("D")) return "TEAM_D";
  return "";
}

type EmployeeLike = {
  id: string;
  position: string | null;
  department: { code: string };
  team: { name: string; code: string } | null;
};

function normalized(value: string | null | undefined): string {
  return (value || "").toUpperCase().replace(/[\s._-]+/g, "");
}

export function getTargetGroup(employee: EmployeeLike): string {
  const rawPosition = (employee.position || "").toUpperCase().trim();
  const position = normalized(employee.position);
  const department = normalized(employee.department.code);
  const isSupportHead =
    position.includes("SUPPORTHEAD") ||
    position.includes("SUPPORTH") ||
    position.includes("SHEAD") ||
    /\bS\.?\s*H\b/.test(rawPosition) ||
    /\bSUPPORT\s*\.?\s*H\b/.test(rawPosition);

  if (position.includes("SUPERCR")) return "SUPER_TARGET";
  if (position === "SUPER" || position.includes("SUPPORTSUPER") || department === "SUPER") {
    return "SUPER_TARGET";
  }
  if (isSupportHead) {
    return "SUPPORT_HEAD_TARGET";
  }
  if (position.includes("HEAD")) return "HEAD_TARGET";
  if (department === "CR" && (position === "CR" || !position.includes("HEAD"))) return "CR_STAFF";
  if (position.includes("TRANSFER") || position.includes("TRANFER") || department === "QA" || position === "QA") {
    return "TRANSFER_QA_TARGET";
  }
  return "STAFF_TARGET";
}

function categoryIdForGroup(targetGroup: string, categories: { id: string; name: string }[]): string | null {
  const supervisor = categories.find((c) => c.name.includes("Head") || c.name.includes("SupHead"));
  const staff = categories.find((c) => c.name.includes("พนักงาน"));
  return targetGroup === "HEAD_TARGET" || targetGroup === "SUPPORT_HEAD_TARGET" || targetGroup === "TRANSFER_QA_TARGET"
    ? supervisor?.id || null
    : staff?.id || null;
}

async function ensureDefaultRuleSet(db: DbClient) {
  const existing = await db.evaluationRuleSet.findFirst({
    where: { name: DEFAULT_RULE_SET_NAME, version: 1 },
    include: { rules: true },
  });
  if (existing) return existing;

  const categories = await db.evaluationCategory.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  const supervisorCategoryId = categories.find((c) => c.name.includes("Head") || c.name.includes("SupHead"))?.id || null;
  const staffCategoryId = categories.find((c) => c.name.includes("พนักงาน"))?.id || null;

  return db.evaluationRuleSet.create({
    data: {
      name: DEFAULT_RULE_SET_NAME,
      version: 1,
      totalPoints: 15,
      rules: {
        create: [
          { code: "HEAD_SUPER", targetGroup: "HEAD_TARGET", evaluatorRole: Role.SUPER, evaluatorScope: "SAME_MAIN_TEAM", categoryId: supervisorCategoryId, weightPoints: 10, sortOrder: 10 },
          { code: "HEAD_SUPPORT_SUPER", targetGroup: "HEAD_TARGET", evaluatorRole: Role.SUPPORT_SUPER, evaluatorScope: "SAME_MAIN_TEAM", categoryId: supervisorCategoryId, weightPoints: 5, sortOrder: 20 },
          { code: "SUPPORT_HEAD_SUPER", targetGroup: "SUPPORT_HEAD_TARGET", evaluatorRole: Role.SUPER, evaluatorScope: "SAME_MAIN_TEAM", categoryId: supervisorCategoryId, weightPoints: 5, sortOrder: 30 },
          { code: "SUPPORT_HEAD_SUPPORT_SUPER", targetGroup: "SUPPORT_HEAD_TARGET", evaluatorRole: Role.SUPPORT_SUPER, evaluatorScope: "SAME_MAIN_TEAM", categoryId: supervisorCategoryId, weightPoints: 2.5, sortOrder: 40 },
          { code: "SUPPORT_HEAD_HEAD", targetGroup: "SUPPORT_HEAD_TARGET", evaluatorRole: Role.HEAD, evaluatorScope: "SAME_DEPARTMENT_AND_TEAM", categoryId: supervisorCategoryId, weightPoints: 7.5, sortOrder: 50 },
          { code: "STAFF_SUPER", targetGroup: "STAFF_TARGET", evaluatorRole: Role.SUPER, evaluatorScope: "SAME_MAIN_TEAM", categoryId: staffCategoryId, weightPoints: 5, sortOrder: 60 },
          { code: "STAFF_SUPPORT_SUPER", targetGroup: "STAFF_TARGET", evaluatorRole: Role.SUPPORT_SUPER, evaluatorScope: "SAME_MAIN_TEAM", categoryId: staffCategoryId, weightPoints: 2.5, sortOrder: 70 },
          { code: "STAFF_HEAD", targetGroup: "STAFF_TARGET", evaluatorRole: Role.HEAD, evaluatorScope: "SAME_DEPARTMENT_AND_TEAM", categoryId: staffCategoryId, weightPoints: 6.25, sortOrder: 80 },
          { code: "STAFF_SUPPORT_HEAD", targetGroup: "STAFF_TARGET", evaluatorRole: Role.SUPPORT_HEAD, evaluatorScope: "SAME_DEPARTMENT_AND_TEAM", categoryId: staffCategoryId, weightPoints: 1.25, sortOrder: 90 },
          { code: "TRANSFER_QA_SUPER", targetGroup: "TRANSFER_QA_TARGET", evaluatorRole: Role.SUPER, evaluatorScope: "SAME_MAIN_TEAM", categoryId: supervisorCategoryId, weightPoints: 5, sortOrder: 100 },
          { code: "TRANSFER_QA_SUPPORT_SUPER", targetGroup: "TRANSFER_QA_TARGET", evaluatorRole: Role.SUPPORT_SUPER, evaluatorScope: "SAME_MAIN_TEAM", categoryId: supervisorCategoryId, weightPoints: 2.5, sortOrder: 110 },
          { code: "TRANSFER_QA_HEAD", targetGroup: "TRANSFER_QA_TARGET", evaluatorRole: Role.HEAD, evaluatorScope: "SAME_DEPARTMENT_AND_TEAM", categoryId: supervisorCategoryId, weightPoints: 7.5, sortOrder: 120 },
          { code: "CR_SUPER_CR", targetGroup: "CR_STAFF", evaluatorRole: Role.SUPER_CR, evaluatorScope: "ALL_CR_TEAMS", categoryId: staffCategoryId, weightPoints: 2.5, selectionMode: "PERIOD_SELECTED", sortOrder: 130 },
          { code: "CR_SELECTED_SUPER", targetGroup: "CR_STAFF", evaluatorRole: Role.SUPER, evaluatorScope: "SELECTED_USER", categoryId: staffCategoryId, weightPoints: 2.5, selectionMode: "PERIOD_SELECTED", sortOrder: 140 },
          { code: "CR_SELECTED_SUPPORT_SUPER", targetGroup: "CR_STAFF", evaluatorRole: Role.SUPPORT_SUPER, evaluatorScope: "SELECTED_USER", categoryId: staffCategoryId, weightPoints: 2.5, selectionMode: "PERIOD_SELECTED", sortOrder: 150 },
          { code: "CR_HEAD", targetGroup: "CR_STAFF", evaluatorRole: Role.HEAD, evaluatorScope: "ALL_CR_TEAMS", categoryId: staffCategoryId, weightPoints: 2.5, sortOrder: 160 },
        ],
      },
    },
    include: { rules: true },
  });
}

function shouldEvaluate(
  evaluator: { role: Role; department: { code: string } | null; team: { name: string; code: string } | null; id: string },
  target: EmployeeLike,
  targetGroup: string,
  rule: { evaluatorScope: string; evaluatorRole: Role; selectionMode: string; code: string },
  selectedUserId?: string,
): boolean {
  if (evaluator.id === target.id) return false;
  if (rule.selectionMode === "PERIOD_SELECTED" && selectedUserId && evaluator.id !== selectedUserId) return false;

  const evaluatorTeam = getMainTeamKey(evaluator.team);
  const targetTeam = getMainTeamKey(target.team);

  if (rule.evaluatorScope === "SELECTED_USER") return Boolean(selectedUserId && evaluator.id === selectedUserId);
  if (rule.evaluatorScope === "ALL_CR_TEAMS") return targetGroup === "CR_STAFF";

  // Super and Support Super must never evaluate Super-level employees.
  if ((evaluator.role === Role.SUPER || evaluator.role === Role.SUPPORT_SUPER) && targetGroup === "SUPER_TARGET") return false;
  if (rule.evaluatorScope === "SAME_MAIN_TEAM" && (!evaluatorTeam || evaluatorTeam !== targetTeam)) return false;
  if (rule.evaluatorScope === "SAME_DEPARTMENT_AND_TEAM") {
    if (!evaluatorTeam || evaluatorTeam !== targetTeam) return false;
    if (!evaluator.department?.code || evaluator.department.code !== target.department.code) return false;
  }

  return true;
}

async function syncEvaluatorForPeriod(db: DbClient, evaluatorUserId: string, period: any, ruleSet: any): Promise<number> {
  // Always clear the previous automatic rows first. This also removes stale
  // permissions when a user is deactivated or changed to a non-evaluator role.
  await db.evaluatorAssignment.deleteMany({
    where: { evaluatorUserId, periodId: period.id, source: AssignmentSource.AUTO },
  });

  const evaluator = await db.user.findFirst({
    where: { id: evaluatorUserId, deletedAt: null, isActive: true },
    include: { department: { select: { code: true } }, team: { select: { name: true, code: true } } },
  });
  const eligibleRoles: Role[] = [Role.SUPER, Role.SUPPORT_SUPER, Role.SUPER_CR, Role.HEAD, Role.SUPPORT_HEAD];
  if (!evaluator || !eligibleRoles.includes(evaluator.role)) {
    return 0;
  }

  const [employees, categories, selections] = await Promise.all([
    db.employee.findMany({
      where: { deletedAt: null, status: "active" },
      select: { id: true, position: true, department: { select: { code: true } }, team: { select: { name: true, code: true } } },
    }),
    db.evaluationCategory.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    db.periodEvaluatorSelection.findMany({ where: { periodId: period.id, isActive: true }, select: { slotKey: true, evaluatorUserId: true } }),
  ]);

  const selectionMap = new Map(selections.map((s) => [s.slotKey, s.evaluatorUserId]));
  const desired: any[] = [];
  const totalPoints = Number(ruleSet.totalPoints || 15);

  for (const employee of employees) {
    const targetGroup = getTargetGroup(employee as EmployeeLike);
    if (targetGroup === "SUPER_TARGET") continue;

    for (const rule of ruleSet.rules.filter((r: any) => r.isActive && r.evaluatorRole === evaluator.role && r.targetGroup === targetGroup)) {
      let selectedUserId: string | undefined;
      if (rule.code === "CR_SELECTED_SUPER") selectedUserId = selectionMap.get("CR_SUPER");
      if (rule.code === "CR_SELECTED_SUPPORT_SUPER") selectedUserId = selectionMap.get("CR_SUPPORT_SUPER");
      if (rule.code === "CR_SUPER_CR") selectedUserId = selectionMap.get("CR_SUPER_CR");

      if (rule.selectionMode === "PERIOD_SELECTED" && !selectedUserId) continue;
      if (rule.evaluatorScope === "ALL_CR_TEAMS" && evaluator.role === Role.HEAD && evaluator.department?.code !== "CR") continue;
      if (rule.evaluatorScope === "SAME_DEPARTMENT_AND_TEAM" && evaluator.role === Role.HEAD && evaluator.department?.code === "CR") continue;
      if (!shouldEvaluate(evaluator as any, employee as EmployeeLike, targetGroup, rule, selectedUserId)) continue;

      const categoryId = rule.categoryId || categoryIdForGroup(targetGroup, categories);
      if (!categoryId) continue;
      const weightPoints = Number(rule.weightPoints);
      desired.push({
        evaluatorUserId,
        assignmentType: "EMPLOYEE",
        targetEmployeeId: employee.id,
        periodId: period.id,
        categoryId,
        ruleId: rule.id,
        source: AssignmentSource.AUTO,
        weightPoints,
        weightPercentage: Number(((weightPoints / totalPoints) * 100).toFixed(2)),
        assignmentKey: `auto:v${ruleSet.version}:${period.id}:${evaluatorUserId}:${employee.id}:${rule.code}`,
      });
    }
  }

  for (let i = 0; i < desired.length; i += 500) {
    await db.evaluatorAssignment.createMany({ data: desired.slice(i, i + 500), skipDuplicates: true });
  }
  return desired.length;
}

export async function syncEvaluatorAssignmentsForUser(userId: string, periodId?: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const defaultRuleSet = await ensureDefaultRuleSet(tx);
    const periods = await tx.evaluationPeriod.findMany({
      where: { status: { in: periodId ? ["DRAFT", "ACTIVE", "LOCKED"] : OPEN_PERIOD_STATUSES as any }, ...(periodId ? { id: periodId } : {}) },
      include: { ruleSet: { include: { rules: true } } },
    });
    let count = 0;
    for (const period of periods) {
      if (period.status === "LOCKED" || period.status === "CLOSED") continue;
      const ruleSet = period.ruleSet || defaultRuleSet;
      if (!period.ruleSetId) await tx.evaluationPeriod.update({ where: { id: period.id }, data: { ruleSetId: ruleSet.id } });
      count += await syncEvaluatorForPeriod(tx, userId, period, ruleSet);
    }
    return count;
  }, { maxWait: 30000, timeout: 300000 });
}

export async function syncAllEvaluatorAssignments(): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const defaultRuleSet = await ensureDefaultRuleSet(tx);
    const [evaluators, periods] = await Promise.all([
      tx.user.findMany({ where: { deletedAt: null, isActive: true, role: { in: [Role.SUPER, Role.SUPPORT_SUPER, Role.SUPER_CR, Role.HEAD, Role.SUPPORT_HEAD] } }, select: { id: true } }),
      tx.evaluationPeriod.findMany({ where: { status: { in: OPEN_PERIOD_STATUSES as any } }, include: { ruleSet: { include: { rules: true } } } }),
    ]);
    let count = 0;
    for (const period of periods) {
      const ruleSet = period.ruleSet || defaultRuleSet;
      if (!period.ruleSetId) await tx.evaluationPeriod.update({ where: { id: period.id }, data: { ruleSetId: ruleSet.id } });
      for (const evaluator of evaluators) count += await syncEvaluatorForPeriod(tx, evaluator.id, period, ruleSet);
    }
    return count;
  }, { maxWait: 30000, timeout: 300000 });
}

export async function getDefaultRuleSet() {
  return ensureDefaultRuleSet(prisma);
}
