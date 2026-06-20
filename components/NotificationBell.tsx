"use client";
// Component: components/NotificationBell.tsx
// Shows bell icon with unread count + dropdown of recent notifications

import { useState, useEffect, useRef, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Bell, X, Check, CheckCheck, Inbox } from "lucide-react";

interface Notif {
  id: string; title: string; body: string | null; type: string;
  link: string | null; read: boolean; created_at: string;
}

const fmtRel = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
};

const TYPE_COLORS: Record<string, string> = {
  approval: "bg-amber-500", approval_result: "bg-emerald-500",
  escalation: "bg-violet-500", info: "bg-blue-500",
  alert: "bg-red-500", system: "bg-gray-500",
};

export default function NotificationBell() {
  const sb = useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 8 });

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const fetchNotifs = async () => {
    const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
    if (!email) return;
    const { data: u } = await sb.from("users").select("id").eq("email", email).maybeSingle();
    if (!u) return;
    const { data } = await sb.from("notifications").select("*").eq("user_id", u.id).order("created_at", { ascending: false }).limit(20);
    if (data) setNotifs(data as Notif[]);
  };

  // Poll every 30s
  useEffect(() => { fetchNotifs(); const i = setInterval(fetchNotifs, 30000); return () => clearInterval(i); }, [sb]);

  const unread = notifs.filter(n => !n.read).length;

  const markRead = async (id: string) => {
    await sb.from("notifications").update({ read: true }).eq("id", id);
    setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    const ids = notifs.filter(n => !n.read).map(n => n.id);
    if (ids.length === 0) return;
    await sb.from("notifications").update({ read: true }).in("id", ids);
    setNotifs(p => p.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="relative">
      <button ref={btnRef} onClick={() => {
        setOpen(!open);
        if (!open) {
          fetchNotifs();
          if (btnRef.current) {
            const r = btnRef.current.getBoundingClientRect();
            setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
          }
        }
      }}
        className="relative p-2 hover:bg-white/10 rounded-lg transition">
        <Bell className="w-5 h-5 text-slate-400" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div ref={ref} className="fixed w-80 max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-[100]"
          style={{ top: pos.top, right: pos.right }}>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" />Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg ml-1"><X className="w-3.5 h-3.5 text-gray-400" /></button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-8 text-center"><Inbox className="w-8 h-8 text-gray-200 mx-auto mb-2" /><p className="text-xs text-gray-400">No notifications</p></div>
            ) : (
              notifs.map(n => (
                <div key={n.id}
                  onClick={() => { markRead(n.id); if (n.link) window.location.href = n.link; setOpen(false); }}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition border-b border-gray-50 ${!n.read ? "bg-indigo-50/30" : ""}`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? TYPE_COLORS[n.type] || "bg-blue-500" : "bg-transparent"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs truncate ${!n.read ? "font-semibold text-gray-900" : "text-gray-600"}`}>{n.title}</p>
                    {n.body && <p className="text-[10px] text-gray-400 line-clamp-2 mt-0.5">{n.body}</p>}
                    <p className="text-[9px] text-gray-400 mt-1">{fmtRel(n.created_at)}</p>
                  </div>
                  {!n.read && (
                    <button onClick={e => { e.stopPropagation(); markRead(n.id); }} className="p-1 hover:bg-gray-100 rounded-lg flex-shrink-0"><Check className="w-3 h-3 text-gray-400" /></button>
                  )}
                </div>
              ))
            )}
          </div>

          {notifs.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 text-center">
              <button onClick={() => { window.location.href = "/notifications"; setOpen(false); }} className="text-xs text-indigo-600 font-semibold hover:text-indigo-700">View all notifications</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
