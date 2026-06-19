"use client";
// Component: components/Sidebar.tsx — ROLE-BASED sidebar + module permissions

import { useState, useEffect, useRef, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import NotificationBell from "@/components/NotificationBell";
import { MODULES, isAllowed } from "@/lib/modules";
import {
  LayoutDashboard, Users, CalendarCheck, Wallet, CalendarDays,
  Calendar, GitBranch, Settings, Shield, BarChart3, Building2,
  Receipt, ShoppingBag, TrendingUp, ChevronDown, ChevronLeft,
  ChevronRight, Sparkles, LogOut, Menu, X, Layers,
  Banknote, FolderOpen, ChevronUp, MessageCircle, UserMinus,
  Check, Plus, FileText, ClipboardCheck, User, Network,
} from "lucide-react";

interface NavItem { label: string; icon: any; path: string; locked?: boolean; roles?: string[]; }
interface NavGroup { label: string; items: NavItem[]; defaultOpen?: boolean; roles?: string[]; }

// roles: which roles can see this item. Empty/undefined = everyone
const NAV_GROUPS: NavGroup[] = [
  { label: "Main", defaultOpen: true, items: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", roles: ["super_admin","owner","admin","hr","manager"] },
    { label: "Organizations", icon: Building2, path: "/organizations", roles: ["super_admin"] },
    { label: "My Dashboard", icon: User, path: "/me" },
    { label: "My Attendance", icon: CalendarCheck, path: "/my-attendance" },
    { label: "Employees", icon: Users, path: "/employees", roles: ["super_admin","owner","admin","hr"] },
    { label: "Org structure", icon: Network, path: "/org-structure", roles: ["owner","admin","hr"] },
  ]},
  { label: "HR", roles: ["super_admin","owner","admin","hr","manager"], items: [
    { label: "Attendance", icon: CalendarCheck, path: "/attendance" },
    { label: "Work schedule", icon: Calendar, path: "/work-schedule", roles: ["super_admin","owner","admin","hr"] },
    { label: "Payroll", icon: Wallet, path: "/payroll", roles: ["super_admin", "owner", "admin", "hr"] },
    { label: "Loans & advances", icon: Banknote, path: "/loans", roles: ["super_admin","owner","admin","hr"] },
    { label: "Leaves", icon: CalendarDays, path: "/leaves" },
    { label: "Offboarding", icon: UserMinus, path: "/offboarding", roles: ["super_admin","owner","admin","hr"] },
    { label: "Approvals", icon: ClipboardCheck, path: "/approvals" },
    { label: "HR Letters", icon: FileText, path: "/letters", roles: ["super_admin","owner","admin","hr"] },
  ]},
  { label: "Finance", roles: ["super_admin","owner","admin"], items: [
    { label: "Reimbursement", icon: Receipt, path: "/expenses" },
    { label: "Cashflow", icon: TrendingUp, path: "/cashflow" },
    { label: "Cash Register", icon: Banknote, path: "/cash-register" },
  ]},
  { label: "Commerce", roles: ["super_admin","owner","admin"], items: [
    { label: "Store", icon: ShoppingBag, path: "/store" },
  ]},
  { label: "System", roles: ["super_admin","owner","admin"], items: [
    { label: "Documents", icon: FolderOpen, path: "/documents" },
    { label: "Reports", icon: BarChart3, path: "/reports" },
    { label: "Access control", icon: Shield, path: "/access-control", roles: ["super_admin","owner"] },
    { label: "Settings", icon: Settings, path: "/settings" },
  ]},
];

interface SidebarProps { orgName: string; orgId: string; planName: string; trialDaysLeft: number; userInitials: string; }
interface OrgOption { id: string; name: string; plan: string; role: string; }

export default function Sidebar({ orgName, orgId, planName, trialDaysLeft, userInitials }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [sideWidth, setSideWidth] = useState(240);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);
  const [userRole, setUserRole] = useState("employee");
  // module permissions for this user (role defaults + per-user overrides)
  const [rolePerms, setRolePerms] = useState<Record<string, boolean>>({});
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    NAV_GROUPS.forEach(g => { init[g.label] = g.defaultOpen || false; });
    return init;
  });

  // Org selector
  const [orgDropOpen, setOrgDropOpen] = useState(false);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [liveOrgName, setLiveOrgName] = useState(orgName || "Organization");
  const orgDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (orgDropRef.current && !orgDropRef.current.contains(e.target as Node)) setOrgDropOpen(false); };
    document.addEventListener("mousedown", handler); return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch user role + orgs + module permissions
  useEffect(() => {
    const init = async () => {
      setLoadingOrgs(true);
      try {
        const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
        const currentOrgId = orgId || (typeof window !== "undefined" ? localStorage.getItem("activeOrgId") || "" : "");

        if (!email) { setLoadingOrgs(false); return; }

        // Get user role + id
        const { data: userRows } = await sb.from("users").select("id, org_id, role").eq("email", email);
        let detectedRole = "employee";
        let userId = "";
        let orgIds: string[] = [];
        let userRoles: Record<string, string> = {};

        if (userRows) {
          userRows.forEach(u => {
            if (u.org_id) { orgIds.push(u.org_id); userRoles[u.org_id] = u.role || "employee"; }
            if (u.role === "super_admin") detectedRole = "super_admin";
          });
          if (currentOrgId && userRoles[currentOrgId]) detectedRole = userRoles[currentOrgId];
          else if (detectedRole !== "super_admin" && userRows.length > 0) detectedRole = userRows[0].role || "employee";
          const myRow = userRows.find(u => u.org_id === currentOrgId) || userRows[0];
          userId = myRow?.id || "";
        }

        // Also check employees table for role
        if (detectedRole === "employee" && currentOrgId) {
          const { data: emp } = await sb.from("employees").select("role").eq("email", email).eq("org_id", currentOrgId).maybeSingle();
          if (emp?.role && emp.role !== "employee") detectedRole = emp.role;
        }

        setUserRole(detectedRole);

        // Module permissions: role defaults + per-user overrides (best-effort; falls back to role defaults)
        if (currentOrgId) {
          try {
            const [{ data: perms }, { data: ovrs }] = await Promise.all([
              sb.from("module_permissions").select("module_key, enabled").eq("org_id", currentOrgId).eq("role", detectedRole),
              userId ? sb.from("user_module_overrides").select("module_key, enabled").eq("org_id", currentOrgId).eq("user_id", userId) : Promise.resolve({ data: [] as any[] }),
            ]);
            const rp: Record<string, boolean> = {}; (perms || []).forEach((p: any) => { rp[p.module_key] = p.enabled; });
            const ov: Record<string, boolean> = {}; (ovrs || []).forEach((o: any) => { ov[o.module_key] = o.enabled; });
            setRolePerms(rp); setOverrides(ov);
          } catch {}
        }

        // Fetch orgs
        let list: OrgOption[] = [];
        if (detectedRole === "super_admin") {
          const { data: allOrgs } = await sb.from("organizations").select("id, name, plan").order("created_at");
          if (allOrgs) list = allOrgs.map(o => ({ id: o.id, name: o.name || "Unnamed", plan: o.plan || "free", role: "super_admin" }));
        } else if (orgIds.length > 0) {
          const { data: userOrgs } = await sb.from("organizations").select("id, name, plan").in("id", orgIds);
          if (userOrgs) list = userOrgs.map(o => ({ id: o.id, name: o.name || "Unnamed", plan: o.plan || "free", role: userRoles[o.id] || "employee" }));
        }

        setOrgs(list);
        const currentOrg = list.find(o => o.id === currentOrgId);
        if (currentOrg) {
          setLiveOrgName(currentOrg.name);
          if (typeof window !== "undefined") localStorage.setItem("activeOrgName", currentOrg.name);
        } else if (list.length > 0 && detectedRole !== "super_admin") {
          setLiveOrgName(list[0].name);
          if (typeof window !== "undefined") { localStorage.setItem("activeOrgId", list[0].id); localStorage.setItem("activeOrgName", list[0].name); }
        }
      } catch {}
      setLoadingOrgs(false);
    };
    init();
  }, [orgId]);

  const switchOrg = (org: OrgOption) => {
    if (typeof window !== "undefined") { localStorage.setItem("activeOrgId", org.id); localStorage.setItem("activeOrgName", org.name); }
    setOrgDropOpen(false);
    window.location.href = "/dashboard";
  };

  useEffect(() => { const check = () => setMobile(window.innerWidth < 1024); check(); window.addEventListener("resize", check); return () => window.removeEventListener("resize", check); }, []);

  useEffect(() => {
    NAV_GROUPS.forEach(g => { if (g.items.some(i => pathname === i.path || pathname.startsWith(i.path + "/"))) setOpenGroups(p => ({ ...p, [g.label]: true })); });
  }, [pathname]);

  const toggleGroup = (label: string) => setOpenGroups(p => ({ ...p, [label]: !p[label] }));
  const isActive = (path: string) => pathname === path || (path !== "/dashboard" && pathname.startsWith(path + "/"));

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (!dragRef.current) return; setSideWidth(Math.max(180, Math.min(400, dragRef.current.startW + (e.clientX - dragRef.current.startX)))); };
    const onUp = () => { setDragging(false); dragRef.current = null; document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    if (dragging) { document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp); }
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  const startDrag = (e: React.MouseEvent) => { e.preventDefault(); dragRef.current = { startX: e.clientX, startW: sideWidth }; setDragging(true); document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; };
  const sideW = collapsed ? 68 : sideWidth;

  const handleLogout = () => { if (typeof window !== "undefined") localStorage.clear(); window.location.href = "/api/auth/signout"; };

  // role-only check (for non-module items like Dashboard, My Dashboard, Access control)
  const canSee = (roles?: string[]) => !roles || roles.length === 0 || roles.includes(userRole);

  const moduleByPath = useMemo(() => Object.fromEntries(MODULES.map(m => [m.key, m])), []);

  // Item visibility: configurable modules use permissions; everything else uses role.
  const canSeeItem = (item: NavItem) => {
    const mod = moduleByPath[item.path];
    if (mod && mod.configurable) return isAllowed(mod, userRole, rolePerms[item.path], overrides[item.path]);
    return canSee(item.roles);
  };

  // Groups are driven purely by item visibility, so per-module grants surface the right sections.
  const filteredGroups = NAV_GROUPS
    .map(g => ({ ...g, items: g.items.filter(canSeeItem) }))
    .filter(g => g.items.length > 0);

  const roleLabel = userRole === "super_admin" ? "Platform Admin" : userRole.charAt(0).toUpperCase() + userRole.slice(1);

  const sidebar = (
    <div className="flex flex-col h-full bg-[#0f172a]" style={{ width: mobile ? 240 : sideW }}>
      {/* Logo */}
      <div className="px-3 py-3.5 flex items-center justify-between border-b border-white/[0.06]">
        {!collapsed ? (
          <div className="flex items-center gap-2"><div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">N</div><span className="font-bold text-white text-sm">NorthWebLabs</span></div>
        ) : <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-lg flex items-center justify-center text-white font-bold text-xs mx-auto">N</div>}
        {mobile && <button onClick={() => setMobileOpen(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>}
      </div>

      {/* Org selector — hidden for super_admin without org */}
      {!collapsed && (
        <div className="px-2 pt-2.5 pb-1 relative" ref={orgDropRef}>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setOrgDropOpen(!orgDropOpen)}
              className="flex-1 flex items-center gap-2 px-2.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg transition group min-w-0">
              <div className="w-6 h-6 bg-emerald-500 rounded-md flex items-center justify-center text-white font-bold text-[9px] flex-shrink-0">
                {(liveOrgName || "O").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[11px] font-semibold text-white truncate">{liveOrgName || (userRole === "super_admin" ? "Select org" : "Organization")}</p>
                <p className="text-[9px] text-slate-500">{roleLabel}</p>
              </div>
              <ChevronDown className={`w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-transform flex-shrink-0 ${orgDropOpen ? "rotate-180" : ""}`} />
            </button>
            <NotificationBell />
          </div>
          {orgDropOpen && (
            <div className="absolute left-2 right-2 top-full mt-1 bg-[#1e293b] border border-slate-700/60 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-700/40"><p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{userRole === "super_admin" ? "All organizations" : "Your organizations"}</p></div>
              <div className="max-h-52 overflow-y-auto py-1">
                {loadingOrgs && <div className="px-3 py-3 text-center"><p className="text-[10px] text-slate-500">Loading...</p></div>}
                {!loadingOrgs && orgs.length === 0 && <div className="px-3 py-3 text-center"><p className="text-[10px] text-slate-500">No organizations</p></div>}
                {orgs.map(org => {
                  const isCurrent = org.id === (typeof window !== "undefined" ? localStorage.getItem("activeOrgId") : orgId);
                  const colors = ["bg-emerald-500","bg-violet-500","bg-amber-500","bg-cyan-500","bg-rose-500"];
                  const bgColor = colors[orgs.indexOf(org) % colors.length];
                  return (
                    <button key={org.id} onClick={() => !isCurrent && switchOrg(org)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition ${isCurrent ? "bg-indigo-500/10" : "hover:bg-white/[0.04]"}`}>
                      <div className={`w-7 h-7 ${bgColor} rounded-lg flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0`}>{org.name.charAt(0).toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-semibold truncate ${isCurrent ? "text-indigo-300" : "text-slate-300"}`}>{org.name}</p>
                        <p className="text-[9px] text-slate-500">{org.plan} · {org.role}</p>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {["super_admin","owner","admin"].includes(userRole) && (
                <div className="border-t border-slate-700/40 p-1.5">
                  <button onClick={() => { setOrgDropOpen(false); router.push(userRole === "super_admin" ? "/organizations" : "/settings"); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-slate-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition">
                    <Plus className="w-3.5 h-3.5" />{userRole === "super_admin" ? "Create organization" : "Organization settings"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Nav — filtered by role + module permissions */}
      <nav className="flex-1 overflow-y-auto px-2 py-1.5">
        {filteredGroups.map(group => {
          const isOpen = openGroups[group.label];
          const hasActive = group.items.some(i => isActive(i.path));
          return (
            <div key={group.label} className="mb-0.5">
              {!collapsed ? (
                <button onClick={() => toggleGroup(group.label)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition ${hasActive ? "text-indigo-400" : "text-slate-600 hover:text-slate-400"}`}>
                  <span>{group.label}</span>
                  {isOpen ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                </button>
              ) : <div className="my-1 mx-2 border-t border-white/[0.06]" />}
              <div className={`overflow-hidden transition-all ${!collapsed && !isOpen ? "max-h-0" : "max-h-[500px]"}`}>
                {group.items.map(item => {
                  const active = isActive(item.path);
                  const Icon = item.icon;
                  return (
                    <Link key={item.path} href={item.locked ? "#" : item.path}
                      onClick={e => { if (item.locked) e.preventDefault(); if (mobile) setMobileOpen(false); }}
                      className={`group flex items-center gap-2 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-all relative my-0.5
                        ${active ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20" : item.locked ? "text-slate-600 cursor-not-allowed" : "text-slate-400 hover:text-white hover:bg-white/[0.05]"}`}>
                      <Icon className={`w-[15px] h-[15px] flex-shrink-0 ${active ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {collapsed && <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-[11px] rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">{item.label}</div>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Account */}
      <div className="px-2.5 pb-3 border-t border-white/[0.06] pt-2">
        <div className="flex items-center gap-2 px-2">
          <div className="w-6 h-6 bg-slate-700 rounded-md flex items-center justify-center text-slate-300 font-bold text-[9px]">{userInitials}</div>
          {!collapsed && <div className="flex-1 min-w-0"><span className="text-[11px] text-slate-400 truncate block">{roleLabel}</span></div>}
          <button onClick={handleLogout} className="p-1 text-slate-600 hover:text-red-400"><LogOut className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {!mobile && (
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute top-1/2 -translate-y-1/2 -right-3 w-5 h-5 bg-[#0f172a] border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:border-indigo-500 transition z-50 shadow-lg">
          {collapsed ? <ChevronRight className="w-2.5 h-2.5" /> : <ChevronLeft className="w-2.5 h-2.5" />}
        </button>
      )}
    </div>
  );

  return (
    <>
      {!mobile && (
        <div className="relative flex-shrink-0 transition-all" style={{ width: sideW, transitionDuration: dragging ? "0ms" : "300ms" }}>
          {sidebar}
          {!collapsed && (
            <div onMouseDown={startDrag} className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-20 transition-colors group hover:bg-indigo-500/30 ${dragging ? "bg-indigo-500/40" : ""}`}>
              <div className={`absolute top-1/2 -translate-y-1/2 right-0 w-1 h-8 rounded-full transition-colors ${dragging ? "bg-indigo-500" : "bg-transparent group-hover:bg-indigo-400"}`} />
            </div>
          )}
        </div>
      )}
      {mobile && <button onClick={() => setMobileOpen(true)} className="fixed top-4 left-4 z-30 p-2 bg-white rounded-xl shadow-lg border lg:hidden"><Menu className="w-5 h-5 text-gray-600" /></button>}
      {mobile && mobileOpen && (<><div className="fixed inset-0 bg-black/60 z-40" onClick={() => setMobileOpen(false)} /><div className="fixed inset-y-0 left-0 z-50 shadow-2xl">{sidebar}</div></>)}
    </>
  );
}