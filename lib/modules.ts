// lib/modules.ts — single source of truth for module access.
// Used by the Access-control screen (to render the matrix) and the Sidebar (to enforce).

export interface ModuleDef {
  key: string;        // stable key, also the route path
  label: string;
  group: string;
  configurable: boolean;   // can an owner toggle it per role/user?
  defaultRoles: string[];  // among CONFIG_ROLES — who sees it by default
}

// Roles an owner can configure. owner + super_admin always have everything.
export const CONFIG_ROLES = ["admin", "hr", "manager", "employee"];
export const ALWAYS_ALL_ROLES = ["super_admin", "owner"];

// configurable modules carry defaultRoles drawn from the current sidebar behaviour.
export const MODULES: ModuleDef[] = [
  // Work
  { key: "/tasks", label: "Tasks", group: "Work", configurable: true, defaultRoles: ["admin", "hr", "manager", "employee"] },
  // People
  { key: "/employees", label: "Employees", group: "People", configurable: true, defaultRoles: ["admin", "hr"] },
  { key: "/org-structure", label: "Org structure", group: "People", configurable: true, defaultRoles: ["admin", "hr"] },
  // HR
  { key: "/attendance", label: "Attendance", group: "HR", configurable: true, defaultRoles: ["admin", "hr", "manager"] },
  { key: "/work-schedule", label: "Work schedule", group: "HR", configurable: true, defaultRoles: ["admin", "hr"] },
  { key: "/payroll", label: "Payroll", group: "HR", configurable: true, defaultRoles: ["admin", "hr"] },
  { key: "/loans", label: "Loans & advances", group: "HR", configurable: true, defaultRoles: ["admin", "hr"] },
  { key: "/leaves", label: "Leaves", group: "HR", configurable: true, defaultRoles: ["admin", "hr", "manager"] },
  { key: "/offboarding", label: "Offboarding", group: "HR", configurable: true, defaultRoles: ["admin", "hr"] },
  { key: "/approvals", label: "Approvals", group: "HR", configurable: true, defaultRoles: ["admin", "hr", "manager"] },
  { key: "/letters", label: "HR Letters", group: "HR", configurable: true, defaultRoles: ["admin", "hr"] },
  // Finance
  { key: "/expenses", label: "Reimbursement", group: "Finance", configurable: true, defaultRoles: ["admin"] },
  { key: "/cashflow", label: "Cashflow", group: "Finance", configurable: true, defaultRoles: ["admin"] },
  { key: "/cash-register", label: "Cash Register", group: "Finance", configurable: true, defaultRoles: ["admin"] },
  // Commerce
  { key: "/store", label: "Store", group: "Commerce", configurable: true, defaultRoles: ["admin"] },
  // System
  { key: "/documents", label: "Documents", group: "System", configurable: true, defaultRoles: ["admin"] },
  { key: "/reports", label: "Reports", group: "System", configurable: true, defaultRoles: ["admin"] },
  { key: "/settings", label: "Settings", group: "System", configurable: true, defaultRoles: ["admin"] },
];

export const MODULE_GROUPS = ["People", "Work", "HR", "Finance", "Commerce", "System"];

// Effective check for one module.
// rolePerm  = module_permissions row value for (role, key)        | undefined if none
// override  = user_module_overrides row value for (user, key)     | undefined if none
export function isAllowed(mod: ModuleDef, role: string, rolePerm?: boolean, override?: boolean): boolean {
  if (ALWAYS_ALL_ROLES.includes(role)) return true;
  if (!mod.configurable) return mod.defaultRoles.includes(role);
  if (override !== undefined) return override;
  if (rolePerm !== undefined) return rolePerm;
  return mod.defaultRoles.includes(role);
}

// Build the set of allowed module keys for a user.
// rolePerms = { key: enabled } for this user's role; overrides = { key: enabled } for this user.
export function allowedModuleKeys(role: string, rolePerms: Record<string, boolean>, overrides: Record<string, boolean>): Set<string> {
  const set = new Set<string>();
  MODULES.forEach(m => { if (isAllowed(m, role, rolePerms[m.key], overrides[m.key])) set.add(m.key); });
  return set;
}