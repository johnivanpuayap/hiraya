"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRoleWithFallback } from "@/lib/auth";

export async function joinClass(
  joinCode: string
): Promise<{ error?: string; className?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getUserRoleWithFallback(user, supabase);
  if (role !== "student") {
    return { error: "Only students can join classes." };
  }

  const admin = createAdminClient();

  // Look up class by join code (uses service role to bypass RLS)
  const { data: classData } = await admin
    .from("classes")
    .select("id, name")
    .eq("join_code", joinCode.trim().toUpperCase())
    .single();

  if (!classData) {
    return { error: "Invalid join code. Please check and try again." };
  }

  // Check if already a member
  const { data: existing } = await admin
    .from("class_members")
    .select("id")
    .eq("class_id", classData.id)
    .eq("student_id", user.id)
    .single();

  if (existing) {
    return { error: "You are already a member of this class." };
  }

  // Join the class (student has INSERT permission via RLS)
  const { error } = await supabase.from("class_members").insert({
    class_id: classData.id,
    student_id: user.id,
  });

  if (error) {
    console.error("[class] failed to join", error);
    return { error: "Failed to join class. Please try again." };
  }

  console.info("[class] student joined class", {
    studentId: user.id,
    classId: classData.id,
    className: classData.name,
  });

  return { className: classData.name };
}
