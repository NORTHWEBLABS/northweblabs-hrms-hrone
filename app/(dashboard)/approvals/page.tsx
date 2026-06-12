"use client";
// Route: app/(dashboard)/approvals/page.tsx
// Full Approval Workflow Engine — raise requests, approve/reject, escalation, notifications
// Types: Leave, Expense, Asset, Custom | TAT: 24h default | Auto-escalation

import { useState, useEffect, useMemo, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Search, X, Loader2, CheckCircle2, AlertCircle, Clock, Send,
  Check, RefreshCw,
  Calendar, IndianRupee, Laptop, FileText, Plus, ArrowUp,
  UserCheck, XCircle,
  AlertTriangle, Inbox,
} from "lucide-react";

function useSB() { return useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []); }

async function getCtx(sb: any) {
  const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
  const orgId = typeof window !== "undefined" ? localStorage.getItem("activeOrgId") || "" : "";
  let userId = "", userName = "", userRole = "";
  if (email) {
    const { data: u } = await sb.from("users").select("id, full_name, role, org_id").eq("email", email).maybeSingle();
    if (u) { userId = u.id; userName = u.full_name || email.split("@")[0]; userRole = u.role || "employee"; }
  }
  return { email, orgId, userId, userName, userRole };
}

// Types
interface ApprovalRequest {
  id: string; org_id: string; type: string; title: string; description: string | null;
  raised_by: string; raised_by_name: string | null;
  assigned_to: string; assigned_to_name: string | null;
  status: string; escalation_level: number; tat_hours: number;
  deadline_at: string | null; payload: any;
  approved_at: string | null; rejected_at: string | null; final_remarks: string | null;
  created_at: string; updated_at: string;
}
interface HistoryItem { id: string; action: string; acted_by_name: string | null; notes: string | null; created_at: string; }
interface Emp { id: string; full_name: string; email: string; department: string | null; designation: string | null; reporting_manager_id: string | null; }

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  approved: { label: "Approved", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  rejected: { label: "Rejected", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  escalated: { label: "Escalated", color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
  cancelled: { label: "Cancelled", color: "text-gray-500", bg: "bg-gray-50 border-gray-200" },
};
const TYPE_MAP: Record<string, { label: string; icon: any; color: string }> = {
  leave: { label: "Leave", icon: Calendar, color: "#22C55E" },
  expense: { label: "Expense", icon: IndianRupee, color: "#F59E0B" },
  asset: { label: "Asset", icon: Laptop, color: "#8B5CF6" },
  custom: { label: "Custom", icon: FileText, color: "#6366F1" },
};
const LEAVE_TYPES = ["Casual Leave", "Sick Leave", "Earned Leave", "Work From Home", "Comp Off", "Half Day", "Other"];
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtTime = (d: string) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
const fmtRelative = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

// ══════════════════════════════════════════════════════════════════════════════
//  RAISE REQUEST MODAL
// ══════════════════════════════════════════════════════════════════════════════
function RaiseModal({ onSave, onClose, ctx, employees }: {
  onSave: (r: ApprovalRequest) => void; onClose: () => void;
  ctx: { orgId: string; userId: string; userName: string };
  employees: Emp[];
}) {
  const sb = useSB();
  const [type, setType] = useState("leave");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Leave fields
  const [leaveType, setLeaveType] = useState("Casual Leave");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [leaveDays, setLeaveDays] = useState(1);
  // Expense fields
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("Travel");
  // Asset fields
  const [assetName, setAssetName] = useState("");
  const [assetReason, setAssetReason] = useState("");

  // Find reporting manager
  const me = employees.find(e => e.id === ctx.userId);
  const manager = me?.reporting_manager_id ? employees.find(e => e.id === me.reporting_manager_id) : null;
  // Fallback: first user with manager/admin/hr role, or first employee that isn't me
  const fallbackManager = employees.find(e => e.id !== ctx.userId && (e.designation?.toLowerCase().includes("manager") || e.designation?.toLowerCase().includes("admin"))) || employees.find(e => e.id !== ctx.userId);

  const assignee = manager || fallbackManager;

  const save = async () => {
    if (!title.trim() && type !== "leave") { setError("Title is required"); return; }
    if (!assignee) { setError("No manager found. Ask admin to set your reporting manager."); return; }
    setSaving(true); setError("");

    let payload: any = {};
    let finalTitle = title;
    if (type === "leave") {
      if (!fromDate || !toDate) { setError("Select leave dates"); setSaving(false); return; }
      payload = { leave_type: leaveType, from: fromDate, to: toDate, days: leaveDays };
      finalTitle = `${leaveType} — ${leaveDays} day${leaveDays > 1 ? "s" : ""}`;
    } else if (type === "expense") {
      payload = { amount: Number(expAmount) || 0, category: expCategory };
      finalTitle = title || `${expCategory} expense — ₹${expAmount}`;
    } else if (type === "asset") {
      payload = { asset_name: assetName, reason: assetReason };
      finalTitle = title || `Asset request: ${assetName}`;
    }

    const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data, error: dbErr } = await sb.from("approval_requests").insert({
      org_id: ctx.orgId, type, title: finalTitle, description: desc || null,
      raised_by: ctx.userId, raised_by_name: ctx.userName,
      assigned_to: assignee.id, assigned_to_name: assignee.full_name,
      status: "pending", escalation_level: 0, tat_hours: 24,
      deadline_at: deadline, payload,
    }).select().single();

    if (dbErr) { setError(dbErr.message); setSaving(false); return; }

    // Create history entry
    await sb.from("approval_history").insert({
      request_id: data.id, action: "submitted",
      acted_by: ctx.userId, acted_by_name: ctx.userName,
      notes: `Submitted ${TYPE_MAP[type]?.label || type} request`,
      from_status: null, to_status: "pending",
    });

    // Create notification for manager
    await sb.from("notifications").insert({
      org_id: ctx.orgId, user_id: assignee.id,
      title: "New approval request",
      body: `${ctx.userName} raised a ${TYPE_MAP[type]?.label || type} request: ${finalTitle}`,
      type: "approval", reference_type: "approval_request", reference_id: data.id,
      link: "/approvals",
    });

    onSave(data as ApprovalRequest);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div><h2 className="text-base font-bold text-gray-900">Raise request</h2><p className="text-xs text-gray-400">Submit for manager approval</p></div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

          {/* Type selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Request type</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(TYPE_MAP).map(([k, v]) => { const Icon = v.icon; return (
                <button key={k} onClick={() => setType(k)} className={`p-3 rounded-xl border text-center transition ${type === k ? "border-indigo-300 bg-indigo-50 shadow-sm" : "border-gray-200 hover:border-gray-300"}`}>
                  <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: v.color }} /><p className="text-[10px] font-semibold text-gray-700">{v.label}</p>
                </button>
              ); })}
            </div>
          </div>

          {/* Leave fields */}
          {type === "leave" && (<>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Leave type</label>
              <select value={leaveType} onChange={e => setLeaveType(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-100">
                {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">From</label><input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); if (toDate) { const d = Math.ceil((new Date(toDate).getTime() - new Date(e.target.value).getTime()) / 86400000) + 1; setLeaveDays(Math.max(1, d)); } }} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">To</label><input type="date" value={toDate} onChange={e => { setToDate(e.target.value); if (fromDate) { const d = Math.ceil((new Date(e.target.value).getTime() - new Date(fromDate).getTime()) / 86400000) + 1; setLeaveDays(Math.max(1, d)); } }} min={fromDate} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100" /></div>
            </div>
            {fromDate && toDate && <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-700 font-medium">{leaveDays} day{leaveDays > 1 ? "s" : ""} · {leaveType}</div>}
          </>)}

          {/* Expense fields */}
          {type === "expense" && (<>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Amount (₹)</label><div className="relative"><IndianRupee className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input type="number" value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder="0" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100" /></div></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Category</label><select value={expCategory} onChange={e => setExpCategory(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-100">
              {["Travel", "Food & Meals", "Accommodation", "Office Supplies", "Software", "Training", "Medical", "Phone & Internet", "Client Entertainment", "Other"].map(c => <option key={c}>{c}</option>)}
            </select></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief description" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100" /></div>
          </>)}

          {/* Asset fields */}
          {type === "asset" && (<>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Asset name</label><input value={assetName} onChange={e => setAssetName(e.target.value)} placeholder="e.g. MacBook Pro, Monitor, Headset" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Reason</label><input value={assetReason} onChange={e => setAssetReason(e.target.value)} placeholder="Why do you need this?" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100" /></div>
          </>)}

          {/* Custom */}
          {type === "custom" && (
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Request title" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100" /></div>
          )}

          {/* Description */}
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Details / Notes</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Additional details..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none" /></div>

          {/* Assigned to */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Will be sent to</p>
            {assignee ? (
              <div className="flex items-center gap-2"><UserCheck className="w-4 h-4 text-indigo-500" /><div><p className="text-sm font-semibold text-gray-900">{assignee.full_name}</p><p className="text-[10px] text-gray-400">{assignee.designation || assignee.department || "Manager"} · 24h TAT</p></div></div>
            ) : (
              <p className="text-xs text-red-500">No reporting manager set. Contact admin.</p>
            )}
          </div>
        </div>
        <div className="px-6 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Submit request
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  REQUEST DETAIL MODAL (View + Approve/Reject)
// ══════════════════════════════════════════════════════════════════════════════
function DetailModal({ request, onUpdate, onClose, ctx, employees }: {
  request: ApprovalRequest; onUpdate: (r: ApprovalRequest) => void; onClose: () => void;
  ctx: { orgId: string; userId: string; userName: string; userRole: string }; employees: Emp[];
}) {
  const sb = useSB();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  const isApprover = request.assigned_to === ctx.userId || ["owner", "admin", "hr"].includes(ctx.userRole);
  const isPending = request.status === "pending" || request.status === "escalated";
  const isExpired = request.deadline_at && new Date(request.deadline_at) < new Date() && isPending;

  useEffect(() => {
    sb.from("approval_history").select("*").eq("request_id", request.id).order("created_at").then(({ data }) => { if (data) setHistory(data); });
  }, [request.id, sb]);

  const handleAction = async (action: "approved" | "rejected") => {
    setSaving(true);
    const now = new Date().toISOString();
    const updates: any = {
      status: action, final_remarks: remarks || null, updated_at: now,
      ...(action === "approved" ? { approved_at: now } : { rejected_at: now }),
    };

    await sb.from("approval_requests").update(updates).eq("id", request.id);
    await sb.from("approval_history").insert({
      request_id: request.id, action, acted_by: ctx.userId, acted_by_name: ctx.userName,
      notes: remarks || `Request ${action}`, from_status: request.status, to_status: action,
    });

    // Notify the requester
    await sb.from("notifications").insert({
      org_id: ctx.orgId, user_id: request.raised_by,
      title: `Request ${action}`,
      body: `Your ${TYPE_MAP[request.type]?.label || request.type} request "${request.title}" was ${action} by ${ctx.userName}${remarks ? `: "${remarks}"` : ""}`,
      type: "approval_result", reference_type: "approval_request", reference_id: request.id, link: "/approvals",
    });

    onUpdate({ ...request, ...updates });
    setSaving(false);
    onClose();
  };

  const handleEscalate = async () => {
    setSaving(true);
    // Find approver's manager
    const currentApprover = employees.find(e => e.id === request.assigned_to);
    const nextManager = currentApprover?.reporting_manager_id ? employees.find(e => e.id === currentApprover.reporting_manager_id) : null;
    const escalateTo = nextManager || employees.find(e => e.id !== request.assigned_to && e.id !== request.raised_by);

    if (!escalateTo) { setSaving(false); return; }

    const deadline = new Date(Date.now() + request.tat_hours * 3600000).toISOString();
    const updates = {
      assigned_to: escalateTo.id, assigned_to_name: escalateTo.full_name,
      status: "escalated", escalation_level: request.escalation_level + 1,
      deadline_at: deadline, updated_at: new Date().toISOString(),
    };

    await sb.from("approval_requests").update(updates).eq("id", request.id);
    await sb.from("approval_history").insert({
      request_id: request.id, action: "escalated", acted_by: ctx.userId, acted_by_name: ctx.userName,
      notes: `Escalated to ${escalateTo.full_name} (Level ${request.escalation_level + 1})`,
      from_status: request.status, to_status: "escalated",
    });

    // Notify new approver
    await sb.from("notifications").insert({
      org_id: ctx.orgId, user_id: escalateTo.id,
      title: "Escalated approval request",
      body: `${request.raised_by_name}'s ${request.type} request was escalated to you: "${request.title}"`,
      type: "escalation", reference_type: "approval_request", reference_id: request.id, link: "/approvals",
    });

    onUpdate({ ...request, ...updates });
    setSaving(false);
    onClose();
  };

  const typeInfo = TYPE_MAP[request.type] || TYPE_MAP.custom;
  const TypeIcon = typeInfo.icon;
  const statusInfo = STATUS_MAP[request.status] || STATUS_MAP.pending;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: typeInfo.color + "15", color: typeInfo.color }}><TypeIcon className="w-5 h-5" /></div>
              <div><h2 className="text-base font-bold text-gray-900">{request.title}</h2><p className="text-xs text-gray-400">by {request.raised_by_name} · {fmtDate(request.created_at)} · {fmtTime(request.created_at)}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.bg} ${statusInfo.color}`}>{statusInfo.label}</span>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Expiry warning */}
          {isExpired && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />TAT expired! This request should be escalated.</div>}

          {/* Details */}
          {request.description && <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-700">{request.description}</div>}

          {/* Type-specific payload */}
          {request.type === "leave" && request.payload && (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-green-50 rounded-xl text-center border border-green-100"><p className="text-[10px] text-green-600 uppercase font-semibold">Type</p><p className="text-sm font-bold text-green-800">{request.payload.leave_type}</p></div>
              <div className="p-3 bg-blue-50 rounded-xl text-center border border-blue-100"><p className="text-[10px] text-blue-600 uppercase font-semibold">Duration</p><p className="text-sm font-bold text-blue-800">{request.payload.days} day{request.payload.days > 1 ? "s" : ""}</p></div>
              <div className="p-3 bg-violet-50 rounded-xl text-center border border-violet-100"><p className="text-[10px] text-violet-600 uppercase font-semibold">Dates</p><p className="text-xs font-bold text-violet-800">{request.payload.from} → {request.payload.to}</p></div>
            </div>
          )}
          {request.type === "expense" && request.payload && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-amber-50 rounded-xl text-center border border-amber-100"><p className="text-[10px] text-amber-600 uppercase font-semibold">Amount</p><p className="text-lg font-bold text-amber-800">₹{Number(request.payload.amount).toLocaleString("en-IN")}</p></div>
              <div className="p-3 bg-orange-50 rounded-xl text-center border border-orange-100"><p className="text-[10px] text-orange-600 uppercase font-semibold">Category</p><p className="text-sm font-bold text-orange-800">{request.payload.category}</p></div>
            </div>
          )}
          {request.type === "asset" && request.payload && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-violet-50 rounded-xl border border-violet-100"><p className="text-[10px] text-violet-600 uppercase font-semibold">Asset</p><p className="text-sm font-bold text-violet-800">{request.payload.asset_name}</p></div>
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100"><p className="text-[10px] text-indigo-600 uppercase font-semibold">Reason</p><p className="text-sm text-indigo-800">{request.payload.reason}</p></div>
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl"><span className="text-gray-500">Assigned to: </span><span className="font-semibold text-gray-900">{request.assigned_to_name}</span></div>
            <div className="p-3 bg-gray-50 rounded-xl"><span className="text-gray-500">Escalation: </span><span className="font-semibold text-gray-900">Level {request.escalation_level}</span></div>
            <div className="p-3 bg-gray-50 rounded-xl"><span className="text-gray-500">TAT: </span><span className="font-semibold text-gray-900">{request.tat_hours}h</span></div>
            <div className="p-3 bg-gray-50 rounded-xl"><span className="text-gray-500">Deadline: </span><span className={`font-semibold ${isExpired ? "text-red-600" : "text-gray-900"}`}>{request.deadline_at ? fmtDate(request.deadline_at) + " " + fmtTime(request.deadline_at) : "—"}</span></div>
          </div>

          {/* History timeline */}
          <div>
            <p className="text-xs font-bold text-gray-700 uppercase mb-2">Activity</p>
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.id} className="flex items-start gap-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${h.action === "approved" ? "bg-emerald-100" : h.action === "rejected" ? "bg-red-100" : h.action === "escalated" ? "bg-violet-100" : "bg-gray-100"}`}>
                    {h.action === "approved" ? <Check className="w-3 h-3 text-emerald-600" /> : h.action === "rejected" ? <XCircle className="w-3 h-3 text-red-600" /> : h.action === "escalated" ? <ArrowUp className="w-3 h-3 text-violet-600" /> : <Clock className="w-3 h-3 text-gray-500" />}
                  </div>
                  <div className="flex-1"><p className="text-xs text-gray-700"><span className="font-semibold">{h.acted_by_name}</span> · {h.notes || h.action}</p><p className="text-[10px] text-gray-400">{fmtRelative(h.created_at)}</p></div>
                </div>
              ))}
            </div>
          </div>

          {/* Approve/Reject actions */}
          {isApprover && isPending && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Remarks</label><textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} placeholder="Optional remarks..." className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none" /></div>
              <div className="flex gap-2">
                <button onClick={() => handleAction("approved")} disabled={saving} className="flex-1 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}Approve</button>
                <button onClick={() => handleAction("rejected")} disabled={saving} className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}Reject</button>
                {isExpired && <button onClick={handleEscalate} disabled={saving} className="py-2.5 px-4 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"><ArrowUp className="w-4 h-4" />Escalate</button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN APPROVALS PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function ApprovalsPage() {
  const sb = useSB();
  const [ctx, setCtx] = useState({ email: "", orgId: "", userId: "", userName: "", userRole: "" });
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRaise, setShowRaise] = useState(false);
  const [selected, setSelected] = useState<ApprovalRequest | null>(null);
  const [tab, setTab] = useState<"inbox" | "sent" | "all">("inbox");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 3000); return () => clearTimeout(t); } }, [toast]);

  const fetchData = useCallback(async () => {
    const c = await getCtx(sb);
    setCtx(c);
    if (!c.orgId) { setLoading(false); return; }

    const [{ data: reqs }, { data: emps }, { data: usrs }] = await Promise.all([
      sb.from("approval_requests").select("*").eq("org_id", c.orgId).order("created_at", { ascending: false }),
      sb.from("employees").select("*").eq("org_id", c.orgId),
      sb.from("users").select("id, full_name, email, role, org_id").eq("org_id", c.orgId),
    ]);

    setRequests((reqs || []) as ApprovalRequest[]);

    // Merge employees + users
    let empList = (emps || []) as Emp[];
    if (empList.length === 0 && usrs) {
      empList = usrs.map((u: any) => ({ id: u.id, full_name: u.full_name || u.email?.split("@")[0], email: u.email || "", department: u.role || null, designation: null, reporting_manager_id: null }));
    }
    setEmployees(empList);

    // Auto-escalate expired requests
    const expired = (reqs || []).filter((r: any) => r.status === "pending" && r.deadline_at && new Date(r.deadline_at) < new Date());
    for (const r of expired) {
      const approver = empList.find(e => e.id === r.assigned_to);
      const nextMgr = approver?.reporting_manager_id ? empList.find(e => e.id === approver.reporting_manager_id) : null;
      if (nextMgr && nextMgr.id !== r.raised_by) {
        const deadline = new Date(Date.now() + r.tat_hours * 3600000).toISOString();
        await sb.from("approval_requests").update({
          assigned_to: nextMgr.id, assigned_to_name: nextMgr.full_name,
          status: "escalated", escalation_level: r.escalation_level + 1,
          deadline_at: deadline, updated_at: new Date().toISOString(),
        }).eq("id", r.id);
        await sb.from("approval_history").insert({
          request_id: r.id, action: "escalated", acted_by: c.userId, acted_by_name: "System",
          notes: `Auto-escalated to ${nextMgr.full_name} (TAT expired)`,
          from_status: "pending", to_status: "escalated",
        });
        await sb.from("notifications").insert({
          org_id: c.orgId, user_id: nextMgr.id, title: "Escalated request",
          body: `${r.raised_by_name}'s request was auto-escalated to you (TAT expired)`,
          type: "escalation", reference_type: "approval_request", reference_id: r.id, link: "/approvals",
        });
      }
    }
    if (expired.length > 0) {
      const { data: refreshed } = await sb.from("approval_requests").select("*").eq("org_id", c.orgId).order("created_at", { ascending: false });
      if (refreshed) setRequests(refreshed as ApprovalRequest[]);
    }

    setLoading(false);
  }, [sb]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filtered
  const filtered = useMemo(() => {
    return requests.filter(r => {
      const q = search.toLowerCase();
      const matchSearch = !q || r.title.toLowerCase().includes(q) || (r.raised_by_name || "").toLowerCase().includes(q);
      const matchStatus = !statusFilter || r.status === statusFilter;
      const matchType = !typeFilter || r.type === typeFilter;
      const matchTab = tab === "inbox" ? r.assigned_to === ctx.userId : tab === "sent" ? r.raised_by === ctx.userId : true;
      return matchSearch && matchStatus && matchType && matchTab;
    });
  }, [requests, search, statusFilter, typeFilter, tab, ctx.userId]);

  // Stats
  const myInbox = requests.filter(r => r.assigned_to === ctx.userId && (r.status === "pending" || r.status === "escalated")).length;
  const mySent = requests.filter(r => r.raised_by === ctx.userId).length;
  const expiredCount = requests.filter(r => r.status === "pending" && r.deadline_at && new Date(r.deadline_at) < new Date()).length;

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>;

  return (
    <div className="max-w-7xl mx-auto">
      {showRaise && <RaiseModal ctx={ctx} employees={employees} onSave={r => { setRequests(p => [r, ...p]); setToast("Request submitted"); }} onClose={() => setShowRaise(false)} />}
      {selected && <DetailModal request={selected} ctx={ctx} employees={employees} onUpdate={r => { setRequests(p => p.map(x => x.id === r.id ? r : x)); setSelected(null); setToast("Updated"); }} onClose={() => setSelected(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div><h1 className="text-xl font-bold text-gray-900">Approvals</h1><p className="text-sm text-gray-400">Manage requests, approvals, and escalations</p></div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2.5 hover:bg-gray-100 rounded-xl border border-gray-200"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
          <button onClick={() => setShowRaise(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4" />Raise request</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { l: "My Inbox", v: myInbox, c: "#6366F1", ic: <Inbox className="w-4 h-4" />, s: "Pending my action" },
          { l: "Sent by me", v: mySent, c: "#22C55E", ic: <Send className="w-4 h-4" />, s: "My requests" },
          { l: "Overdue", v: expiredCount, c: "#EF4444", ic: <AlertTriangle className="w-4 h-4" />, s: "TAT expired" },
          { l: "Total", v: requests.length, c: "#8B5CF6", ic: <FileText className="w-4 h-4" />, s: "All requests" },
        ].map(s => (
          <div key={s.l} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: s.c + "12", color: s.c }}>{s.ic}</div>
            <p className="text-lg font-bold text-gray-900">{s.v}</p>
            <p className="text-[10px] text-gray-400">{s.s}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex bg-gray-100 p-0.5 rounded-lg">
          {([{ id: "inbox" as const, l: "Inbox", c: myInbox }, { id: "sent" as const, l: "Sent", c: mySent }, { id: "all" as const, l: "All", c: requests.length }]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
              {t.l}{t.c > 0 && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${tab === t.id ? "bg-indigo-100 text-indigo-700" : "bg-gray-200 text-gray-500"}`}>{t.c}</span>}
            </button>
          ))}
        </div>
        <div className="relative w-48"><Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100" /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-xs border border-gray-200 rounded-xl appearance-none"><option value="">All status</option>{Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 text-xs border border-gray-200 rounded-xl appearance-none"><option value="">All types</option>{Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16"><Inbox className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-500">{tab === "inbox" ? "No pending requests" : "No requests found"}</p>
            <button onClick={() => setShowRaise(true)} className="mt-3 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl"><Plus className="w-4 h-4 inline mr-1" />Raise request</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-200">
                {["Request", "Type", "Status", "Raised by", "Assigned to", "TAT", "Date"].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => {
                  const ti = TYPE_MAP[r.type] || TYPE_MAP.custom;
                  const si = STATUS_MAP[r.status] || STATUS_MAP.pending;
                  const TI = ti.icon;
                  const isExp = r.status === "pending" && r.deadline_at && new Date(r.deadline_at) < new Date();
                  return (
                    <tr key={r.id} onClick={() => setSelected(r)} className="hover:bg-gray-50 cursor-pointer transition">
                      <td className="px-5 py-3.5"><p className="text-sm font-semibold text-gray-900 truncate max-w-[250px]">{r.title}</p>{r.description && <p className="text-xs text-gray-400 truncate max-w-[250px]">{r.description}</p>}</td>
                      <td className="px-5 py-3.5"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: ti.color + "12", color: ti.color }}><TI className="w-3 h-3" />{ti.label}</span></td>
                      <td className="px-5 py-3.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${si.bg} ${si.color}`}>{si.label}</span></td>
                      <td className="px-5 py-3.5 text-xs text-gray-600">{r.raised_by_name || "—"}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-600">{r.assigned_to_name || "—"}{r.escalation_level > 0 && <span className="ml-1 text-violet-600">↑{r.escalation_level}</span>}</td>
                      <td className="px-5 py-3.5">{isExp ? <span className="flex items-center gap-1 text-xs text-red-600 font-semibold"><AlertTriangle className="w-3 h-3" />Expired</span> : <span className="text-xs text-gray-500">{r.tat_hours}h</span>}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">{fmtRelative(r.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">{filtered.length} request{filtered.length !== 1 ? "s" : ""}</div>}
      </div>

      {toast && <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800"><CheckCircle2 className="w-4 h-4" />{toast}</div>}
    </div>
  );
}