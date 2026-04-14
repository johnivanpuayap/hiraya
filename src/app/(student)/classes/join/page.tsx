import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { JoinClassForm } from "./join-class-form";

export default async function JoinClassPage() {
  const { user } = await getAuthenticatedUser();

  if (!user) redirect("/login");

  // If student already has classes, redirect to dashboard
  const admin = createAdminClient();
  const { count } = await admin
    .from("class_members")
    .select("id", { count: "exact", head: true })
    .eq("student_id", user.id);

  if ((count ?? 0) > 0) {
    redirect("/dashboard");
  }

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Join a Class
      </h2>
      <p className="mt-1 text-text-secondary">
        Enter the join code provided by your teacher.
      </p>

      <div className="mt-6 max-w-md">
        <JoinClassForm />
      </div>
    </div>
  );
}
