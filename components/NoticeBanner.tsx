"use client";

import { useEffect, useState } from "react";
import { Wrench, X, Info, AlertTriangle, CheckCircle2, Megaphone } from "lucide-react";

type Ann = { id: string; title: string; body: string | null; level: string; audience: string };
type Notices = { maintenance: { enabled: boolean; message: string }; announcements: Ann[] };

const STYLES: Record<string, { wrap: string; icon: any }> = {
  info: { wrap: "bg-blue-50 border-blue-200 text-blue-800", icon: Info },
  success: { wrap: "bg-emerald-50 border-emerald-200 text-emerald-800", icon: CheckCircle2 },
  warning: { wrap: "bg-amber-50 border-amber-200 text-amber-800", icon: AlertTriangle },
  critical: { wrap: "bg-rose-50 border-rose-200 text-rose-800", icon: AlertTriangle },
};
const DISMISS_KEY = "nwl_dismissed_notices";

export default function NoticeBanner() {
  const [data, setData] = useState<Notices | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    try { setDismissed(JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]")); } catch {}
    fetch("/api/notices").then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch {}
  };

  if (!data) return null;
  const anns = (data.announcements || []).filter((a) => !dismissed.includes(a.id));
  const showMaint = data.maintenance?.enabled;
  if (!showMaint && anns.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {showMaint && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl border bg-amber-50 border-amber-200 text-amber-800">
          <Wrench className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Maintenance</p>
            {data.maintenance.message && <p className="text-xs mt-0.5">{data.maintenance.message}</p>}
          </div>
        </div>
      )}
      {anns.map((a) => {
        const s = STYLES[a.level] || STYLES.info;
        const Icon = a.level === "info" ? Megaphone : s.icon;
        return (
          <div key={a.id} className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border ${s.wrap}`}>
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{a.title}</p>
              {a.body && <p className="text-xs mt-0.5">{a.body}</p>}
            </div>
            <button onClick={() => dismiss(a.id)} className="p-1 -m-1 opacity-60 hover:opacity-100" aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
          </div>
        );
      })}
    </div>
  );
}
