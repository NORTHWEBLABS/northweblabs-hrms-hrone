"use client";

import { usePathname } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/admin";

  // Full-screen, self-contained tools — no console chrome around them.
  if (pathname.startsWith("/admin/site") || pathname.startsWith("/admin/code")) return <>{children}</>;

  const p = pathname;
  const active =
    p.startsWith("/admin/tenants") ? "tenants" :
    p.startsWith("/admin/analytics") ? "analytics" :
    p.startsWith("/admin/code") ? "code" :
    p.startsWith("/admin/billing") ? "billing" :
    p.startsWith("/admin/announcements") ? "announcements" :
    p.startsWith("/admin/maintenance") ? "maintenance" :
    "overview";
  const title =
    active === "tenants" ? "Tenants" :
    active === "analytics" ? "Analytics" :
    active === "code" ? "Code editor" :
    active === "billing" ? "Billing & plans" :
    active === "announcements" ? "Announcements" :
    active === "maintenance" ? "Maintenance" :
    "Overview";

  return <AdminShell active={active} title={title}>{children}</AdminShell>;
}