"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getNextQuestion as engineGetNext,
  processAnswer,
  updateStreak,
} from "@/lib/adaptive/engine";

import type { SelectedQuestion } from "@/lib/adaptive/engine";

// ─── Types ────────────────────────────────────────────────────

interface CreateSessionInput {
  mode: "study" | "exam";
  categoryIds: string[];
  questionCount: number;
  timeLimitMinutes: number | null;
}

interface QuestionResponse {
  question: SelectedQuestion;
  questionNumber: number;
  totalQuestions: number;
}

interface SubmitAnswerInput {
  sessionId: string;
  questionId: string;
  selectedAnswer: "a" | "b" | "c" | "d";
  timeSpentMs: number;
}

interface StudyFeedback {
  isCorrect: boolean;
  correctAnswer: string;
}

interface SessionResults {
  correctCount: number;
  totalAnswered: number;
  score: number;
}

// ─── Actions ──────────────────────────────────────────────────

export async function createSession(
  input: CreateSessionInput
): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      student_id: user.id,
      mode: input.mode,
      category_ids: input.categoryIds.length > 0 ? input.categoryIds : null,
      question_count: input.questionCount,
      time_limit_minutes: input.timeLimitMinutes,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[practice] failed to create session", error);
    throw new Error("Failed to create practice session");
  }

  console.info("[practice] session created", {
    sessionId: data.id,
    mode: input.mode,
    questionCount: input.questionCount,
  });

  return data.id;
}

export async function fetchNextQuestion(
  sessionId: string
): Promise<QuestionResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();

  // Get session details
  const { data: session } = await supabase
    .from("sessions")
    .select("student_id, category_ids, question_count")
    .eq("id", sessionId)
    .single();

  if (!session || session.student_id !== user.id) {
    throw new Error("Session not found");
  }

  // Check how many questions already answered
  const { count } = await admin
    .from("responses")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  const answered = count ?? 0;

  if (answered >= session.question_count) {
    return null; // Session complete
  }

  const question = await engineGetNext(
    user.id,
    sessionId,
    session.category_ids,
    admin
  );

  if (!question) {
    return null; // No more questions available
  }

  return {
    question,
    questionNumber: answered + 1,
    totalQuestions: session.question_count,
  };
}

export async function submitAnswer(
  input: SubmitAnswerInput
): Promise<StudyFeedback | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();

  // Get session to check mode and ownership
  const { data: session } = await supabase
    .from("sessions")
    .select("student_id, mode")
    .eq("id", input.sessionId)
    .single();

  if (!session || session.student_id !== user.id) {
    throw new Error("Session not found");
  }

  // Get question to check correctness
  const { data: question } = await admin
    .from("questions")
    .select("correct_answer")
    .eq("id", input.questionId)
    .single();

  if (!question) {
    throw new Error("Question not found");
  }

  const isCorrect = input.selectedAnswer === question.correct_answer;

  // Record the response (student has INSERT permission via RLS)
  const { error } = await supabase.from("responses").insert({
    session_id: input.sessionId,
    question_id: input.questionId,
    selected_answer: input.selectedAnswer,
    is_correct: isCorrect,
    time_spent_ms: input.timeSpentMs,
  });

  if (error) {
    console.error("[practice] failed to record response", error);
    throw new Error("Failed to record answer");
  }

  // Update session correct_count
  if (isCorrect) {
    const { data: currentSession } = await supabase
      .from("sessions")
      .select("correct_count")
      .eq("id", input.sessionId)
      .single();

    await supabase
      .from("sessions")
      .update({ correct_count: (currentSession?.correct_count ?? 0) + 1 })
      .eq("id", input.sessionId);
  }

  // Study mode: process IRT + SR immediately and return feedback
  if (session.mode === "study") {
    const result = await processAnswer(user.id, input.questionId, isCorrect, admin);
    return {
      isCorrect: result.isCorrect,
      correctAnswer: result.correctAnswer,
    };
  }

  // Exam mode: no feedback, IRT + SR processed on session completion
  return null;
}

export async function completeSession(
  sessionId: string
): Promise<SessionResults> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();

  // Get session
  const { data: session } = await supabase
    .from("sessions")
    .select("student_id, mode, correct_count")
    .eq("id", sessionId)
    .single();

  if (!session || session.student_id !== user.id) {
    throw new Error("Session not found");
  }

  // Count total responses
  const { count } = await admin
    .from("responses")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  const totalAnswered = count ?? 0;

  // Exam mode: process IRT + SR for all responses
  if (session.mode === "exam") {
    const { data: responses } = await admin
      .from("responses")
      .select("question_id, is_correct")
      .eq("session_id", sessionId);

    for (const response of responses ?? []) {
      await processAnswer(
        user.id,
        response.question_id,
        response.is_correct,
        admin
      );
    }
  }

  // Mark session complete
  await supabase
    .from("sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", sessionId);

  // Update streak
  await updateStreak(user.id, admin);

  console.info("[practice] session completed", {
    sessionId,
    correctCount: session.correct_count,
    totalAnswered,
  });

  return {
    correctCount: session.correct_count,
    totalAnswered,
    score: totalAnswered > 0 ? session.correct_count / totalAnswered : 0,
  };
}
