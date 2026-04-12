"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";

import { QuestionCard } from "@/components/quiz/question-card";
import { Timer } from "@/components/quiz/timer";
import { ProgressBar } from "@/components/quiz/progress-bar";
import { AnswerFeedback } from "@/components/quiz/answer-feedback";
import { QuizNav } from "@/components/quiz/quiz-nav";
import { fetchNextQuestion, submitAnswer, completeSession } from "../actions";

import type { SelectedQuestion } from "@/lib/adaptive/engine";

type Answer = "a" | "b" | "c" | "d";

interface SessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = use(params);
  const router = useRouter();

  const [question, setQuestion] = useState<SelectedQuestion | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [mode, setMode] = useState<"study" | "exam">("study");
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number | null>(null);

  const [selectedAnswer, setSelectedAnswer] = useState<Answer | null>(null);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [answerStartTime, setAnswerStartTime] = useState(Date.now());

  // Load session info and first question
  useEffect(() => {
    loadSessionAndQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSessionAndQuestion() {
    setLoadingQuestion(true);
    try {
      const result = await fetchNextQuestion(sessionId);
      if (!result) {
        // Session is already complete or no questions
        router.replace(`/practice/${sessionId}/results`);
        return;
      }

      setQuestion(result.question);
      setQuestionNumber(result.questionNumber);
      setTotalQuestions(result.totalQuestions);
      setAnswerStartTime(Date.now());

      // Detect mode and time limit from first load
      // We determine mode from the URL or session — for now we pass it via searchParams
      // but actually we should fetch session info. Let's fetch it:
      const response = await fetch(`/api/session/${sessionId}/info`);
      if (response.ok) {
        const info = await response.json();
        setMode(info.mode);
        if (info.timeLimitMinutes) {
          setTimeLimitSeconds(info.timeLimitMinutes * 60);
        }
      }
    } finally {
      setLoadingQuestion(false);
    }
  }

  const handleTimeUp = useCallback(async () => {
    await completeSession(sessionId);
    router.replace(`/practice/${sessionId}/results`);
  }, [sessionId, router]);

  async function handleSelectAnswer(answer: Answer) {
    if (submitting || feedback) return;

    setSelectedAnswer(answer);

    if (mode === "study") {
      // Study mode: submit immediately, show feedback
      setSubmitting(true);
      const timeSpentMs = Date.now() - answerStartTime;

      const result = await submitAnswer({
        sessionId,
        questionId: question!.id,
        selectedAnswer: answer,
        timeSpentMs,
      });

      setFeedback(result);
      setSubmitting(false);
    }
  }

  async function handleNext() {
    if (mode === "exam" && selectedAnswer && question) {
      // Exam mode: submit answer before moving to next
      setSubmitting(true);
      const timeSpentMs = Date.now() - answerStartTime;

      await submitAnswer({
        sessionId,
        questionId: question.id,
        selectedAnswer,
        timeSpentMs,
      });
      setSubmitting(false);
    }

    // Reset and load next question
    setSelectedAnswer(null);
    setFeedback(null);
    setLoadingQuestion(true);

    const result = await fetchNextQuestion(sessionId);
    if (!result) {
      // No more questions
      if (mode === "exam") {
        await completeSession(sessionId);
      } else {
        await completeSession(sessionId);
      }
      router.replace(`/practice/${sessionId}/results`);
      return;
    }

    setQuestion(result.question);
    setQuestionNumber(result.questionNumber);
    setTotalQuestions(result.totalQuestions);
    setAnswerStartTime(Date.now());
    setLoadingQuestion(false);
  }

  async function handleQuit() {
    await completeSession(sessionId);
    router.replace(`/practice/${sessionId}/results`);
  }

  async function handleSubmitExam() {
    // Submit the current answer if selected
    if (selectedAnswer && question) {
      const timeSpentMs = Date.now() - answerStartTime;
      await submitAnswer({
        sessionId,
        questionId: question.id,
        selectedAnswer,
        timeSpentMs,
      });
    }
    await completeSession(sessionId);
    router.replace(`/practice/${sessionId}/results`);
  }

  if (loadingQuestion && !question) {
    return (
      <div className="glass rounded-2xl shadow-warm p-6">
        <div className="flex items-center justify-center py-12">
          <p className="text-text-secondary">Loading question...</p>
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      {/* Timer (exam mode only) */}
      {mode === "exam" && timeLimitSeconds && (
        <Timer totalSeconds={timeLimitSeconds} onTimeUp={handleTimeUp} />
      )}

      {/* Progress */}
      <ProgressBar current={questionNumber} total={totalQuestions} />

      {/* Question */}
      <div className="glass rounded-2xl shadow-warm relative p-6">
        <div className="absolute top-0 right-0 w-20 h-20 bg-[radial-gradient(circle_at_top_right,rgba(199,123,26,0.15)_0%,transparent_60%)] rounded-tr-2xl pointer-events-none" />
        <QuestionCard
          questionText={question.questionText}
          imageUrl={question.imageUrl}
          options={[
            { key: "a", text: question.optionA },
            { key: "b", text: question.optionB },
            { key: "c", text: question.optionC },
            { key: "d", text: question.optionD },
          ]}
          selectedAnswer={selectedAnswer}
          correctAnswer={feedback?.correctAnswer ?? null}
          showFeedback={!!feedback}
          disabled={submitting || !!feedback}
          onSelect={handleSelectAnswer}
        />

        {/* Feedback (study mode) */}
        {feedback && (
          <div className="mt-4">
            <AnswerFeedback isCorrect={feedback.isCorrect} />
          </div>
        )}
      </div>

      {/* Navigation */}
      <QuizNav
        mode={mode}
        hasAnswered={!!selectedAnswer}
        showingFeedback={!!feedback}
        isLastQuestion={questionNumber >= totalQuestions}
        onNext={handleNext}
        onQuit={handleQuit}
        onSubmitExam={handleSubmitExam}
      />
    </div>
  );
}
