"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function assignRole(role: "student" | "teacher"): Promise<never> {
  if (role !== "student" && role !== "teacher") {
    throw new Error("Invalid role");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Update the profile role
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", user.id);

  if (profileError) {
    console.error("[auth] failed to update profile role", { error: profileError.message });
    throw new Error("Failed to assign role");
  }

  // Update app_metadata so the JWT hook picks up the role immediately
  const admin = createAdminClient();
  const { error: metaError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { role },
  });

  if (metaError) {
    console.error("[auth] failed to update app_metadata role", { error: metaError.message });
    throw new Error("Failed to assign role");
  }

  console.info("[auth] role assigned", { userId: user.id, role });
  redirect("/dashboard");
}
