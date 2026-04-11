"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose: () => void;
}

const typeStyles: Record<NonNullable<ToastProps["type"]>, string> = {
  success: "border-success bg-success/10 text-success",
  error: "border-danger bg-danger/10 text-danger",
  info: "border-primary bg-primary/10 text-text-primary",
};

export function Toast({
  message,
  type = "info",
  duration = 4000,
  onClose,
}: ToastProps): React.JSX.Element | null {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 rounded-xl border-2 px-4 py-3 shadow-warm-lg ${typeStyles[type]}`}
      role="alert"
    >
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
