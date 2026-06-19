// lib/hierarchy.ts — reporting-chain helpers built on employees.reporting_manager_id.
// Everything in the task workspace keys off employee ids (assignee, creator, escalation).
// NOTE: employees has `full_name` (not `name`) and links to a login via `email` (no user_id column).

type SB = any; // supabase browser/server client

export interface EmpNode {
  id: string;
  name: string;                       // normalized display name (from full_name / first+last / email)
  reporting_manager_id: string | null;
}

function composeName(r: any): string {
  if (r?.full_name && String(r.full_name).trim()) return String(r.full_name).trim();
  const fl = [r?.first_name, r?.middle_name, r?.last_name].filter(Boolean).join(" ").trim();
  if (fl) return fl;
  if (r?.email) return String(r.email).split("@")[0];
  return "Unnamed";
}

const EMP_COLS = "id, full_name, first_name, middle_name, last_name, email, reporting_manager_id";

export async function resolveSelfEmployee(
  sb: SB,
  email: string,
  orgId: string
): Promise<{ employeeId: string; name: string; managerId: string | null } | null> {
  if (!email || !orgId) return null;
  const { data } = await sb
    .from("employees")
    .select(EMP_COLS)
    .eq("org_id", orgId)
    .ilike("email", email.trim())
    .maybeSingle();
  if (!data) return null;
  return { employeeId: data.id, name: composeName(data), managerId: data.reporting_manager_id ?? null };
}

export async function loadOrgGraph(sb: SB, orgId: string): Promise<EmpNode[]> {
  const { data } = await sb
    .from("employees")
    .select(EMP_COLS)
    .eq("org_id", orgId)
    .limit(2000);
  return (data || []).map((r: any) => ({
    id: r.id,
    name: composeName(r),
    reporting_manager_id: r.reporting_manager_id ?? null,
  })) as EmpNode[];
}

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

export function directReports(nodes: EmpNode[], managerId: string): EmpNode[] {
  return nodes.filter((n) => n.reporting_manager_id === managerId);
}

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

export function canViewTasksOf(nodes: EmpNode[], viewerId: string, targetId: string): boolean {
  if (viewerId === targetId) return true;
  return reportsUnder(nodes, viewerId).has(targetId);
}
