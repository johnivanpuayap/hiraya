import { create } from "zustand";

import { useToastStore } from "@/stores/toast-store";
import { performOptimisticUpdate } from "@/lib/optimistic-update";
import {
  createClass as createClassAction,
  deleteClass as deleteClassAction,
} from "@/app/(teacher)/classes/actions";

interface ClassItem {
  id: string;
  name: string;
  join_code: string;
  created_at: string;
  teacher_id: string;
  updated_at: string;
}

interface ClassStore {
  classes: ClassItem[];
  memberCounts: Record<string, number>;
  hydrate: (classes: ClassItem[], memberCounts: Record<string, number>) => void;
  addClass: (name: string) => Promise<string | null>;
  deleteClass: (classId: string) => Promise<void>;
}

export const useClassStore = create<ClassStore>((set, get) => ({
  classes: [],
  memberCounts: {},

  hydrate: (classes, memberCounts) => set({ classes, memberCounts }),

  addClass: async (name) => {
    const { addToast } = useToastStore.getState();

    const result = await createClassAction({ name });

    if (result.error) {
      addToast({
        type: "error",
        message: result.error,
        onRetry: () => get().addClass(name),
      });
      return null;
    }

    if (result.classId) {
      addToast({ type: "success", message: "Class created" });
      return result.classId;
    }

    return null;
  },

  deleteClass: async (classId) => {
    const { classes, memberCounts } = get();
    const deletedClass = classes.find((c) => c.id === classId);
    if (!deletedClass) return;

    const previousClasses = [...classes];
    const previousCounts = { ...memberCounts };

    await performOptimisticUpdate({
      optimisticFn: () =>
        set({
          classes: classes.filter((c) => c.id !== classId),
        }),
      serverFn: () => deleteClassAction(classId),
      rollbackFn: () =>
        set({ classes: previousClasses, memberCounts: previousCounts }),
      successMessage: `"${deletedClass.name}" deleted`,
      errorMessage: `Failed to delete "${deletedClass.name}"`,
    });
  },
}));
