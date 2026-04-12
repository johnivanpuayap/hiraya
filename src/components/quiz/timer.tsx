"use client";

import { useEffect, useState, useCallback } from "react";

interface TimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
}

export function Timer({ totalSeconds, onTimeUp }: TimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);

  const handleTimeUp = useCallback(onTimeUp, [onTimeUp]);

  useEffect(() => {
    if (remaining <= 0) {
      handleTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [remaining, handleTimeUp]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = remaining / totalSeconds;

  const urgencyColor = progress > 0.2 ? "bg-primary-gradient" : "bg-danger";

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[rgba(156,135,110,0.12)]">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${urgencyColor}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <span className="min-w-[4rem] text-right font-heading text-sm font-medium text-text-secondary">
        {minutes}:{seconds.toString().padStart(2, "0")}
      </span>
    </div>
  );
}
