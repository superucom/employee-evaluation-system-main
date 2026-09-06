import { Role } from "@prisma/client";

// ==========================================
// PERMISSION DEFINITIONS
// ==========================================

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: "dashboard:view",

  // Users (Manager only)
  USERS_CREATE: "users:create",
  USERS_READ: "users:read",
  USERS_UPDATE: "users:update",
  USERS_DELETE: "users:delete",
  USERS_RESET_PASSWORD: "users:reset_password",

  // Employees
  EMPLOYEES_CREATE: "employees:create",
  EMPLOYEES_READ: "employees:read",
  EMPLOYEES_READ_ASSIGNED: "employees:read_assigned",
  EMPLOYEES_UPDATE: "employees:update",
  EMPLOYEES_DELETE: "employees:delete",

  // Departments
  DEPARTMENTS_CREATE: "departments:create",
  DEPARTMENTS_READ: "departments:read",
  DEPARTMENTS_UPDATE: "departments:update",
  DEPARTMENTS_DELETE: "departments:delete",

  // Teams
  TEAMS_CREATE: "teams:create",
  TEAMS_READ: "teams:read",
  TEAMS_UPDATE: "teams:update",
  TEAMS_DELETE: "teams:delete",

  // Evaluation Periods
  PERIODS_CREATE: "periods:create",
  PERIODS_READ: "periods:read",
  PERIODS_UPDATE: "periods:update",
  PERIODS_LOCK: "periods:lock",

  // Evaluation Criteria
  CRITERIA_CREATE: "criteria:create",
  CRITERIA_READ: "criteria:read",
  CRITERIA_UPDATE: "criteria:update",
  CRITERIA_DELETE: "criteria:delete",

  // Evaluator Assignments
  ASSIGNMENTS_CREATE: "assignments:create",
  ASSIGNMENTS_READ: "assignments:read",
  ASSIGNMENTS_UPDATE: "assignments:update",
  ASSIGNMENTS_DELETE: "assignments:delete",

  // Evaluations
  EVALUATIONS_CREATE: "evaluations:create",
  EVALUATIONS_READ_ALL: "evaluations:read_all",
  EVALUATIONS_READ_OWN: "evaluations:read_own",
  EVALUATIONS_UPDATE_OWN_DRAFT: "evaluations:update_own_draft",
  EVALUATIONS_SUBMIT: "evaluations:submit",
  EVALUATIONS_OVERRIDE: "evaluations:override",

  // Reports
  REPORTS_READ: "reports:read",

  // Audit Logs
  AUDIT_LOGS_READ: "audit_logs:read",

  // Grades
  GRADES_CREATE: "grades:create",
  GRADES_READ: "grades:read",
  GRADES_UPDATE: "grades:update",
  GRADES_DELETE: "grades:delete",

  // Score Scales
  SCORE_SCALES_CREATE: "score_scales:create",
  SCORE_SCALES_READ: "score_scales:read",
  SCORE_SCALES_UPDATE: "score_scales:update",
  SCORE_SCALES_DELETE: "score_scales:delete",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ==========================================
// ROLE PERMISSION MAPPING
// ==========================================

const MANAGER_PERMISSIONS: Permission[] = [
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.USERS_CREATE,
  PERMISSIONS.USERS_READ,
  PERMISSIONS.USERS_UPDATE,
  PERMISSIONS.USERS_DELETE,
  PERMISSIONS.USERS_RESET_PASSWORD,
  PERMISSIONS.EMPLOYEES_CREATE,
  PERMISSIONS.EMPLOYEES_READ,
  PERMISSIONS.EMPLOYEES_READ_ASSIGNED,
  PERMISSIONS.EMPLOYEES_UPDATE,
  PERMISSIONS.EMPLOYEES_DELETE,
  PERMISSIONS.DEPARTMENTS_CREATE,
  PERMISSIONS.DEPARTMENTS_READ,
  PERMISSIONS.DEPARTMENTS_UPDATE,
  PERMISSIONS.DEPARTMENTS_DELETE,
  PERMISSIONS.TEAMS_CREATE,
  PERMISSIONS.TEAMS_READ,
  PERMISSIONS.TEAMS_UPDATE,
  PERMISSIONS.TEAMS_DELETE,
  PERMISSIONS.PERIODS_CREATE,
  PERMISSIONS.PERIODS_READ,
  PERMISSIONS.PERIODS_UPDATE,
  PERMISSIONS.PERIODS_LOCK,
  PERMISSIONS.CRITERIA_CREATE,
  PERMISSIONS.CRITERIA_READ,
  PERMISSIONS.CRITERIA_UPDATE,
  PERMISSIONS.CRITERIA_DELETE,
  PERMISSIONS.ASSIGNMENTS_CREATE,
  PERMISSIONS.ASSIGNMENTS_READ,
  PERMISSIONS.ASSIGNMENTS_UPDATE,
  PERMISSIONS.ASSIGNMENTS_DELETE,
  PERMISSIONS.EVALUATIONS_CREATE,
  PERMISSIONS.EVALUATIONS_READ_ALL,
  PERMISSIONS.EVALUATIONS_READ_OWN,
  PERMISSIONS.EVALUATIONS_UPDATE_OWN_DRAFT,
  PERMISSIONS.EVALUATIONS_SUBMIT,
  PERMISSIONS.EVALUATIONS_OVERRIDE,
  PERMISSIONS.REPORTS_READ,
  PERMISSIONS.AUDIT_LOGS_READ,
  PERMISSIONS.GRADES_CREATE,
  PERMISSIONS.GRADES_READ,
  PERMISSIONS.GRADES_UPDATE,
  PERMISSIONS.GRADES_DELETE,
  PERMISSIONS.SCORE_SCALES_CREATE,
  PERMISSIONS.SCORE_SCALES_READ,
  PERMISSIONS.SCORE_SCALES_UPDATE,
  PERMISSIONS.SCORE_SCALES_DELETE,
];

const EVALUATOR_PERMISSIONS: Permission[] = [
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.EMPLOYEES_READ_ASSIGNED,
  PERMISSIONS.DEPARTMENTS_READ,
  PERMISSIONS.TEAMS_READ,
  PERMISSIONS.PERIODS_READ,
  PERMISSIONS.CRITERIA_READ,
  PERMISSIONS.ASSIGNMENTS_READ,
  PERMISSIONS.EVALUATIONS_CREATE,
  PERMISSIONS.EVALUATIONS_READ_OWN,
  PERMISSIONS.EVALUATIONS_UPDATE_OWN_DRAFT,
  PERMISSIONS.EVALUATIONS_SUBMIT,
  PERMISSIONS.GRADES_READ,
  PERMISSIONS.SCORE_SCALES_READ,
];

const HEAD_PERMISSIONS: Permission[] = [
  ...EVALUATOR_PERMISSIONS,
  PERMISSIONS.EMPLOYEES_READ,
  PERMISSIONS.REPORTS_READ,
];

const SUPPORT_HEAD_PERMISSIONS: Permission[] = [
  ...EVALUATOR_PERMISSIONS,
  PERMISSIONS.EMPLOYEES_READ,
  PERMISSIONS.REPORTS_READ,
];

const SUPER_PERMISSIONS: Permission[] = [...EVALUATOR_PERMISSIONS];
const SUPPORT_SUPER_PERMISSIONS: Permission[] = [...EVALUATOR_PERMISSIONS];
const SUPER_CR_PERMISSIONS: Permission[] = [...EVALUATOR_PERMISSIONS];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.MANAGER]: MANAGER_PERMISSIONS,
  [Role.SUPER]: SUPER_PERMISSIONS,
  [Role.SUPPORT_SUPER]: SUPPORT_SUPER_PERMISSIONS,
  [Role.SUPER_CR]: SUPER_CR_PERMISSIONS,
  [Role.HEAD]: HEAD_PERMISSIONS,
  [Role.SUPPORT_HEAD]: SUPPORT_HEAD_PERMISSIONS,
  [Role.EVALUATOR]: EVALUATOR_PERMISSIONS,
};

// ==========================================
// RBAC ENGINE
// ==========================================

export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] ?? [];
  return permissions.includes(permission);
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

// ==========================================
// ROUTE PERMISSION MAP (for middleware)
// ==========================================

export const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  "/dashboard": [PERMISSIONS.DASHBOARD_VIEW],
  "/users": [PERMISSIONS.USERS_READ],
  "/employees": [PERMISSIONS.EMPLOYEES_READ, PERMISSIONS.EMPLOYEES_READ_ASSIGNED],
  "/departments": [PERMISSIONS.DEPARTMENTS_READ],
  "/teams": [PERMISSIONS.TEAMS_READ],
  "/evaluation-periods": [PERMISSIONS.PERIODS_READ],
  "/evaluation-criteria": [PERMISSIONS.CRITERIA_READ],
  "/evaluation-rules": [PERMISSIONS.ASSIGNMENTS_READ],
  "/evaluator-assignments": [PERMISSIONS.ASSIGNMENTS_READ],
  "/evaluations": [PERMISSIONS.EVALUATIONS_READ_OWN, PERMISSIONS.EVALUATIONS_READ_ALL],
  "/reports": [PERMISSIONS.REPORTS_READ],
  "/audit-logs": [PERMISSIONS.AUDIT_LOGS_READ],
};

// Manager-only routes (exact role check)
export const MANAGER_ONLY_ROUTES = [
  "/users",
  "/departments",
  "/teams",
  "/evaluation-criteria",
  "/evaluator-assignments",
  "/evaluation-rules",
  "/reports",
  "/audit-logs",
];
