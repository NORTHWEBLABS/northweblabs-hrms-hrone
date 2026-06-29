"use client";

import { usePathname } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/admin";

  // The site editor is full-screen and self-contained — no console chrome around it.
  if (pathname.startsWith("/admin/site")) return <>{children}</>;

  const p = pathname;
  const active =
    p.startsWith("/admin/tenants") ? "tenants" :
    p.startsWith("/admin/analytics") ? "analytics" :
    p.startsWith("/admin/billing") ? "billing" :
    p.startsWith("/admin/announcements") ? "announcements" :
    p.startsWith("/admin/maintenance") ? "maintenance" :
    "overview";
  const title =
    active === "tenants" ? "Tenants" :
    active === "analytics" ? "Analytics" :
    active === "billing" ? "Billing & plans" :
    active === "announcements" ? "Announcements" :
    active === "maintenance" ? "Maintenance" :
    "Overview";

  return <AdminShell active={active} title={title}>{children}</AdminShell>;
}
