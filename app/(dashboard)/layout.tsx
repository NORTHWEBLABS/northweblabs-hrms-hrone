import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import Sidebar from "@/components/Sidebar";
import AppContextMenu from "@/components/AppContextMenu";
import AIChatBot from "@/components/AIChatBot";
import MobileTopBar from "@/components/MobileTopBar";
import NoticeBanner from "@/components/NoticeBanner";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

    // Try session_token first (custom auth)
    const sessionToken = cookieStore.get("session_token")?.value;
    let userId: string | null = null;

    if (sessionToken) {
      const { data: session } = await supabase
        .from("user_sessions")
        .select("user_id")
        .eq("token", sessionToken)
        .maybeSingle();
      if (session?.user_id) userId = session.user_id;
    }

    // Fallback to Supabase auth
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) userId = user.id;
    }

    if (userId) {
      const { data: userData } = await supabase
        .from("users")
        .select("org_id, full_name, email")
        .eq("id", userId)
        .maybeSingle();

      if (userData?.full_name) {
        userInitials = userData.full_name
          .split(" ")
          .map((w: string) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();
      } else if (userData?.email) {
        userInitials = userData.email.slice(0, 2).toUpperCase();
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
          planName = org.plan?.charAt(0).toUpperCase() + org.plan?.slice(1) || "Starter";

          if (org.plan_status === "trial" && org.trial_ends_at) {
            // Date.now() during render is intentional: this server component renders once per request
            // eslint-disable-next-line
            const msLeft = new Date(org.trial_ends_at).getTime() - Date.now();
            trialDaysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
          } else {
            trialDaysLeft = 0;
          }
        }
      }
    }
  } catch {
    // DB/env not ready — use defaults
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <NoticeBanner />
      <Sidebar
        orgName={orgName}
        orgId={orgId}
        planName={planName}
        trialDaysLeft={trialDaysLeft}
        userInitials={userInitials}
      />
      <AppContextMenu>
        <main className="flex-1 min-w-0 overflow-y-auto">
          <MobileTopBar orgName={orgName} userInitials={userInitials} />
          <div className="p-5">{children}</div>
        </main>
      </AppContextMenu>
      <AIChatBot />
    </div>
  );
}
