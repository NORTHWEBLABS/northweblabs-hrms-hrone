// lib/hierarchy.ts — reporting-chain helpers built on employees.reporting_manager_id.
// Everything in the task workspace keys off employee ids (assignee, creator, escalation).

type SB = any; // supabase browser/server client

export interface EmpNode {
  id: string;
  name: string;
  reporting_manager_id: string | null;
}

// Resolve the logged-in user (by email) to their employees row id + role.
// Returns null if the user has no matching employee record.
export async function resolveSelfEmployee(
  sb: SB,
  email: string,
  orgId: string
): Promise<{ employeeId: string; name: string; managerId: string | null } | null> {
  if (!email || !orgId) return null;
  const { data } = await sb
    .from("employees")
    .select("id, name, reporting_manager_id")
    .eq("org_id", orgId)
    .ilike("email", email.trim())
    .maybeSingle();
  if (!data) return null;
  return { employeeId: data.id, name: data.name, managerId: data.reporting_manager_id ?? null };
}

// Load the whole org's employee graph once; cheap for SMB sizes (<500 rows).
export async function loadOrgGraph(sb: SB, orgId: string): Promise<EmpNode[]> {
  const { data } = await sb
    .from("employees")
    .select("id, name, reporting_manager_id")
    .eq("org_id", orgId)
    .limit(2000);
  return (data || []) as EmpNode[];
}

// Build child-map (managerId -> direct reports) from a flat list.
function childMap(nodes: EmpNode[]): Map<string, EmpNode[]> {
  const m = new Map<string, EmpNode[]>();
  for (const n of nodes) {
    const mgr = n.reporting_manager_id;
    if (!mgr) continue;
    const arr = m.get(mgr) || [];
    arr.push(n);
    m.set(mgr, arr);
  }
  return m;
}

// All employee ids strictly BELOW a manager (direct + indirect). Excludes the manager themselves.
// Cycle-safe via a visited set.
export function reportsUnder(nodes: EmpNode[], managerId: string): Set<string> {
  const kids = childMap(nodes);
  const out = new Set<string>();
  const stack = [...(kids.get(managerId) || [])];
  while (stack.length) {
    const n = stack.pop()!;
    if (out.has(n.id)) continue;
    out.add(n.id);
    const more = kids.get(n.id);
    if (more) stack.push(...more);
  }
  return out;
}

// Direct reports only.
export function directReports(nodes: EmpNode[], managerId: string): EmpNode[] {
  return nodes.filter((n) => n.reporting_manager_id === managerId);
}

// The chain UP from an employee: [managerId, managersManagerId, ...] until the top.
// Used by escalation. Cycle-safe.
export function managerChain(nodes: EmpNode[], employeeId: string): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const chain: string[] = [];
  const seen = new Set<string>([employeeId]);
  let cur = byId.get(employeeId)?.reporting_manager_id ?? null;
  while (cur && !seen.has(cur)) {
    chain.push(cur);
    seen.add(cur);
    cur = byId.get(cur)?.reporting_manager_id ?? null;
  }
  return chain;
}

// Can `viewerId` see `targetId`'s tasks? True if same person or target is somewhere below viewer.
export function canViewTasksOf(nodes: EmpNode[], viewerId: string, targetId: string): boolean {
  if (viewerId === targetId) return true;
  return reportsUnder(nodes, viewerId).has(targetId);
}