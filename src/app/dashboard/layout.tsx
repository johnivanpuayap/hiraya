import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth";
import { logout } from "@/app/(auth)/actions";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, role, supabase } = await getAuthenticatedUser();

  if (!user) redirect("/login");
  if (!role) redirect("/login");

  const profilePromise = supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  const classCountPromise = role === "student"
    ? supabase
        .from("class_members")
        .select("id", { count: "exact", head: true })
        .eq("student_id", user.id)
    : Promise.resolve({ count: 1 });

  const [{ data: profile }, { count }] = await Promise.all([
    profilePromise,
    classCountPromise,
  ]);

  const hasClasses = role === "teacher" || (count ?? 0) > 0;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role={role} hasClasses={hasClasses} />
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
