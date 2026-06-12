"use client";
// Component: components/AppContextMenu.tsx
// Global right-click menu for the main content area (not sidebar)

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

interface MenuItem {
  label: string;
  icon: string;
  action: () => void;
  divider?: boolean;
  shortcut?: string;
  danger?: boolean;
}

// SVG icon paths for menu items
const ICONS: Record<string, string> = {
  back: "M10 19l-7-7m0 0l7-7m-7 7h18",
  forward: "M14 5l7 7m0 0l-7 7m7-7H3",
  refresh: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  settings: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  settingsInner: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  copy: "M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3",
  fullscreen: "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4",
  print: "M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z",
  user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  users: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  cart: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z",
  chart: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  plus: "M12 4v16m8-8H4",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  doc: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  wallet: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
};

const SvgIcon = ({ path, paths, className }: { path?: string; paths?: string[]; className?: string }) => (
  <svg className={className || "w-3.5 h-3.5 text-gray-400"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {path && <path d={path} />}
    {paths && paths.map((p, i) => <path key={i} d={p} />)}
  </svg>
);

// Page-specific quick actions
const PAGE_ACTIONS: Record<string, { label: string; icon: string; path: string }[]> = {
  "/dashboard": [
    { label: "View Reports", icon: "chart", path: "/reports" },
    { label: "Manage Employees", icon: "users", path: "/employees" },
  ],
  "/employees": [
    { label: "Add Employee", icon: "plus", path: "/employees/add" },
    { label: "Offboarding", icon: "user", path: "/offboarding" },
  ],
  "/store": [
    { label: "New Sale (POS)", icon: "cart", path: "/store?pos=1" },
    { label: "View Reports", icon: "chart", path: "/reports" },
  ],
  "/expenses": [
    { label: "Cashflow Master", icon: "wallet", path: "/cashflow" },
    { label: "Cash Register", icon: "wallet", path: "/cash-register" },
  ],
  "/settings": [
    { label: "Manage Team", icon: "users", path: "/settings?tab=team" },
    { label: "View Documents", icon: "doc", path: "/documents" },
  ],
};

export default function AppContextMenu({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [copied, setCopied] = useState(false);

  // Close on any click or Escape
  useEffect(() => {
    const handleClick = () => setMenu(null);
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(null); };
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("click", handleClick); document.removeEventListener("keydown", handleKey); };
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Don't override context menu on inputs, textareas, or elements with their own
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable ||
      target.closest("[data-no-ctx]") ||
      target.closest("table") ||
      target.closest("[role='dialog']")
    ) return;

    e.preventDefault();
    // Keep menu within viewport
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 400);
    setMenu({ x, y });
    setCopied(false);
  }, []);

  const currentPage = pathname.split("/").filter(Boolean)[0] || "dashboard";
  const pageTitle = currentPage.charAt(0).toUpperCase() + currentPage.slice(1).replace(/-/g, " ");
  const quickActions = PAGE_ACTIONS[pathname] || PAGE_ACTIONS["/" + currentPage] || [];

  const handleLogout = () => {
    if (typeof window !== "undefined") localStorage.clear();
    window.location.href = "/api/auth/signout";
  };

  const items: MenuItem[] = [
    { label: "Back", icon: "back", action: () => router.back(), shortcut: "Alt+←" },
    { label: "Forward", icon: "forward", action: () => router.forward(), shortcut: "Alt+→" },
    { label: "Refresh", icon: "refresh", action: () => window.location.reload(), shortcut: "Ctrl+R", divider: true },
    { label: "Dashboard", icon: "home", action: () => router.push("/dashboard"), shortcut: "" },
    ...(quickActions.length > 0 ? quickActions.map((a, i) => ({
      label: a.label,
      icon: a.icon,
      action: () => router.push(a.path),
      divider: i === 0,
    })) : []),
    { label: "Copy page URL", icon: "copy", action: () => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1500); }, divider: true },
    { label: "Print page", icon: "print", action: () => window.print(), shortcut: "Ctrl+P" },
    { label: "Fullscreen", icon: "fullscreen", action: () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }, shortcut: "F11" },
    { label: "Settings", icon: "settings", action: () => router.push("/settings"), divider: true },
    { label: "Logout", icon: "logout", action: handleLogout, danger: true },
  ];

  return (
    <div onContextMenu={handleContextMenu} className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {children}

      {menu && (
        <div
          className="fixed z-[100] bg-white rounded-xl shadow-2xl border border-gray-200 py-1 min-w-[200px] max-w-[240px]"
          style={{ left: menu.x, top: menu.y }}
          onClick={e => e.stopPropagation()}
        >
          {/* Page header */}
          <div className="px-3 py-1.5 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{pageTitle}</p>
          </div>

          {items.map((item, i) => (
            <div key={item.label}>
              {item.divider && <div className="border-t border-gray-100 my-0.5" />}
              <button
                onClick={() => { item.action(); if (!item.label.includes("Copy")) setMenu(null); }}
                className={`w-full text-left px-3 py-2 text-[13px] flex items-center gap-2.5 transition ${
                  item.danger
                    ? "text-red-600 hover:bg-red-50"
                    : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                }`}
              >
                {item.icon === "settings" ? (
                  <SvgIcon paths={[ICONS.settings, ICONS.settingsInner]} className="w-3.5 h-3.5 text-gray-400" />
                ) : (
                  <SvgIcon path={ICONS[item.icon]} className={`w-3.5 h-3.5 ${item.danger ? "text-red-400" : "text-gray-400"}`} />
                )}
                <span className="flex-1">
                  {item.label === "Copy page URL" && copied ? "Copied!" : item.label}
                </span>
                {item.shortcut && (
                  <span className="text-[10px] text-gray-400 font-mono">{item.shortcut}</span>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}