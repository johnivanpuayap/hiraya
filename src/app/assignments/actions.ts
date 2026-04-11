"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

interface CreateAssignmentInput {
  classId: string;
  title: string;
  mode: "study" | "exam";
  categoryIds: string[];
  questionCount: number;
  timeLimitMinutes: number | null;
  deadline: string | null;
  maxAttempts: number;
}

export async function createAssignment(
  input: CreateAssignmentInput
): Promise<{ assignmentId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("assignments")
    .insert({
      class_id: input.classId,
      created_by: user.id,
      title: input.title.trim(),
      mode: input.mode,
      category_ids: input.categoryIds.length > 0 ? input.categoryIds : null,
      question_count: input.questionCount,
      time_limit_minutes: input.timeLimitMinutes,
      deadline: input.deadline,
      max_attempts: input.maxAttempts,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[assignment] create failed", error);
    return { error: "Failed to create assignment." };
  }

  console.info("[assignment] created", { assignmentId: data.id });
  revalidatePath("/assignments");
  return { assignmentId: data.id };
}

export async function deleteAssignment(
  assignmentId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId)
    .eq("created_by", user.id);

  if (error) {
    console.error("[assignment] delete failed", error);
    return { error: "Failed to delete assignment." };
  }

  revalidatePath("/assignments");
  return {};
}
