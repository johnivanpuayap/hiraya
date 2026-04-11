"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { generateJoinCode } from "@/lib/utils";

export async function createClass(input: {
  name: string;
}): Promise<{ classId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Generate unique join code with retry
  let joinCode = generateJoinCode();
  let attempts = 0;
  while (attempts < 5) {
    const { data: existing } = await supabase
      .from("classes")
      .select("id")
      .eq("join_code", joinCode)
      .single();

    if (!existing) break;
    joinCode = generateJoinCode();
    attempts++;
  }

  const { data, error } = await supabase
    .from("classes")
    .insert({
      name: input.name.trim(),
      teacher_id: user.id,
      join_code: joinCode,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[class] create failed", error);
    return { error: "Failed to create class." };
  }

  console.info("[class] created", { classId: data.id, joinCode });
  revalidatePath("/classes");
  return { classId: data.id };
}

export async function deleteClass(
  classId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("classes")
    .delete()
    .eq("id", classId)
    .eq("teacher_id", user.id);

  if (error) {
    console.error("[class] delete failed", error);
    return { error: "Failed to delete class." };
  }

  revalidatePath("/classes");
  return {};
}

export async function removeStudent(
  classId: string,
  studentId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verify teacher owns this class
  const { data: classData } = await supabase
    .from("classes")
    .select("teacher_id")
    .eq("id", classId)
    .single();

  if (!classData || classData.teacher_id !== user.id) {
    return { error: "Not authorized." };
  }

  const { error } = await supabase
    .from("class_members")
    .delete()
    .eq("class_id", classId)
    .eq("student_id", studentId);

  if (error) {
    console.error("[class] remove student failed", error);
    return { error: "Failed to remove student." };
  }

  revalidatePath(`/classes/${classId}`);
  return {};
}
