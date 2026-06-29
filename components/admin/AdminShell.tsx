"use client";

import { useState } from "react";
import {
  LayoutDashboard, Building2, Palette, Mail, CreditCard, ScrollText,
  Menu, X, ArrowLeft, ShieldCheck,
} from "lucide-react";

type Key = "overview" | "tenants" | "site" | "email" | "billing" | "audit";

const NAV: { key: Key; label: string; href: string; icon: any; soon?: boolean }[] = [
  { key: "overview", label: "Overview", href: "/admin", icon: LayoutDashboard },
  { key: "tenants", label: "Tenants", href: "/admin/tenants", icon: Building2 },
  { key: "site", label: "Site editor", href: "/admin/site", icon: Palette },
  { key: "email", label: "Email templates", href: "#", icon: Mail, soon: true },
  { key: "billing", label: "Billing & plans", href: "#", icon: CreditCard, soon: true },
  { key: "audit", label: "Audit log", href: "#", icon: ScrollText, soon: true },
];

export default function AdminShell({ active, title, children }: { active: Key; title?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const SideContent = (
    <>
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-slate-800/60">
        <span className="w-7 h-7 rounded-lg bg-indigo-500 text-white grid place-items-center text-xs font-bold">N</span>
        <div className="leading-tight">
          <div className="text-sm font-bold text-white">Admin console</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1"><ShieldCheck className="w-3 h-3" />Super admin</div>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV.map((n) => {
          const Icon = n.icon;
          const isActive = n.key === active;
          if (n.soon) return (
            <div key={n.key} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-500 cursor-default">
              <Icon className="w-[18px] h-[18px]" />{n.label}
              <span className="ml-auto text-[9px] font-bold uppercase bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full">Soon</span>
            </div>
          );
          return (
            <a key={n.key} href={n.href} onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${isActive ? "bg-indigo-500/15 text-white" : "text-slate-300 hover:bg-slate-800/60 hover:text-white"}`}>
              <Icon className="w-[18px] h-[18px]" />{n.label}
            </a>
          );
        })}
      </nav>
      <div className="p-2 border-t border-slate-800/60">
        <a href="/dashboard" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white">
          <ArrowLeft className="w-[18px] h-[18px]" />Back to app
        </a>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 bg-slate-900 flex-col fixed inset-y-0 left-0">{SideContent}</aside>

      {/* mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-60 bg-slate-900 flex flex-col">{SideContent}</div>
          <div className="flex-1 bg-black/40" onClick={() => setOpen(false)} />
        </div>
      )}

      <div className="flex-1 lg:ml-60 min-w-0">
        {/* topbar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-4 sticky top-0 z-30">
          <button onClick={() => setOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-500"><Menu className="w-5 h-5" /></button>
          <h1 className="text-base font-bold text-slate-900">{title || "Admin"}</h1>
        </header>
        <main className="p-4 sm:p-6 max-w-6xl">{children}</main>
      </div>
    </div>
  );
}

export function Restricted() {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-6">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 bg-slate-100 rounded-2xl grid place-items-center mx-auto mb-4"><ShieldCheck className="w-6 h-6 text-slate-400" /></div>
        <h1 className="text-lg font-bold text-slate-900 mb-1">Restricted</h1>
        <p className="text-sm text-slate-500 mb-5">The admin console is available to the super admin only.</p>
        <a href="/login?from=/admin" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700">Go to login</a>
      </div>
    </div>
  );
}