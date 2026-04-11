"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface AuthErrorProps {
  error: Error;
  reset: () => void;
}

export default function AuthError({ error, reset }: AuthErrorProps) {
  return (
    <Card>
      <div className="text-center">
        <h2 className="font-heading text-xl font-bold text-danger">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-text-secondary">{error.message}</p>
        <Button onClick={reset} className="mt-4">
          Try again
        </Button>
      </div>
    </Card>
  );
}
