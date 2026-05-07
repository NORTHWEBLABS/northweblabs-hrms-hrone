import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Default sidebar values — used if not logged in or DB fetch fails
  let orgName = "Your Company";
  let orgId = "";
  let planName = "Starter";
  let trialDaysLeft = 12;
  let userInitials = "ME";

  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try { cookieStore.set({ name, value, ...options }); } catch {}
          },
          remove(name: string, options: CookieOptions) {
            try { cookieStore.set({ name, value: "", ...options }); } catch {}
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Derive initials from email if no full name yet
      userInitials = user.email?.slice(0, 2).toUpperCase() ?? "ME";

      // Try to fetch org info — gracefully skip if tables don't exist yet
      const { data: userData } = await supabase
        .from("users")
        .select("org_id, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (userData?.full_name) {
        userInitials = userData.full_name
          .split(" ")
          .map((w: string) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();
      }

      if (userData?.org_id) {
        orgId = userData.org_id;
        const { data: org } = await supabase
          .from("organizations")
          .select("name, plan, plan_status, trial_ends_at")
          .eq("id", userData.org_id)
          .maybeSingle();

        if (org) {
          orgName = org.name;
          planName =
            org.plan.charAt(0).toUpperCase() + org.plan.slice(1);

          if (org.plan_status === "trial" && org.trial_ends_at) {
            const msLeft =
              new Date(org.trial_ends_at).getTime() - Date.now();
            trialDaysLeft = Math.max(
              0,
              Math.ceil(msLeft / (1000 * 60 * 60 * 24))
            );
          } else {
            trialDaysLeft = 0;
          }
        }
      }
    }
  } catch {
    // Supabase env vars not set or network issue — render layout with defaults
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        orgName={orgName}
        orgId={orgId}
        planName={planName}
        trialDaysLeft={trialDaysLeft}
        userInitials={userInitials}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-5">{children}</main>
      </div>
    </div>
  );
}