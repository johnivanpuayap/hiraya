"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useToastStore } from "@/stores/toast-store";

import { markLessonRead } from "@/app/learn/actions";

interface MarkAsReadButtonProps {
  lessonId: string;
  alreadyRead: boolean;
}

export function MarkAsReadButton({
  lessonId,
  alreadyRead,
}: MarkAsReadButtonProps): React.JSX.Element {
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);
  const [submitting, setSubmitting] = useState<boolean>(false);

  async function handleClick(): Promise<void> {
    setSubmitting(true);
    const result = await markLessonRead(lessonId);
    setSubmitting(false);

    if (result.error) {
      addToast({ type: "error", message: result.error });
      return;
    }

    addToast({ type: "success", message: "Lesson marked as read" });
    router.refresh();
  }

  if (alreadyRead) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-sm font-semibold text-success">
        ✓ Marked as read
      </span>
    );
  }

  return (
    <Button onClick={handleClick} disabled={submitting}>
      {submitting ? "Saving..." : "Mark as read"}
    </Button>
  );
}
