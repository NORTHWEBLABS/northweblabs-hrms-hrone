"use client";

import { useEffect, useState } from "react";
import { Wrench, X, Megaphone, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";

type Ann = { id: string; title: string; body: string | null; level: string; audience: string };
type Notices = { maintenance: { enabled: boolean; message: string }; announcements: Ann[] };

const THEME: Record<string, { grad: string; Icon: any }> = {
  info: { grad: "from-indigo-600 via-violet-600 to-fuchsia-600", Icon: Sparkles },
  success: { grad: "from-emerald-600 to-teal-600", Icon: CheckCircle2 },
  warning: { grad: "from-amber-500 to-orange-500", Icon: AlertTriangle },
  critical: { grad: "from-rose-600 to-red-600", Icon: AlertTriangle },
};
const DISMISS_KEY = "nwl_dismissed_notices";

function Bar({ grad, Icon, title, body, onClose }: { grad: string; Icon: any; title: string; body?: string | null; onClose?: () => void }) {
  return (
    <div className={`relative w-full bg-gradient-to-r ${grad} text-white shadow-sm`}>
      <div className="absolute inset-0 bg-white/5 [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-center gap-2 text-[13px] leading-tight">
        <Icon className="w-4 h-4 shrink-0 opacity-90" />
        <span className="font-semibold tracking-tight">{title}</span>
        {body ? <span className="opacity-85 hidden sm:inline truncate">— {body}</span> : null}
      </div>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-full text-white/80 hover:text-white hover:bg-white/15 transition">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

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
  const showMaint = !!data.maintenance?.enabled;
  if (!showMaint && anns.length === 0) return null;

  return (
    <div className="sticky top-0 z-50 w-full divide-y divide-white/10">
      {showMaint && (
        <Bar grad="from-amber-500 to-orange-600" Icon={Wrench} title="Scheduled maintenance" body={data.maintenance.message} />
      )}
      {anns.map((a) => {
        const t = THEME[a.level] || THEME.info;
        const Icon = a.level === "info" ? Megaphone : t.Icon;
        return <Bar key={a.id} grad={t.grad} Icon={Icon} title={a.title} body={a.body} onClose={() => dismiss(a.id)} />;
      })}
    </div>
  );
}
