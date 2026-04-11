"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function updateProfile(input: {
  firstName: string;
  lastName: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: input.firstName,
      last_name: input.lastName,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[profile] update failed", error);
    return { error: "Failed to update profile." };
  }

  return {};
}
