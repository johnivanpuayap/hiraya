import { create } from "zustand";

import { useToastStore } from "@/stores/toast-store";
import { joinClass as joinClassAction } from "@/app/(student)/classes/join/actions";

interface ClassMemberStore {
  joinClass: (joinCode: string) => Promise<string | null>;
}

export const useClassMemberStore = create<ClassMemberStore>(() => ({
  joinClass: async (joinCode) => {
    const { addToast } = useToastStore.getState();

    const result = await joinClassAction(joinCode);

    if (result.error) {
      addToast({
        type: "error",
        message: result.error,
      });
      return null;
    }

    if (result.className) {
      addToast({
        type: "success",
        message: `Joined "${result.className}"`,
      });
      return result.className;
    }

    return null;
  },
}));
