"use client";
// Component: components/MobileTopBar.tsx — in-flow sticky top bar for mobile.
// Lives at the top of <main>'s scroll flow so page content always starts below it.

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

export default function MobileTopBar({ orgName, userInitials = "" }: { orgName: string; userInitials?: string }) {
  const [name, setName] = useState(orgName || "NorthWebLabs");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("activeOrgName");
      if (stored) setName(stored);
    }
  }, []);

  const openSidebar = () => {
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("toggle-sidebar"));
  };

  return (
    <header
      className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur-md"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center gap-2.5 h-14 px-3 lg:px-5">
        <button
          onClick={openSidebar}
          aria-label="Open menu"
          className="p-2 -ml-1 rounded-xl text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-md flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">N</div>
          <span className="font-bold text-gray-900 text-sm truncate">{name}</span>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <NotificationBell />
          {userInitials && (
            <div className="hidden lg:flex w-7 h-7 rounded-full bg-gray-100 border border-gray-200 items-center justify-center text-[11px] font-bold text-gray-600">{userInitials}</div>
          )}
        </div>
      </div>
    </header>
  );
}
