"use client";
// Route: app/(dashboard)/tasks/page.tsx
// Task Workspace — lane board + My/Team toggle + table + list, with TAT clock,
// submit → verify/reject flow, and reporting-hierarchy scoping.

import { useState, useEffect, useMemo, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  resolveSelfEmployee, loadOrgGraph, reportsUnder, type EmpNode,
} from "@/lib/hierarchy";
import {
  Plus, X, Loader2, CheckCircle2, AlertCircle, Flag, Calendar, Clock,
  Search, LayoutGrid, Table as TableIcon, List as ListIcon, RotateCcw,
  Play, Send, Check, Trash2, ChevronRight, User as UserIcon, Users, Palette,
  PanelLeft, BarChart3, Eye, EyeOff, AlertTriangle, Paperclip,
} from "lucide-react";

/* ─────────── types ─────────── */
type Status = "todo" | "inprogress" | "submitted" | "verified";
type Priority = "none" | "low" | "medium" | "high" | "urgent";
type ChecklistItem = { id: string; text: string; done: boolean };

interface Task {
  id: string; org_id: string; title: string; description: string | null;
  assignee_id: string | null; created_by: string | null;
  status: Status; priority: Priority;
  tat_hours: number | null; assigned_at: string | null; due_at: string | null;
  started_at: string | null; submitted_at: string | null; submitted_by: string | null;
  verified_at: string | null; verified_by: string | null;
  reopen_count: number; checklist: ChecklistItem[];
  created_at: string;
}
interface Activity { id: string; task_id: string; actor_id: string | null; action: string; detail: any; created_at: string; }
type ViewMode = "board" | "table";
type Scope = "mine" | "team";

/* ─────────── constants ─────────── */
const LANES: { id: Status; label: string; color: string; bg: string }[] = [
  { id: "todo",       label: "To do",       color: "#475569", bg: "#f1f5f9" },
  { id: "inprogress", label: "In progress", color: "#0369a1", bg: "#e0f2fe" },
  { id: "submitted",  label: "Submitted",   color: "#a16207", bg: "#fef9c3" },
  { id: "verified",   label: "Verified",    color: "#15803d", bg: "#dcfce7" },
];
const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  todo:       { label: "To do",       color: "#475569", bg: "#f1f5f9" },
  inprogress: { label: "In progress", color: "#0369a1", bg: "#e0f2fe" },
  submitted:  { label: "Submitted",   color: "#a16207", bg: "#fef9c3" },
  verified:   { label: "Verified",    color: "#15803d", bg: "#dcfce7" },
};
const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string }> = {
  none:   { label: "None",   color: "#64748b", bg: "#f1f5f9" },
  low:    { label: "Low",    color: "#0369a1", bg: "#e0f2fe" },
  medium: { label: "Medium", color: "#a16207", bg: "#fef3c7" },
  high:   { label: "High",   color: "#c2410c", bg: "#ffedd5" },
  urgent: { label: "Urgent", color: "#be123c", bg: "#ffe4e6" },
};
const PRIORITIES: Priority[] = ["none", "low", "medium", "high", "urgent"];
const ADMIN_LIKE = ["owner", "admin", "super_admin"];

/* pastel theming — column colors + board background (persisted per browser) */
type PastelKey = "slate" | "blue" | "amber" | "green" | "pink" | "purple" | "teal" | "rose";
const COLUMN_PASTELS: Record<PastelKey, { chipBg: string; chipText: string; colBg: string; bar: string }> = {
  slate:  { chipBg: "#eef2f7", chipText: "#475569", colBg: "#f8fafc", bar: "#94a3b8" },
  blue:   { chipBg: "#e0f2fe", chipText: "#0369a1", colBg: "#f2f9ff", bar: "#60a5fa" },
  amber:  { chipBg: "#fef3c7", chipText: "#a16207", colBg: "#fffdf2", bar: "#fbbf24" },
  green:  { chipBg: "#dcfce7", chipText: "#15803d", colBg: "#f3fdf6", bar: "#4ade80" },
  pink:   { chipBg: "#fce7f3", chipText: "#be185d", colBg: "#fdf4f9", bar: "#f472b6" },
  purple: { chipBg: "#ede9fe", chipText: "#6d28d9", colBg: "#f7f5ff", bar: "#a78bfa" },
  teal:   { chipBg: "#ccfbf1", chipText: "#0f766e", colBg: "#f2fdfb", bar: "#2dd4bf" },
  rose:   { chipBg: "#ffe4e6", chipText: "#be123c", colBg: "#fff4f5", bar: "#fb7185" },
};
const PASTEL_KEYS = Object.keys(COLUMN_PASTELS) as PastelKey[];
const DEFAULT_COLUMN_COLORS: Record<Status, PastelKey> = { todo: "slate", inprogress: "blue", submitted: "amber", verified: "green" };
const BOARD_BGS: { key: string; label: string; value: string }[] = [
  { key: "paper",  label: "Paper",  value: "#f7f8fa" },
  { key: "white",  label: "White",  value: "#ffffff" },
  { key: "violet", label: "Violet", value: "#f5f3ff" },
  { key: "blue",   label: "Sky",    value: "#f0f9ff" },
  { key: "green",  label: "Mint",   value: "#f0fdf4" },
  { key: "amber",  label: "Cream",  value: "#fffbeb" },
  { key: "pink",   label: "Blush",  value: "#fdf2f8" },
];
const ASSIGN_ANYONE = ["owner", "admin", "hr", "super_admin"];
const MANAGER_ROLES = ["owner", "admin", "hr", "manager", "super_admin"];

/* ─────────── helpers ─────────── */
const uid = () => Math.random().toString(36).slice(2, 11);
const sbClient = () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const nowIso = () => new Date().toISOString();

function humanize(ms: number): string {
  const a = Math.abs(ms);
  const h = a / 3600000;
  if (h < 1) return Math.max(1, Math.round(a / 60000)) + "m";
  if (h < 48) return Math.round(h) + "h";
  return Math.round(h / 24) + "d";
}

// TAT badge for a task
function tatBadge(t: Task): { label: string; color: string; bg: string } | null {
  if (t.status === "verified") return { label: "Done", color: "#15803d", bg: "#dcfce7" };
  if (t.status === "submitted") return { label: "In review", color: "#a16207", bg: "#fef9c3" };
  if (!t.due_at) return { label: "No TAT", color: "#64748b", bg: "#f1f5f9" };
  const due = new Date(t.due_at).getTime();
  const rem = due - Date.now();
  const tatMs = (t.tat_hours ?? 0) * 3600000;
  if (rem < 0) return { label: "Overdue " + humanize(rem), color: "#dc2626", bg: "#fee2e2" };
  if (tatMs > 0 && rem < tatMs * 0.2) return { label: "Due in " + humanize(rem), color: "#ea580c", bg: "#ffedd5" };
  return { label: "Due in " + humanize(rem), color: "#0f766e", bg: "#ccfbf1" };
}

const fmtDateTime = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

/* ══════════════════════════════════════════════════════════════════════════
   MAIN
   ══════════════════════════════════════════════════════════════════════════ */
export default function TasksPage() {
  const sb = useMemo(() => sbClient(), []);

  const [orgId, setOrgId] = useState("");
  const [role, setRole] = useState("employee");
  const [self, setSelf] = useState<{ employeeId: string; name: string; managerId: string | null } | null>(null);
  const [viewerName, setViewerName] = useState("You");
  const [graph, setGraph] = useState<EmpNode[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<ViewMode>("board");
  const [scope, setScope] = useState<Scope>("mine");
  const [search, setSearch] = useState("");

  // pastel theme (persisted per browser, keyed by org)
  const [columnColors, setColumnColors] = useState<Record<Status, PastelKey>>(DEFAULT_COLUMN_COLORS);
  const [boardBg, setBoardBg] = useState<string>("#f7f8fa");
  const [cardBorder, setCardBorder] = useState<string>("match"); // "match" | PastelKey | "subtle"
  const [palette, setPalette] = useState<null | { kind: "bg" } | { kind: "col"; status: Status }>(null);

  // left analytics/controls panel + view filters
  const [showPanel, setShowPanel] = useState(false);
  const [hideVerified, setHideVerified] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState<null | Status>(null);
  const [rejectFor, setRejectFor] = useState<Task | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const flash = (msg: string, type: "success" | "error" = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2600); };

  // persist theme: local cache always; shared DB row when the viewer may edit the org theme
  useEffect(() => {
    if (!orgId) return;
    try { localStorage.setItem("taskBoardTheme:" + orgId, JSON.stringify({ columnColors, boardBg, cardBorder })); } catch { /* ignore */ }
    if (loading || !ASSIGN_ANYONE.includes(role)) return;
    sb.from("task_board_prefs").upsert(
      { org_id: orgId, column_colors: columnColors, board_bg: boardBg, card_border: cardBorder, updated_at: new Date().toISOString() },
      { onConflict: "org_id" }
    ).then(() => {}, () => {});
  }, [orgId, columnColors, boardBg, cardBorder, loading, role, sb]);

  const nameOf = useCallback((id: string | null | undefined) => graph.find(e => e.id === id)?.name ?? "—", [graph]);

  /* ── load ── */
  useEffect(() => {
    (async () => {
      const oid = typeof window !== "undefined" ? localStorage.getItem("activeOrgId") || "" : "";
      const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
      if (!oid) { setLoading(false); return; }
      setOrgId(oid);

      // restore saved board theme
      try {
        const raw = localStorage.getItem("taskBoardTheme:" + oid);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved.columnColors) setColumnColors({ ...DEFAULT_COLUMN_COLORS, ...saved.columnColors });
          if (saved.boardBg) setBoardBg(saved.boardBg);
          if (saved.cardBorder) setCardBorder(saved.cardBorder);
        }
      } catch { /* ignore */ }

      // shared org theme (DB) overrides local cache when present
      try {
        const { data: prefs } = await sb.from("task_board_prefs").select("column_colors, board_bg, card_border").eq("org_id", oid).maybeSingle();
        if (prefs) {
          if (prefs.column_colors && Object.keys(prefs.column_colors).length) setColumnColors({ ...DEFAULT_COLUMN_COLORS, ...prefs.column_colors });
          if (prefs.board_bg) setBoardBg(prefs.board_bg);
          if (prefs.card_border) setCardBorder(prefs.card_border);
        }
      } catch { /* table may not exist yet */ }

      // role from users
      let r = "employee";
      if (email) {
        const { data: u } = await sb.from("users").select("role").eq("email", email).maybeSingle();
        if (u?.role) r = u.role;
      }
      setRole(r);

      const g = await loadOrgGraph(sb, oid);
      setGraph(g);
      const me = email ? await resolveSelfEmployee(sb, email, oid) : null;
      setSelf(me);
      setViewerName(me?.name || (email ? email.split("@")[0] : (r || "You")));

      // default scope: managers with reports — or admins with no employee row — start on Team
      const reports = me ? reportsUnder(g, me.employeeId) : new Set<string>();
      if (ADMIN_LIKE.includes(r) || !me || reports.size > 0) setScope("team");

      const { data: ts } = await sb.from("tasks").select("*").eq("org_id", oid).order("created_at", { ascending: false });
      setTasks((ts || []) as Task[]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── derived perms ── */
  const myId = self?.employeeId ?? null;
  const isAdminLike = ADMIN_LIKE.includes(role);
  const canEditTheme = ASSIGN_ANYONE.includes(role);
  const canAssignAnyone = ASSIGN_ANYONE.includes(role);
  const isManager = MANAGER_ROLES.includes(role);
  const myReports = useMemo(() => (myId ? reportsUnder(graph, myId) : new Set<string>()), [graph, myId]);
  const canSeeTeam = isAdminLike || myReports.size > 0;

  const isAssignee = (t: Task) => !!myId && t.assignee_id === myId;
  const canVerify = (t: Task) =>
    isAdminLike ||
    (!!myId && t.created_by === myId) ||
    (!!t.assignee_id && myReports.has(t.assignee_id)) ||
    (!!myId && t.assignee_id === myId && t.created_by === myId);
  const canEdit = (t: Task) => isAdminLike || (!!myId && (t.created_by === myId)) || canVerify(t);

  const assignOptions = useMemo(() => {
    if (canAssignAnyone) return graph;
    if (isManager && myId) return graph.filter(e => myReports.has(e.id) || e.id === myId);
    return graph.filter(e => e.id === myId);
  }, [graph, canAssignAnyone, isManager, myId, myReports]);

  /* ── scoped + filtered ── */
  const scoped = useMemo(() => {
    let list = tasks;
    if (scope === "mine") {
      list = tasks.filter(t => t.assignee_id === myId || t.created_by === myId);
    } else {
      if (isAdminLike) list = tasks; // see all org tasks
      else list = tasks.filter(t => (t.assignee_id && myReports.has(t.assignee_id)) || t.assignee_id === myId || t.created_by === myId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || nameOf(t.assignee_id).toLowerCase().includes(q));
    }
    return list;
  }, [tasks, scope, myId, isAdminLike, myReports, search, nameOf]);

  // board/table/list show this (scoped + view filters)
  const shown = useMemo(() => {
    let list = scoped;
    if (hideVerified) list = list.filter(t => t.status !== "verified");
    if (priorityFilter !== "all") list = list.filter(t => t.priority === priorityFilter);
    return list;
  }, [scoped, hideVerified, priorityFilter]);

  // analytics (from scoped, ignoring the view filters so totals stay honest)
  const stats = useMemo(() => {
    const active = scoped.filter(t => t.status === "todo" || t.status === "inprogress");
    const overdue = active.filter(t => t.due_at && new Date(t.due_at).getTime() < Date.now()).length;
    const judged = scoped.filter(t => (t.status === "submitted" || t.status === "verified") && t.due_at && t.submitted_at);
    const onTime = judged.filter(t => new Date(t.submitted_at!).getTime() <= new Date(t.due_at!).getTime()).length;
    return {
      total: scoped.length,
      open: active.length,
      review: scoped.filter(t => t.status === "submitted").length,
      verified: scoped.filter(t => t.status === "verified").length,
      overdue,
      onTimeRate: judged.length ? Math.round((onTime / judged.length) * 100) : null,
    };
  }, [scoped]);

  const byPerson = useMemo(() => {
    const m = new Map<string, { open: number; overdue: number }>();
    scoped.forEach(t => {
      if (!t.assignee_id || t.status === "verified") return;
      const e = m.get(t.assignee_id) || { open: 0, overdue: 0 };
      e.open++;
      if ((t.status === "todo" || t.status === "inprogress") && t.due_at && new Date(t.due_at).getTime() < Date.now()) e.overdue++;
      m.set(t.assignee_id, e);
    });
    return Array.from(m.entries()).map(([id, v]) => ({ id, name: nameOf(id), ...v })).sort((a, b) => b.open - a.open).slice(0, 7);
  }, [scoped, nameOf]);

  /* ── mutations ── */
  const patchLocal = (id: string, patch: Partial<Task>) =>
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));

  const logActivity = async (taskId: string, action: string, detail?: any) => {
    if (!orgId) return;
    try {
      const { data } = await sb.from("task_activity").insert({ org_id: orgId, task_id: taskId, actor_id: myId, action, detail: detail ?? null }).select().single();
      if (data && drawerId === taskId) setActivity(p => [data as Activity, ...p]);
    } catch { /* best effort */ }
  };

  const createTask = async (input: {
    title: string; description: string; assigneeId: string; tatHours: number; priority: Priority; status: Status; checklist: ChecklistItem[];
  }) => {
    if (!orgId || !myId) return;
    const assigned = nowIso();
    const due = input.tatHours > 0 ? new Date(Date.now() + input.tatHours * 3600000).toISOString() : null;
    const row = {
      org_id: orgId, title: input.title.trim(), description: input.description.trim() || null,
      assignee_id: input.assigneeId || myId, created_by: myId,
      status: input.status, priority: input.priority,
      tat_hours: input.tatHours || null, assigned_at: assigned, due_at: due,
      checklist: input.checklist, position: Date.now(),
    };
    const { data, error } = await sb.from("tasks").insert(row).select("*").single();
    if (error) { flash(error.message, "error"); return; }
    setTasks(prev => [data as Task, ...prev]);
    logActivity((data as Task).id, "created", { assignee: nameOf(row.assignee_id), tat_hours: input.tatHours });
    setShowCreate(null);
    flash("Task created");
  };

  const startTask = async (t: Task) => {
    const patch = { status: "inprogress" as Status, started_at: t.started_at || nowIso() };
    patchLocal(t.id, patch);
    await sb.from("tasks").update({ ...patch, updated_at: nowIso() }).eq("id", t.id);
    logActivity(t.id, "started");
  };
  const submitTask = async (t: Task) => {
    const patch = { status: "submitted" as Status, submitted_at: nowIso(), submitted_by: myId };
    patchLocal(t.id, patch);
    await sb.from("tasks").update({ ...patch, updated_at: nowIso() }).eq("id", t.id);
    logActivity(t.id, "submitted");
    flash("Submitted for review");
  };
  const verifyTask = async (t: Task) => {
    const patch = { status: "verified" as Status, verified_at: nowIso(), verified_by: myId };
    patchLocal(t.id, patch);
    await sb.from("tasks").update({ ...patch, updated_at: nowIso() }).eq("id", t.id);
    logActivity(t.id, "verified");
    flash("Task verified & closed");
  };
  const rejectTask = async (t: Task, reason: string, tatHours: number) => {
    const due = tatHours > 0 ? new Date(Date.now() + tatHours * 3600000).toISOString() : null;
    const patch = {
      status: "inprogress" as Status, submitted_at: null, submitted_by: null,
      reopen_count: (t.reopen_count || 0) + 1,
      tat_hours: tatHours || null, assigned_at: nowIso(), due_at: due,
    };
    patchLocal(t.id, patch as Partial<Task>);
    await sb.from("tasks").update({ ...patch, last_reopened_at: nowIso(), updated_at: nowIso() }).eq("id", t.id);
    logActivity(t.id, "reopened", { reason, tat_hours: tatHours });
    setRejectFor(null);
    flash("Sent back with a fresh TAT");
  };
  const editTask = async (t: Task, patch: Partial<Task>) => {
    patchLocal(t.id, patch);
    await sb.from("tasks").update({ ...patch, updated_at: nowIso() }).eq("id", t.id);
  };
  const deleteTask = async (t: Task) => {
    setTasks(prev => prev.filter(x => x.id !== t.id));
    setDrawerId(null);
    await sb.from("tasks").delete().eq("id", t.id);
  };

  // status change requested via drag or buttons — routes to the right guarded action
  const requestStatusChange = (t: Task, to: Status) => {
    if (t.status === to) return;
    if (to === "verified" && t.status === "submitted") {
      if (canVerify(t)) verifyTask(t); else flash("Only the manager/creator can verify", "error");
      return;
    }
    if (to === "inprogress" && t.status === "submitted") {
      if (canVerify(t)) setRejectFor(t); else flash("Only the manager/creator can reject", "error");
      return;
    }
    if (to === "submitted" && t.status === "inprogress") {
      if (isAssignee(t)) submitTask(t); else flash("Only the assignee can submit", "error");
      return;
    }
    if (to === "inprogress" && t.status === "todo") {
      if (isAssignee(t) || canVerify(t)) startTask(t); else flash("Only the assignee can start this", "error");
      return;
    }
    // any other move (e.g. backwards) — managers/admin only
    if (isAdminLike || canVerify(t)) {
      patchLocal(t.id, { status: to });
      sb.from("tasks").update({ status: to, updated_at: nowIso() }).eq("id", t.id);
      logActivity(t.id, "status_changed", { to });
    } else {
      flash("You can't move this card", "error");
    }
  };

  const openDrawer = async (id: string) => {
    setDrawerId(id);
    const { data } = await sb.from("task_activity").select("*").eq("task_id", id).order("created_at", { ascending: false });
    setActivity((data || []) as Activity[]);
  };

  const drawerTask = tasks.find(t => t.id === drawerId) || null;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>;

  // Owners/admins/HR/super_admin can run Tasks without an employee row (they create/assign/verify
  // and see all org tasks); they just can't be an assignee. Only block a plain employee with no record.
  if (!self && !isAdminLike && role !== "hr") return (
    <div className="max-w-md mx-auto mt-16 text-center">
      <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
      <p className="text-sm font-semibold text-gray-700">No employee record found for your login</p>
      <p className="text-xs text-gray-400 mt-1">Tasks key off your employee profile. Ask an admin to link your user to an employee in this org.</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-400">Assign, track TAT and verify work across your team</p>
        </div>

        <button onClick={() => setShowPanel(s => !s)} title="Toggle insights panel"
          className={`flex items-center justify-center w-9 h-9 rounded-lg border transition ${showPanel ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
          <PanelLeft className="w-4 h-4" />
        </button>

        {/* scope toggle */}
        {canSeeTeam && (
          <div className="ml-2 flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5">
            {([["mine", "My tasks", UserIcon], ["team", "Team", Users]] as const).map(([id, label, Icon]) => (
              <button key={id} onClick={() => setScope(id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${scope === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
        )}

        {/* view tabs */}
        <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5">
          {([["board", "Board", LayoutGrid], ["table", "Table", TableIcon]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setView(id)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${view === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="w-36 md:w-44 pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
          {canEditTheme && <div className="relative">
            <button onClick={() => setPalette(palette && (palette as any).kind === "bg" ? null : { kind: "bg" })}
              title="Board background"
              className="flex items-center justify-center w-9 h-9 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-500">
              <Palette className="w-4 h-4" />
            </button>
            {palette && (palette as any).kind === "bg" && (
              <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-gray-200 bg-white p-3 shadow-lg space-y-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Background</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {BOARD_BGS.map(b => (
                      <button key={b.key} title={b.label} onClick={() => setBoardBg(b.value)}
                        className={`h-8 rounded-lg border-2 ${boardBg === b.value ? "border-indigo-500" : "border-gray-200"}`}
                        style={{ background: b.value }} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Card border</div>
                  <div className="flex gap-1.5 mb-1.5">
                    <button onClick={() => setCardBorder("match")} className={`flex-1 rounded-lg border py-1 text-[10px] font-semibold ${cardBorder === "match" ? "border-indigo-500 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-500"}`}>Match column</button>
                    <button onClick={() => setCardBorder("subtle")} className={`flex-1 rounded-lg border py-1 text-[10px] font-semibold ${cardBorder === "subtle" ? "border-indigo-500 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-500"}`}>Subtle</button>
                  </div>
                  <div className="grid grid-cols-8 gap-1">
                    {PASTEL_KEYS.map(k => (
                      <button key={k} onClick={() => setCardBorder(k)}
                        className={`h-5 w-5 rounded-full border-2 ${cardBorder === k ? "border-gray-900" : "border-white"}`}
                        style={{ background: COLUMN_PASTELS[k].bar }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>}
          <button onClick={() => setShowCreate("todo")}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700">
            <Plus className="w-4 h-4" />New task
          </button>
        </div>
      </div>

      {/* views */}
      <div className="flex gap-4 relative">
        {showPanel && <div onClick={() => setShowPanel(false)} className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" />}
        {showPanel && (
          <aside className="fixed lg:static inset-y-0 left-0 z-50 lg:z-auto w-72 lg:w-60 shrink-0 flex flex-col gap-3 overflow-y-auto bg-gray-50 lg:bg-transparent p-3 lg:p-0 shadow-2xl lg:shadow-none">
            <div className="flex items-center justify-between lg:hidden">
              <span className="text-sm font-bold text-gray-700">Insights & filters</span>
              <button onClick={() => setShowPanel(false)} className="p-1.5 rounded-lg hover:bg-gray-200"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <button onClick={() => setShowCreate("todo")} className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm">
              <Plus className="w-4 h-4" />New task
            </button>
            {/* insights */}
            <div className="rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm">
              <div className="flex items-center gap-1.5 mb-3">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Insights</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Open" value={stats.open} />
                <Stat label="In review" value={stats.review} tone="amber" />
                <Stat label="Overdue" value={stats.overdue} tone="rose" />
                <Stat label="Verified" value={stats.verified} tone="green" />
              </div>
              <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">On-time TAT</div>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-xl font-bold text-gray-900">{stats.onTimeRate === null ? "—" : stats.onTimeRate + "%"}</span>
                  <span className="text-[10px] text-gray-400">submitted before due</span>
                </div>
              </div>
            </div>

            {/* filters */}
            <div className="rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2.5">Filters</div>
              <button onClick={() => setHideVerified(v => !v)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold transition ${hideVerified ? "bg-indigo-50 text-indigo-600" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}>
                <span>Hide verified</span>
                {hideVerified ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <div className="mt-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Priority</div>
                <div className="flex flex-wrap gap-1">
                  {(["all", ...PRIORITIES] as const).map(p => (
                    <button key={p} onClick={() => setPriorityFilter(p as any)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border transition ${priorityFilter === p ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                      {p === "all" ? "All" : PRIORITY_META[p as Priority].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* by person — team scope */}
            {scope === "team" && byPerson.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Workload</span>
                </div>
                <div className="space-y-1.5">
                  {byPerson.map(p => (
                    <div key={p.id} className="flex items-center gap-2 text-xs">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[9px] font-bold text-white shrink-0">{p.name.slice(0, 1).toUpperCase()}</span>
                      <span className="flex-1 truncate text-gray-700">{p.name}</span>
                      <span className="font-semibold text-gray-900">{p.open}</span>
                      {p.overdue > 0 && <span className="flex items-center gap-0.5 text-[10px] font-semibold text-rose-600"><AlertTriangle className="w-2.5 h-2.5" />{p.overdue}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}

        <div className="flex-1 min-w-0">
      {view === "board" && (
        <div className="flex gap-4 overflow-x-auto pb-3 rounded-2xl p-3 -mx-1 transition-colors" style={{ backgroundColor: boardBg, backgroundImage: "radial-gradient(circle, rgba(15,23,42,0.06) 1px, transparent 1px)", backgroundSize: "18px 18px" }}>
          {LANES.map(lane => {
            const items = shown.filter(t => t.status === lane.id);
            const pk = columnColors[lane.id];
            const pal = COLUMN_PASTELS[pk];
            const cardBorderColor = cardBorder === "match" ? pal.bar
              : cardBorder === "subtle" ? "rgba(15,23,42,0.10)"
              : (COLUMN_PASTELS[cardBorder as PastelKey]?.bar ?? pal.bar);
            return (
              <div key={lane.id}
                onDragOver={e => e.preventDefault()}
                onDrop={() => { if (draggingId) { const t = tasks.find(x => x.id === draggingId); if (t) requestStatusChange(t, lane.id); setDraggingId(null); } }}
                className="flex w-[290px] shrink-0 flex-col rounded-2xl border border-black/5 shadow-sm"
                style={{ background: pal.colBg }}>
                {/* column header */}
                <div className="relative flex items-center gap-2 px-3 pt-3 pb-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: pal.bar }} />
                  <span className="text-sm font-bold text-gray-800">{lane.label}</span>
                  <span className="rounded-full px-1.5 text-[11px] font-semibold" style={{ background: pal.chipBg, color: pal.chipText }}>{items.length}</span>
                  {canEditTheme && <button onClick={() => setPalette(palette && (palette as any).kind === "col" && (palette as any).status === lane.id ? null : { kind: "col", status: lane.id })}
                    title="Column colour" className="ml-auto rounded-md p-1 text-gray-400 hover:bg-black/5 hover:text-gray-600">
                    <Palette className="w-3.5 h-3.5" />
                  </button>}
                  {canEditTheme && palette && (palette as any).kind === "col" && (palette as any).status === lane.id && (
                    <div className="absolute right-2 top-10 z-50 w-40 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-1 mb-1.5">Column colour</div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {PASTEL_KEYS.map(k => (
                          <button key={k} onClick={() => { setColumnColors(c => ({ ...c, [lane.id]: k })); setPalette(null); }}
                            className={`h-7 w-7 rounded-full border-2 ${pk === k ? "border-gray-900" : "border-white"}`}
                            style={{ background: COLUMN_PASTELS[k].bar }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="h-px mx-3" style={{ background: pal.bar, opacity: 0.35 }} />

                {/* cards */}
                <div className="flex-1 space-y-2.5 overflow-y-auto p-2.5 min-h-[140px]">
                  {items.map(t => {
                    const badge = tatBadge(t);
                    const pm = PRIORITY_META[t.priority];
                    return (
                      <div key={t.id} draggable onDragStart={() => setDraggingId(t.id)} onClick={() => openDrawer(t.id)}
                        className="group cursor-pointer rounded-xl bg-white p-3 shadow-[0_2px_4px_rgba(15,23,42,0.08),0_10px_24px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(15,23,42,0.12),0_16px_32px_rgba(15,23,42,0.16)] active:cursor-grabbing"
                        style={{ border: `2px solid ${cardBorderColor}` }}>
                        <div className="text-[13.5px] font-semibold text-gray-900 leading-snug line-clamp-2">{t.title}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: pm.bg, color: pm.color }}>{pm.label}</span>
                          {badge && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>}
                          {t.reopen_count > 0 && <span className="flex items-center gap-0.5 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600"><RotateCcw className="w-2.5 h-2.5" />{t.reopen_count}</span>}
                        </div>
                        <div className="mt-2.5 flex items-center gap-1.5 border-t border-gray-100 pt-2">
                          {t.assignee_id
                            ? <span className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: pal.bar }} title={nameOf(t.assignee_id)}>{nameOf(t.assignee_id).slice(0, 1).toUpperCase()}</span>
                            : <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[9px] font-bold text-gray-400">?</span>}
                          <span className="text-[11px] text-gray-500 truncate">{nameOf(t.assignee_id)}</span>
                        </div>
                      </div>
                    );
                  })}
                  {lane.id === "todo" && (
                    <button onClick={() => setShowCreate("todo")} className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 bg-white/50 py-2.5 text-[11px] font-semibold text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-white">
                      <Plus className="w-3.5 h-3.5" />Add task
                    </button>
                  )}
                  {items.length === 0 && lane.id !== "todo" && (
                    <div className="rounded-xl border border-dashed border-black/10 py-7 text-center text-[10px] text-gray-400">Nothing here</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "table" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
          {view === "table" ? (
            <table className="w-full text-sm" style={{ minWidth: "640px" }}>
              <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold">Task</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Assignee</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Status</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Priority</th>
                  <th className="px-3 py-2.5 text-left font-semibold">TAT</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Due</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(t => {
                  const badge = tatBadge(t);
                  return (
                    <tr key={t.id} onClick={() => openDrawer(t.id)} className="border-b border-gray-100 hover:bg-gray-50/70 cursor-pointer">
                      <td className="px-3 py-2.5 font-semibold text-gray-900">{t.title}{t.reopen_count > 0 && <span className="ml-1.5 text-[10px] font-semibold text-rose-500">↺{t.reopen_count}</span>}</td>
                      <td className="px-3 py-2.5 text-gray-700">{nameOf(t.assignee_id)}</td>
                      <td className="px-3 py-2.5"><span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: STATUS_META[t.status].bg, color: STATUS_META[t.status].color }}>{STATUS_META[t.status].label}</span></td>
                      <td className="px-3 py-2.5"><span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: PRIORITY_META[t.priority].bg, color: PRIORITY_META[t.priority].color }}>{PRIORITY_META[t.priority].label}</span></td>
                      <td className="px-3 py-2.5">{badge && <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">{fmtDateTime(t.due_at)}</td>
                    </tr>
                  );
                })}
                {shown.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-xs text-gray-400">No tasks</td></tr>}
              </tbody>
            </table>
          ) : (
            <div className="divide-y divide-gray-100">
              {shown.map(t => {
                const badge = tatBadge(t);
                return (
                  <button key={t.id} onClick={() => openDrawer(t.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50/70">
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: STATUS_META[t.status].bg, color: STATUS_META[t.status].color }}>{STATUS_META[t.status].label}</span>
                    <span className="flex-1 min-w-0 truncate text-sm font-semibold text-gray-900">{t.title}</span>
                    {badge && <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>}
                    <span className="text-xs text-gray-500 w-28 truncate text-right">{nameOf(t.assignee_id)}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </button>
                );
              })}
              {shown.length === 0 && <div className="py-12 text-center text-xs text-gray-400">No tasks</div>}
            </div>
          )}
        </div>
      )}
        </div>
      </div>

      {/* detail drawer */}
      {drawerTask && (
        <TaskDrawer
          task={drawerTask} nameOf={nameOf} activity={activity}
          isAssignee={isAssignee(drawerTask)} canVerify={canVerify(drawerTask)} canEdit={canEdit(drawerTask)}
          assignOptions={assignOptions}
          onClose={() => setDrawerId(null)}
          onStart={() => startTask(drawerTask)}
          onSubmit={() => submitTask(drawerTask)}
          onVerify={() => verifyTask(drawerTask)}
          onReject={() => setRejectFor(drawerTask)}
          onEdit={(patch) => editTask(drawerTask, patch)}
          onDelete={() => deleteTask(drawerTask)}
          onComment={(text) => logActivity(drawerTask.id, "commented", { text, author: viewerName })}
          onAttach={(url, label) => logActivity(drawerTask.id, "attached", { url, label: label || url, author: viewerName })}
        />
      )}

      {/* create modal */}
      {showCreate && (
        <CreateModal
          defaultStatus={showCreate} myId={myId!} assignOptions={assignOptions}
          onClose={() => setShowCreate(null)} onCreate={createTask}
        />
      )}

      {/* reject modal */}
      {rejectFor && (
        <RejectModal task={rejectFor} onClose={() => setRejectFor(null)} onReject={(reason, tat) => rejectTask(rejectFor, reason, tat)} />
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 border ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{toast.msg}
        </div>
      )}
    </div>
  );
}

/* ─────────── TAT input (number + unit) ─────────── */
function TatInput({ hours, setHours }: { hours: number; setHours: (h: number) => void }) {
  const [unit, setUnit] = useState<"h" | "d">(hours % 24 === 0 && hours >= 24 ? "d" : "h");
  const display = unit === "d" ? hours / 24 : hours;
  return (
    <div className="flex gap-1.5">
      <input type="number" min={0} value={display || ""} onChange={e => { const v = Number(e.target.value) || 0; setHours(unit === "d" ? v * 24 : v); }}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="0" />
      <select value={unit} onChange={e => { const u = e.target.value as "h" | "d"; setUnit(u); }}
        className="px-2 py-2 text-sm border border-gray-200 rounded-lg bg-white">
        <option value="h">hours</option>
        <option value="d">days</option>
      </select>
    </div>
  );
}

/* ─────────── Create modal ─────────── */
function CreateModal(props: {
  defaultStatus: Status; myId: string; assignOptions: EmpNode[];
  onClose: () => void;
  onCreate: (i: { title: string; description: string; assigneeId: string; tatHours: number; priority: Priority; status: Status; checklist: ChecklistItem[] }) => void;
}) {
  const { myId, assignOptions, onClose, onCreate } = props;
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState(myId);
  const [tat, setTat] = useState(24);
  const [priority, setPriority] = useState<Priority>("medium");
  const [showMore, setShowMore] = useState(false);
  const [desc, setDesc] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-base font-bold text-gray-900">New task</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs doing?" className={inputCls} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Assignee</label>
              <select value={assignee} onChange={e => setAssignee(e.target.value)} className={inputCls + " bg-white"}>
                {assignOptions.map(e => <option key={e.id} value={e.id}>{e.id === myId ? `${e.name} (me)` : e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className={inputCls + " bg-white"}>
                {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">TAT (turnaround)</label>
            <TatInput hours={tat} setHours={setTat} />
          </div>

          {!showMore ? (
            <button onClick={() => setShowMore(true)} className="text-xs font-semibold text-indigo-600 hover:underline">+ Add description &amp; checklist</button>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className={inputCls} placeholder="Details, context, links…" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Checklist</label>
                {checklist.map(c => (
                  <div key={c.id} className="flex items-center gap-2 mb-1">
                    <span className="flex-1 text-sm text-gray-700">{c.text}</span>
                    <button onClick={() => setChecklist(checklist.filter(x => x.id !== c.id))} className="text-gray-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <div className="flex gap-1.5">
                  <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newItem.trim()) { setChecklist([...checklist, { id: uid(), text: newItem.trim(), done: false }]); setNewItem(""); } }} placeholder="Add item + Enter" className={inputCls} />
                </div>
              </div>
            </>
          )}
        </div>
        <div className="px-6 py-3 border-t border-gray-100 flex gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={() => title.trim() && onCreate({ title, description: desc, assigneeId: assignee, tatHours: tat, priority, status: props.defaultStatus, checklist })}
            disabled={!title.trim()} className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50">Create task</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Reject modal ─────────── */
function RejectModal({ task, onClose, onReject }: { task: Task; onClose: () => void; onReject: (reason: string, tatHours: number) => void }) {
  const [reason, setReason] = useState("");
  const [tat, setTat] = useState(task.tat_hours || 24);
  const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200";
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><RotateCcw className="w-4 h-4 text-rose-500" />Send back</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Reason / changes needed</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className={inputCls} placeholder="What needs fixing?" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Fresh TAT</label>
            <TatInput hours={tat} setHours={setTat} />
          </div>
        </div>
        <div className="px-6 py-3 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={() => onReject(reason, tat)} className="flex-1 py-2.5 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700">Reopen</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Detail drawer ─────────── */
function TaskDrawer(props: {
  task: Task; nameOf: (id: string | null | undefined) => string; activity: Activity[];
  isAssignee: boolean; canVerify: boolean; canEdit: boolean; assignOptions: EmpNode[];
  onClose: () => void; onStart: () => void; onSubmit: () => void; onVerify: () => void; onReject: () => void;
  onEdit: (patch: Partial<Task>) => void; onDelete: () => void;
  onComment: (text: string) => void; onAttach: (url: string, label: string) => void;
}) {
  const { task: t, nameOf, activity, isAssignee, canVerify, canEdit, assignOptions, onClose, onStart, onSubmit, onVerify, onReject, onEdit, onDelete, onComment, onAttach } = props;
  const badge = tatBadge(t);
  const checklist = t.checklist ?? [];
  const checked = checklist.filter(c => c.done).length;
  const [commentText, setCommentText] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const sendComment = () => { const v = commentText.trim(); if (!v) return; onComment(v); setCommentText(""); };
  const sendLink = () => { const u = linkUrl.trim(); if (!u) return; onAttach(u, linkLabel.trim()); setLinkUrl(""); setLinkLabel(""); setShowLink(false); };
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(t.title);
  const [desc, setDesc] = useState(t.description || "");

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <span className="rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ background: STATUS_META[t.status].bg, color: STATUS_META[t.status].color }}>{STATUS_META[t.status].label}</span>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* title */}
          {editing ? (
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full text-lg font-bold border border-gray-200 rounded-lg px-2 py-1" />
          ) : (
            <h2 className="text-lg font-bold text-gray-900 leading-snug">{t.title}</h2>
          )}

          {/* meta grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Meta label="Assignee">
              {canEdit ? (
                <select value={t.assignee_id ?? ""} onChange={e => onEdit({ assignee_id: e.target.value || null })} className="w-full text-sm border border-gray-200 rounded-md px-1.5 py-1 bg-white">
                  {assignOptions.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              ) : <span className="text-gray-800">{nameOf(t.assignee_id)}</span>}
            </Meta>
            <Meta label="Priority">
              {canEdit ? (
                <select value={t.priority} onChange={e => onEdit({ priority: e.target.value as Priority })} className="w-full text-sm border border-gray-200 rounded-md px-1.5 py-1 bg-white">
                  {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
                </select>
              ) : <span style={{ color: PRIORITY_META[t.priority].color }} className="font-semibold">{PRIORITY_META[t.priority].label}</span>}
            </Meta>
            <Meta label="TAT / due">
              <div className="flex items-center gap-1.5">
                {badge && <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">{fmtDateTime(t.due_at)}</div>
            </Meta>
            <Meta label="Created by">
              <span className="text-gray-800">{nameOf(t.created_by)}</span>
              {t.reopen_count > 0 && <div className="text-[11px] text-rose-500 mt-0.5">Reopened {t.reopen_count}×</div>}
            </Meta>
          </div>

          {/* description */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Description</div>
            {editing ? (
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{t.description || <span className="text-gray-400">No description</span>}</p>
            )}
          </div>

          {/* checklist */}
          {checklist.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Checklist · {checked}/{checklist.length}</div>
              <div className="space-y-1">
                {checklist.map(c => (
                  <label key={c.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={c.done} onChange={e => onEdit({ checklist: checklist.map(x => x.id === c.id ? { ...x, done: e.target.checked } : x) })} className="h-3.5 w-3.5" />
                    <span className={c.done ? "line-through opacity-60" : ""}>{c.text}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* activity + comments */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Activity &amp; comments</div>

            {/* composer */}
            <div className="mb-3">
              <div className="flex gap-1.5">
                <input value={commentText} onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") sendComment(); }}
                  placeholder="Write a comment…"
                  className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-200" />
                <button onClick={sendComment} className="rounded-lg bg-indigo-600 px-2.5 text-white hover:bg-indigo-700"><Send className="w-3.5 h-3.5" /></button>
              </div>
              {showLink ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://…" className="flex-1 min-w-[140px] rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-200" />
                  <input value={linkLabel} onChange={e => setLinkLabel(e.target.value)} placeholder="Label (optional)" className="w-28 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-200" />
                  <button onClick={sendLink} className="rounded-lg bg-gray-900 px-3 text-xs font-semibold text-white">Attach</button>
                </div>
              ) : (
                <button onClick={() => setShowLink(true)} className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"><Paperclip className="w-3 h-3" />Attach a link</button>
              )}
            </div>

            <div className="space-y-2">
              {activity.length === 0 && <p className="text-xs text-gray-400">No activity yet</p>}
              {activity.map(a => {
                const author = a.detail?.author || nameOf(a.actor_id) || "Someone";
                if (a.action === "commented") {
                  return (
                    <div key={a.id} className="rounded-lg bg-gray-50 p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-gray-700">{author}</span>
                        <span className="text-[10px] text-gray-400">{fmtDateTime(a.created_at)}</span>
                      </div>
                      <div className="mt-0.5 whitespace-pre-wrap text-xs text-gray-700">{a.detail?.text}</div>
                    </div>
                  );
                }
                if (a.action === "attached") {
                  return (
                    <div key={a.id} className="flex gap-2 text-xs">
                      <Paperclip className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <a href={a.detail?.url} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 hover:underline break-all">{a.detail?.label || a.detail?.url}</a>
                        <span className="text-gray-400"> · {author} · {fmtDateTime(a.created_at)}</span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={a.id} className="flex gap-2 text-xs">
                    <Clock className="w-3 h-3 text-gray-300 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-gray-700">{author}</span>
                      <span className="text-gray-500"> {a.action.replace(/_/g, " ")}</span>
                      {a.detail?.reason && <span className="text-gray-500"> — {a.detail.reason}</span>}
                      <span className="text-gray-400"> · {fmtDateTime(a.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* action footer */}
        <div className="border-t border-gray-100 px-5 py-3 space-y-2">
          {editing ? (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl">Cancel</button>
              <button onClick={() => { onEdit({ title: title.trim() || t.title, description: desc.trim() || null }); setEditing(false); }} className="flex-1 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl">Save</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {t.status === "todo" && isAssignee && <button onClick={onStart} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-xl hover:bg-sky-700"><Play className="w-4 h-4" />Start</button>}
              {t.status === "inprogress" && isAssignee && <button onClick={onSubmit} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600"><Send className="w-4 h-4" />Submit for review</button>}
              {t.status === "submitted" && canVerify && (
                <>
                  <button onClick={onVerify} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700"><Check className="w-4 h-4" />Verify &amp; close</button>
                  <button onClick={onReject} className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-rose-200 text-rose-600 text-sm font-semibold rounded-xl hover:bg-rose-50"><RotateCcw className="w-4 h-4" />Reject</button>
                </>
              )}
              {canEdit && <button onClick={() => setEditing(true)} className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Edit</button>}
              {canEdit && <button onClick={onDelete} className="px-3 py-2.5 text-rose-500 border border-gray-200 rounded-xl hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "amber" | "rose" | "green" }) {
  const c = tone === "amber" ? { bg: "#fffdf2", text: "#a16207" }
    : tone === "rose" ? { bg: "#fff4f5", text: "#be123c" }
    : tone === "green" ? { bg: "#f3fdf6", text: "#15803d" }
    : { bg: "#f8fafc", text: "#0f172a" };
  return (
    <div className="rounded-xl px-2.5 py-2" style={{ background: c.bg }}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="text-lg font-bold" style={{ color: c.text }}>{value}</div>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-2.5 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">{label}</div>
      {children}
    </div>
  );
}