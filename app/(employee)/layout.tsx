// Route: app/(employee)/layout.tsx
// Layout for employee pages — includes sidebar
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import Sidebar from "@/components/Sidebar";
import AppContextMenu from "@/components/AppContextMenu";
import AIChatBot from "@/components/AIChatBot";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let orgName = "Your Company";
  let orgId = "";
  let planName = "Starter";
  let trialDaysLeft = 0;
  let userInitials = "U";

  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;

    if (sessionToken) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get: (name) => cookieStore.get(name)?.value,
            set: () => {},
            remove: () => {},
          },
        }
      );

      // Get user from session
      const { data: session } = await supabase
        .from("user_sessions")
        .select("user_id")
        .eq("token", sessionToken)
        .maybeSingle();

      const userId = session?.user_id;

      if (userId) {
        const { data: userData } = await supabase
          .from("users")
          .select("org_id, full_name, email")
          .eq("id", userId)
          .maybeSingle();

        if (userData) {
          userInitials = userData.full_name
            ? userData.full_name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
            : (userData.email?.[0] || "U").toUpperCase();

          if (userData.org_id) {
            orgId = userData.org_id;
            const { data: orgData } = await supabase
              .from("organizations")
              .select("name, plan")
              .eq("id", userData.org_id)
              .maybeSingle();

            if (orgData) {
              orgName = orgData.name || orgName;
              planName = orgData.plan || planName;
            }
          }
        }
      }
    }
  } catch (e) {
    console.error("[EmployeeLayout]", e);
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
      <AppContextMenu>
        <main className="flex-1 overflow-y-auto p-5">{children}</main>
      </AppContextMenu>
      <AIChatBot />
    </div>
  );
}