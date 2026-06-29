"use client";

import { usePathname } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/admin";

  // The site editor is full-screen and self-contained — no console chrome around it.
  if (pathname.startsWith("/admin/site")) return <>{children}</>;

  const active = pathname.startsWith("/admin/tenants") ? "tenants" : "overview";
  const title = active === "tenants" ? "Tenants" : "Overview";

  return <AdminShell active={active} title={title}>{children}</AdminShell>;
}
