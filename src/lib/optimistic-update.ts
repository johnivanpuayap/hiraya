import { useToastStore } from "@/stores/toast-store";

interface OptimisticUpdateOptions {
  optimisticFn: () => void;
  serverFn: () => Promise<{ error?: string }>;
  rollbackFn: () => void;
  successMessage: string;
  errorMessage: string;
}

export async function performOptimisticUpdate({
  optimisticFn,
  serverFn,
  rollbackFn,
  successMessage,
  errorMessage,
}: OptimisticUpdateOptions): Promise<void> {
  const { addToast } = useToastStore.getState();

  // Apply optimistic update immediately
  optimisticFn();
  addToast({ type: "success", message: successMessage });

  let result: { error?: string };

  try {
    result = await serverFn();
  } catch {
    result = { error: "An unexpected error occurred" };
  }

  if (result.error) {
    // Rollback and show error toast with retry
    rollbackFn();

    // Remove the success toast (it's stale now)
    const { toasts, removeToast } = useToastStore.getState();
    const successToast = toasts.find(
      (t) => t.type === "success" && t.message === successMessage
    );
    if (successToast) {
      removeToast(successToast.id);
    }

    addToast({
      type: "error",
      message: errorMessage,
      onRetry: () =>
        performOptimisticUpdate({
          optimisticFn,
          serverFn,
          rollbackFn,
          successMessage,
          errorMessage,
        }),
    });
  }
}
