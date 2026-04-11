"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface TeacherErrorProps {
  error: Error;
  reset: () => void;
}

export default function TeacherError({ error, reset }: TeacherErrorProps) {
  console.error("[teacher] route error", { message: error.message });

  return (
    <div className="flex items-center justify-center p-6">
      <Card className="max-w-md text-center">
        <h2 className="font-heading text-xl font-bold text-danger">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-text-secondary">{error.message}</p>
        <Button onClick={reset} className="mt-4">
          Try again
        </Button>
      </Card>
    </div>
  );
}
