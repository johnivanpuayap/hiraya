import { create } from "zustand";

import { useToastStore } from "@/stores/toast-store";
import { updateProfile as updateProfileAction } from "@/app/(student)/profile/actions";

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
}

interface ProfileStore {
  profile: ProfileData | null;
  hydrate: (profile: ProfileData) => void;
  updateProfile: (input: { firstName: string; lastName: string }) => Promise<void>;
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: null,

  hydrate: (profile) => set({ profile }),

  updateProfile: async (input) => {
    const { addToast } = useToastStore.getState();
    const previous = get().profile;

    // Optimistic update
    if (previous) {
      set({
        profile: {
          ...previous,
          firstName: input.firstName,
          lastName: input.lastName,
        },
      });
    }

    const result = await updateProfileAction(input);

    if (result.error) {
      // Rollback
      if (previous) {
        set({ profile: previous });
      }
      addToast({
        type: "error",
        message: result.error,
        onRetry: () => get().updateProfile(input),
      });
    } else {
      addToast({ type: "success", message: "Profile updated" });
    }
  },
}));
