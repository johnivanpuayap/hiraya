import { create } from "zustand";

import { performOptimisticUpdate } from "@/lib/optimistic-update";
import {
  createAssignment as createAssignmentAction,
  deleteAssignment as deleteAssignmentAction,
} from "@/app/assignments/actions";

import type { Database } from "@/types/database";

type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"];

interface AssignmentStore {
  assignments: AssignmentRow[];
  classNameMap: Record<string, string>;
  hydrate: (assignments: AssignmentRow[], classNameMap: Record<string, string>) => void;
  addAssignment: (input: {
    classId: string;
    title: string;
    mode: "study" | "exam";
    categoryIds: string[];
    questionCount: number;
    timeLimitMinutes: number | null;
    deadline: string | null;
    maxAttempts: number;
  }) => Promise<string | null>;
  deleteAssignment: (assignmentId: string) => Promise<void>;
}

export const useAssignmentStore = create<AssignmentStore>((set, get) => ({
  assignments: [],
  classNameMap: {},

  hydrate: (assignments, classNameMap) => set({ assignments, classNameMap }),

  addAssignment: async (input) => {
    const { addToast } = await import("@/stores/toast-store").then((m) => m.useToastStore.getState());

    const result = await createAssignmentAction(input);

    if (result.error) {
      addToast({
        type: "error",
        message: result.error,
        onRetry: () => get().addAssignment(input),
      });
      return null;
    }

    if (result.assignmentId) {
      addToast({ type: "success", message: "Assignment created" });
      return result.assignmentId;
    }

    return null;
  },

  deleteAssignment: async (assignmentId) => {
    const { assignments } = get();
    const deleted = assignments.find((a) => a.id === assignmentId);
    if (!deleted) return;

    const previousAssignments = [...assignments];

    await performOptimisticUpdate({
      optimisticFn: () =>
        set({
          assignments: assignments.filter((a) => a.id !== assignmentId),
        }),
      serverFn: () => deleteAssignmentAction(assignmentId),
      rollbackFn: () => set({ assignments: previousAssignments }),
      successMessage: `"${deleted.title}" deleted`,
      errorMessage: `Failed to delete "${deleted.title}"`,
    });
  },
}));
