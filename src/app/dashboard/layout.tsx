import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getUserRoleWithFallback } from "@/lib/auth";
import { logout } from "@/app/(auth)/actions";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getUserRoleWithFallback(user, supabase);
  if (!role) {
    redirect("/login");
  }

  const [{ data: profile }, { count: classCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single(),
    role === "student"
      ? supabase
          .from("class_members")
          .select("id", { count: "exact", head: true })
          .eq("student_id", user.id)
      : Promise.resolve({ count: 0 } as { count: number }),
  ]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role={role} hasClasses={role === "student" ? (classCount ?? 0) > 0 : true} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          displayName={profile?.display_name ?? (role === "teacher" ? "Teacher" : "Student")}
          avatarUrl={profile?.avatar_url ?? null}
          logoutAction={logout}
        />
        <main className="relative z-[1] flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
