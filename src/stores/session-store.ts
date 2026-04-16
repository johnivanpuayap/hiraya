import { create } from "zustand";

import { useToastStore } from "@/stores/toast-store";
import {
  createSession as createSessionAction,
  submitAnswer as submitAnswerAction,
  completeSession as completeSessionAction,
} from "@/app/(student)/practice/actions";

interface CreateSessionInput {
  mode: "study" | "exam";
  categoryIds: string[];
  questionCount: number;
  timeLimitMinutes: number | null;
}

interface SubmitAnswerInput {
  sessionId: string;
  questionId: string;
  selectedAnswer: "a" | "b" | "c" | "d";
  timeSpentMs: number;
}

interface SessionStore {
  createSession: (input: CreateSessionInput) => Promise<string | null>;
  submitAnswer: (input: SubmitAnswerInput) => Promise<{
    isCorrect: boolean;
    correctAnswer: string;
  } | null>;
  completeSession: (sessionId: string) => Promise<{
    correctCount: number;
    totalAnswered: number;
    score: number;
  } | null>;
}

export const useSessionStore = create<SessionStore>(() => ({
  createSession: async (input) => {
    const { addToast } = useToastStore.getState();

    try {
      const sessionId = await createSessionAction(input);
      return sessionId;
    } catch {
      addToast({
        type: "error",
        message: "Failed to start practice session",
      });
      return null;
    }
  },

  submitAnswer: async (input) => {
    try {
      return await submitAnswerAction(input);
    } catch {
      const { addToast } = useToastStore.getState();
      addToast({
        type: "error",
        message: "Failed to submit answer",
      });
      return null;
    }
  },

  completeSession: async (sessionId) => {
    const { addToast } = useToastStore.getState();

    try {
      const results = await completeSessionAction(sessionId);
      addToast({ type: "success", message: "Session completed" });
      return results;
    } catch {
      addToast({
        type: "error",
        message: "Failed to complete session",
      });
      return null;
    }
  },
}));
