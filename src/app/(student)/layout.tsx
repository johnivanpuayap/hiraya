import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/auth";
import { logout } from "@/app/(auth)/actions";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default async function StudentLayout({ children }: StudentLayoutProps) {
  const { user, role, supabase } = await getAuthenticatedUser();

  if (!user) redirect("/login");
  if (role !== "student") redirect("/dashboard");

  const admin = createAdminClient();
  const [{ data: profile }, { count: classCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single(),
    admin
      .from("class_members")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id),
  ]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="student" hasClasses={(classCount ?? 0) > 0} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          displayName={profile?.display_name ?? "Student"}
          avatarUrl={profile?.avatar_url ?? null}
          logoutAction={logout}
        />
        <main className="relative z-[1] flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
