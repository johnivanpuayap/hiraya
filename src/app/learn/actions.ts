"use server";

import { redirect } from "next/navigation";

import { getLessonForGrading } from "@/lib/lessons/loader-server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function markLessonRead(
  lessonId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("lesson_reads")
    .upsert(
      { user_id: user.id, lesson_id: lessonId },
      { onConflict: "user_id,lesson_id" }
    );

  if (error) {
    console.error("[learn] mark read failed", error);
    return { error: "Failed to mark as read." };
  }

  console.info("[learn] marked read", { lessonId, userId: user.id });
  return {};
}

interface SubmitQuizInput {
  lessonSlug: string;
  answers: number[];
}

interface SubmitQuizResult {
  correctCount: number;
  totalCount: number;
  passed: boolean;
  explanations: string[];
  error?: string;
}

export async function submitQuizAttempt(
  input: SubmitQuizInput
): Promise<SubmitQuizResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const gradingLesson = await getLessonForGrading(input.lessonSlug);
  if (!gradingLesson) {
    console.error("[learn] quiz submit: lesson not found", {
      lessonSlug: input.lessonSlug,
    });
    return {
      correctCount: 0,
      totalCount: 0,
      passed: false,
      explanations: [],
      error: "Lesson not found.",
    };
  }

  const totalCount = gradingLesson.quiz.length;

  if (input.answers.length !== totalCount) {
    console.error("[learn] quiz submit: answer count mismatch", {
      lessonSlug: input.lessonSlug,
      expected: totalCount,
      received: input.answers.length,
    });
    return {
      correctCount: 0,
      totalCount,
      passed: false,
      explanations: [],
      error: "Invalid answer submission.",
    };
  }

  for (let i = 0; i < input.answers.length; i++) {
    const answer = input.answers[i];
    const optionsLength = gradingLesson.quiz[i].options.length;
    if (
      !Number.isInteger(answer) ||
      answer < 0 ||
      answer >= optionsLength
    ) {
      console.warn("[learn] invalid quiz answer", {
        lessonSlug: input.lessonSlug,
        answers: input.answers,
        userId: user.id,
      });
      return {
        correctCount: 0,
        totalCount: 0,
        passed: false,
        explanations: [],
        error: "That submission didn't go through. Try resubmitting.",
      };
    }
  }

  const admin = createAdminClient();

  const { data: lessonRow, error: lessonLookupError } = await admin
    .from("lessons")
    .select("id, content_hash, quiz_hash")
    .eq("slug", input.lessonSlug)
    .is("deleted_at", null)
    .maybeSingle();

  if (lessonLookupError || !lessonRow) {
    console.error("[learn] quiz submit: lesson row lookup failed", {
      lessonSlug: input.lessonSlug,
      error: lessonLookupError,
    });
    return {
      correctCount: 0,
      totalCount,
      passed: false,
      explanations: [],
      error: "Lesson not found.",
    };
  }

  const correctCount = gradingLesson.quiz.reduce(
    (count, question, index) =>
      question.correctIndex === input.answers[index] ? count + 1 : count,
    0
  );

  const passed = correctCount === totalCount;
  const explanations = gradingLesson.quiz.map((q) => q.explanation);

  const { error: insertError } = await admin
    .from("lesson_quiz_attempts")
    .insert({
      user_id: user.id,
      lesson_id: lessonRow.id,
      correct_count: correctCount,
      total_count: totalCount,
      passed,
      answers: input.answers,
      content_hash_at_attempt: lessonRow.content_hash,
      quiz_hash_at_attempt: lessonRow.quiz_hash,
    });

  if (insertError) {
    console.error("[learn] quiz attempt insert failed", {
      lessonSlug: input.lessonSlug,
      userId: user.id,
      error: insertError,
    });
    return {
      correctCount,
      totalCount,
      passed,
      explanations,
      error: "Failed to record quiz attempt.",
    };
  }

  console.info("[learn] quiz attempt recorded", {
    lessonSlug: input.lessonSlug,
    userId: user.id,
    correctCount,
    totalCount,
    passed,
  });

  return { correctCount, totalCount, passed, explanations };
}
