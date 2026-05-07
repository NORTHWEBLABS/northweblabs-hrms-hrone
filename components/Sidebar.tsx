"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Clock, IndianRupee, Calendar,
  Shield, FileText, BarChart2, Settings, LogOut,
  Menu, X, ChevronDown, ChevronUp, Lock, TrendingUp,
  Plus, Check, Building2, RefreshCw,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

// ─── Nav config ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { href: "/dashboard",            label: "Dashboard",  icon: LayoutDashboard, locked: false },
  { href: "/employees",  label: "Employees",  icon: Users,           locked: false },
  { href: "/attendance", label: "Attendance", icon: Clock,           locked: false },
  { href: "/payroll",    label: "Payroll",    icon: IndianRupee,     locked: false },
  { href: "/leaves",     label: "Leaves",     icon: Calendar,        locked: false },
  { href: "/compliance", label: "Compliance", icon: Shield,          locked: true  },
  { href: "/documents",  label: "Documents",  icon: FileText,        locked: true  },
  { href: "/reports",    label: "Reports",    icon: BarChart2,       locked: true  },
  { href: "/settings",   label: "Settings",   icon: Settings,        locked: false },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrgOption {
  id: string;
  name: string;
  plan: string;
}

interface SidebarProps {
  orgName?: string;
  orgId?: string;
  planName?: string;
  trialDaysLeft?: number;
  userInitials?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getOrgColor(name: string) {
  const colors = [
    "bg-indigo-500", "bg-blue-500", "bg-emerald-500",
    "bg-amber-500",  "bg-purple-500","bg-rose-500",
  ];
  return colors[name.charCodeAt(0) % colors.length];
}

function getOrgInitials(name: string) {
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

// ─── New Org Inline Form ──────────────────────────────────────────────────────
function NewOrgForm({
  onCreated,
  onCancel,
}: {
  onCreated: (org: OrgOption) => void;
  onCancel: () => void;
}) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [name, setName] = useState("");
  const [state, setState] = useState("Maharashtra");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) { setError("Name required"); return; }
    setSaving(true);
    try {
      const { data, error: err } = await supabase
        .from("organizations")
        .insert({
          name: name.trim(),
          state,
          plan: "starter",
          plan_status: "trial",
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select("id, name, plan")
        .single();
      if (err) throw err;
      onCreated({ id: data.id, name: data.name, plan: data.plan });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-2 py-2 border-t border-white/10">
      <p className="text-xs text-white/50 px-2 mb-2 font-medium">New organization</p>
      <input
        ref={inputRef}
        value={name}
        onChange={e => { setName(e.target.value); setError(""); }}
        onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") onCancel(); }}
        placeholder="Company name"
        className="w-full px-2.5 py-1.5 bg-white/10 text-white text-xs rounded-lg placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-400 mb-1.5"
      />
      <select
        value={state}
        onChange={e => setState(e.target.value)}
        className="w-full px-2.5 py-1.5 bg-white/10 text-white/70 text-xs rounded-lg focus:outline-none mb-1.5 appearance-none"
      >
        {["Maharashtra","Gujarat","Karnataka","Tamil Nadu","Delhi","Rajasthan","UP","West Bengal","Other"].map(s =>
          <option key={s} value={s} className="bg-[#0f172a]">{s}</option>
        )}
      </select>
      {error && <p className="text-xs text-red-400 mb-1.5 px-1">{error}</p>}
      <div className="flex gap-1.5">
        <button
          onClick={handleCreate}
          disabled={saving || !name.trim()}
          className="flex-1 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {saving ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Check className="w-3 h-3"/>}
          Create
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white/60 text-xs rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Org Switcher Dropdown ────────────────────────────────────────────────────
function OrgSwitcher({
  currentOrgId,
  currentOrgName,
  planName,
  collapsed,
}: {
  currentOrgId: string;
  currentOrgName: string;
  planName: string;
  collapsed: boolean;
}) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [open, setOpen] = useState(false);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [activeOrgId, setActiveOrgId] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("activeOrgId") || currentOrgId;
    }
    return currentOrgId;
  });
  const [activeOrgName, setActiveOrgName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("activeOrgName") || currentOrgName;
    }
    return currentOrgName;
  });
  const dropRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowNewForm(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchOrgs = async () => {
    setLoadingOrgs(true);
    try {
      const { data } = await supabase
        .from("organizations")
        .select("id, name, plan")
        .order("created_at", { ascending: false });
      if (data) setOrgs(data as OrgOption[]);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const handleToggle = () => {
    if (!open) fetchOrgs();
    setOpen(p => !p);
    setShowNewForm(false);
  };

  const handleSwitch = (org: OrgOption) => {
    setActiveOrgId(org.id);
    setActiveOrgName(org.name);
    setOpen(false);
    // Store in localStorage so employees page picks it up
    if (typeof window !== "undefined") {
      localStorage.setItem("activeOrgId", org.id);
      localStorage.setItem("activeOrgName", org.name);
      window.dispatchEvent(new CustomEvent("orgSwitch", { detail: { orgId: org.id, orgName: org.name } }));
    }
  };

  const handleOrgCreated = (org: OrgOption) => {
    setOrgs(p => [org, ...p]);
    setShowNewForm(false);
    handleSwitch(org);
  };

  if (collapsed) {
    return (
      <div className="mx-2 mt-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity"
          style={{ background: "rgba(99,102,241,0.5)" }}
          onClick={handleToggle}
          title={activeOrgName}
        >
          {getOrgInitials(activeOrgName)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-3 mt-3 relative" ref={dropRef}>
      {/* Trigger */}
      <button
        onClick={handleToggle}
        className="w-full px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg flex items-center gap-2 transition-colors group"
      >
        <div className={`w-6 h-6 rounded-md ${getOrgColor(activeOrgName)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none`}>
          {getOrgInitials(activeOrgName)}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-xs font-semibold text-white truncate">{activeOrgName}</p>
          <p className="text-xs text-white/40">{planName} plan</p>
        </div>
        {open
          ? <ChevronUp className="w-3 h-3 text-white/40 flex-shrink-0"/>
          : <ChevronDown className="w-3 h-3 text-white/40 flex-shrink-0"/>
        }
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-[#1e293b] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-white/10">
            <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Switch organization</p>
          </div>

          {/* Org list */}
          <div className="max-h-44 overflow-y-auto py-1">
            {loadingOrgs ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="w-3.5 h-3.5 text-white/30 animate-spin"/>
              </div>
            ) : orgs.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-3">No organizations</p>
            ) : (
              orgs.map(org => (
                <button
                  key={org.id}
                  onClick={() => handleSwitch(org)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                >
                  <div className={`w-6 h-6 rounded-md ${getOrgColor(org.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                    {getOrgInitials(org.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-medium truncate ${org.id === activeOrgId ? "text-indigo-300" : "text-white"}`}>{org.name}</p>
                    <p className="text-xs text-white/30 capitalize">{org.plan} plan</p>
                  </div>
                  {org.id === activeOrgId && <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0"/>}
                </button>
              ))
            )}
          </div>

          {/* Add new org */}
          {!showNewForm ? (
            <div className="border-t border-white/10 p-2">
              <button
                onClick={() => setShowNewForm(true)}
                className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-white/5 rounded-lg text-xs text-white/60 hover:text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5"/>
                Add new organization
              </button>
            </div>
          ) : (
            <NewOrgForm
              onCreated={handleOrgCreated}
              onCancel={() => setShowNewForm(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export default function Sidebar({
  orgName = "Your Company",
  orgId = "",
  planName = "Starter",
  trialDaysLeft = 12,
  userInitials = "ME",
}: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`
        flex flex-col bg-[#0f172a] flex-shrink-0 h-screen sticky top-0 z-30
        transition-all duration-200 ease-in-out
        ${collapsed ? "w-[56px]" : "w-[220px]"}
      `}
    >
      {/* ── Brand / collapse toggle ── */}
      <div
        className={`
          flex items-center h-14 border-b border-white/10 px-3.5
          ${collapsed ? "justify-center" : "justify-between"}
        `}
      >
        {!collapsed && (
          <span className="text-sm font-bold text-white tracking-tight whitespace-nowrap select-none">
            North Web Labs
          </span>
        )}
        <button
          onClick={() => setCollapsed(p => !p)}
          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Org switcher ── */}
      <OrgSwitcher
        currentOrgId={orgId}
        currentOrgName={orgName}
        planName={planName}
        collapsed={collapsed}
      />

      {/* ── Nav items ── */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto mt-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.locked ? "#" : item.href}
              aria-disabled={item.locked}
              title={collapsed ? item.label : undefined}
              className={`
                relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium
                transition-colors select-none
                ${collapsed ? "justify-center" : ""}
                ${active
                  ? "bg-white/10 text-white"
                  : item.locked
                  ? "text-white/30 cursor-not-allowed"
                  : "text-white/50 hover:text-white hover:bg-white/5"
                }
              `}
              onClick={e => item.locked && e.preventDefault()}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}

              {collapsed && item.locked && (
                <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full flex items-center justify-center">
                  <Lock className="w-1.5 h-1.5 text-amber-900" />
                </span>
              )}
              {!collapsed && item.locked && (
                <Lock className="w-3 h-3 text-white/20 flex-shrink-0" />
              )}
              {active && !collapsed && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Trial + sign out ── */}
      <div className="px-2 py-3 border-t border-white/10 flex flex-col gap-1">
        {!collapsed && trialDaysLeft > 0 && (
          <div className="px-3 py-2.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30 mb-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-indigo-300">Free trial</span>
              <span className="text-xs text-indigo-400">{trialDaysLeft} days left</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-400 rounded-full transition-all"
                style={{ width: `${Math.max(5, ((14 - trialDaysLeft) / 14) * 100)}%` }}
              />
            </div>
            <button className="w-full mt-2 py-1.5 bg-indigo-500 text-white text-xs font-semibold rounded-md hover:bg-indigo-400 transition-colors flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" />Upgrade now
            </button>
          </div>
        )}

        <div className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors ${collapsed ? "justify-center" : ""}`}>
          <div className="w-6 h-6 rounded-full bg-[#334155] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {userInitials}
          </div>
          {!collapsed && (
            <>
              <span className="text-xs text-white/50 flex-1 truncate">Account</span>
              <LogOut className="w-3.5 h-3.5 text-white/30 hover:text-white/60 transition-colors" />
            </>
          )}
        </div>
      </div>
    </aside>
  );
}