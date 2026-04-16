"use client";

import { useEffect, useRef } from "react";

import { useToastStore } from "@/stores/toast-store";

const AUTO_DISMISS_MS = 4000;

export function Toaster(): React.ReactNode {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          onRetry={toast.onRetry}
          onDismiss={removeToast}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  id: string;
  type: "success" | "error";
  message: string;
  onRetry?: () => void;
  onDismiss: (id: string) => void;
}

function ToastItem({ id, type, message, onRetry, onDismiss }: ToastItemProps): React.ReactNode {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (type === "success") {
      timerRef.current = setTimeout(() => onDismiss(id), AUTO_DISMISS_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [id, type, onDismiss]);

  const isError = type === "error";

  return (
    <div
      className="animate-slide-in-right flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-warm backdrop-blur-xl"
      style={{
        background: "rgba(255, 250, 240, 0.75)",
        borderColor: isError
          ? "rgba(191, 74, 45, 0.2)"
          : "rgba(199, 123, 26, 0.15)",
        maxWidth: "340px",
      }}
    >
      {/* Icon */}
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm"
        style={{
          background: isError
            ? "rgba(191, 74, 45, 0.12)"
            : "rgba(90, 142, 76, 0.15)",
          color: isError ? "#BF4A2D" : "#5A8E4C",
        }}
      >
        {isError ? "\u2715" : "\u2713"}
      </div>

      {/* Message */}
      <span className="flex-1 text-sm text-text-primary">{message}</span>

      {/* Retry button (error only) */}
      {isError && onRetry && (
        <button
          onClick={() => {
            onDismiss(id);
            onRetry();
          }}
          className="shrink-0 rounded-lg px-3 py-1 text-xs font-semibold transition-colors hover:opacity-80"
          style={{
            background: "rgba(191, 74, 45, 0.08)",
            border: "1px solid rgba(191, 74, 45, 0.2)",
            color: "#BF4A2D",
          }}
        >
          Retry
        </button>
      )}

      {/* Dismiss button (error only, for manual dismissal) */}
      {isError && (
        <button
          onClick={() => onDismiss(id)}
          className="shrink-0 text-text-muted hover:text-text-secondary"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>
      )}
    </div>
  );
}
