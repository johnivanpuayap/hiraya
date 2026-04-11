import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getUserRoleWithFallback } from "@/lib/auth";
import { PracticeSetup } from "./practice-setup";

export default async function PracticePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getUserRoleWithFallback(user, supabase);
  if (role !== "student") redirect("/dashboard");

  // Fetch categories for the selection form
  const { data: categories } = await supabase
    .from("categories")
    .select("id, display_name")
    .order("display_name");

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Practice
      </h2>
      <p className="mt-1 text-text-secondary">
        Choose your mode and topics, then start practicing.
      </p>

      <div className="mt-6">
        <PracticeSetup categories={categories ?? []} />
      </div>
    </div>
  );
}
