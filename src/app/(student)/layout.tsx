import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getUserRoleWithFallback } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default async function StudentLayout({ children }: StudentLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getUserRoleWithFallback(user, supabase);
  if (role !== "student") {
    redirect("/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="student" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          displayName={profile?.display_name ?? "Student"}
          avatarUrl={profile?.avatar_url ?? null}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
