import { redirect } from "next/navigation";

// /admin opens the site editor. (Server redirect — safe to prerender.)
export default function AdminIndex() {
  redirect("/admin/site");
}