"use client";
// Component: components/ApprovalActions.tsx
// Inline approve/reject buttons for an approval_requests row.
// Calls the shared /api/approvals/act route so side effects stay in one place.
// Embed anywhere a pending request is shown (e.g. a manager's dashboard list).

import { useState } from "react";
import { Loader2, CheckCircle2, XCircle, MessageSquare } from "lucide-react";

interface Props {
  requestId: string;
  actorUserId: string;          // current user's users.id
  actorName?: string;
  onDone?: (action: "approved" | "rejected", warnings: string[]) => void;
  size?: "sm" | "md";
  withRemarks?: boolean;        // show an inline remarks field before acting
}

export default function ApprovalActions({ requestId, actorUserId, actorName, onDone, size = "md", withRemarks = false }: Props) {
  const [busy, setBusy] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState("");
  const [remarks, setRemarks] = useState("");
  const [showRemarks, setShowRemarks] = useState(false);

  const act = async (action: "approved" | "rejected") => {
    setBusy(action); setError("");
    try {
      const res = await fetch("/api/approvals/act", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action, actorUserId, actorName, remarks: remarks || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Action failed"); setBusy(null); return; }
      onDone?.(action, data.warnings || []);
    } catch (e: any) {
      setError(e.message || "Network error"); setBusy(null);
    }
  };

  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-2 text-sm";
  const icon = size === "sm" ? "w-3 h-3" : "w-4 h-4";

  return (
    <div className="flex flex-col gap-2">
      {withRemarks && showRemarks && (
        <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} placeholder="Optional remarks…"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none" />
      )}
      <div className="flex items-center gap-1.5">
        <button onClick={() => act("approved")} disabled={!!busy}
          className={`${pad} bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1`}>
          {busy === "approved" ? <Loader2 className={`${icon} animate-spin`} /> : <CheckCircle2 className={icon} />}Approve
        </button>
        <button onClick={() => act("rejected")} disabled={!!busy}
          className={`${pad} bg-red-50 text-red-600 font-semibold rounded-lg hover:bg-red-100 border border-red-200 disabled:opacity-50 flex items-center gap-1`}>
          {busy === "rejected" ? <Loader2 className={`${icon} animate-spin`} /> : <XCircle className={icon} />}Reject
        </button>
        {withRemarks && (
          <button onClick={() => setShowRemarks(s => !s)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Add remarks">
            <MessageSquare className={`${icon} text-gray-400`} />
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}