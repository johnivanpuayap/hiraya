"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSession } from "./actions";

interface Category {
  id: string;
  display_name: string;
}

interface PracticeSetupProps {
  categories: Category[];
}

const QUESTION_COUNTS = [10, 20, 30] as const;
const TIME_PRESETS = [
  { label: "25 min", value: 25 },
  { label: "50 min", value: 50 },
  { label: "75 min", value: 75 },
] as const;

export function PracticeSetup({ categories }: PracticeSetupProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"study" | "exam">("study");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  async function handleStart() {
    setLoading(true);
    try {
      const sessionId = await createSession({
        mode,
        categoryIds: selectedCategories,
        questionCount,
        timeLimitMinutes: mode === "exam" ? timeLimitMinutes : null,
      });
      router.push(`/practice/${sessionId}`);
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Mode selection */}
      <Card>
        <h3 className="font-heading text-lg font-bold text-text-primary">
          Mode
        </h3>
        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={() => setMode("study")}
            className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors ${
              mode === "study"
                ? "border-accent bg-accent/10 text-accent"
                : "border-surface text-text-secondary hover:border-accent/30"
            }`}
          >
            <span className="block font-heading text-base font-bold">Study</span>
            <span className="mt-0.5 block text-xs">
              Untimed, instant feedback
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("exam");
              if (!timeLimitMinutes) setTimeLimitMinutes(25);
            }}
            className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors ${
              mode === "exam"
                ? "border-accent bg-accent/10 text-accent"
                : "border-surface text-text-secondary hover:border-accent/30"
            }`}
          >
            <span className="block font-heading text-base font-bold">Exam</span>
            <span className="mt-0.5 block text-xs">
              Timed, no feedback until done
            </span>
          </button>
        </div>
      </Card>

      {/* Category selection */}
      <Card>
        <h3 className="font-heading text-lg font-bold text-text-primary">
          Topics
        </h3>
        <p className="mt-1 text-xs text-text-secondary">
          Select specific topics or leave empty to practice all.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggleCategory(cat.id)}
              className={`rounded-xl border-2 px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedCategories.includes(cat.id)
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-surface text-text-secondary hover:border-accent/30"
              }`}
            >
              {cat.display_name}
            </button>
          ))}
        </div>
      </Card>

      {/* Question count */}
      <Card>
        <h3 className="font-heading text-lg font-bold text-text-primary">
          Questions
        </h3>
        <div className="mt-3 flex gap-3">
          {QUESTION_COUNTS.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setQuestionCount(count)}
              className={`flex-1 rounded-xl border-2 px-4 py-3 text-center font-heading text-lg font-bold transition-colors ${
                questionCount === count
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-surface text-text-secondary hover:border-accent/30"
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </Card>

      {/* Time limit (exam mode only) */}
      {mode === "exam" && (
        <Card>
          <h3 className="font-heading text-lg font-bold text-text-primary">
            Time Limit
          </h3>
          <div className="mt-3 flex gap-3">
            {TIME_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setTimeLimitMinutes(preset.value)}
                className={`flex-1 rounded-xl border-2 px-4 py-3 text-center text-sm font-medium transition-colors ${
                  timeLimitMinutes === preset.value
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-surface text-text-secondary hover:border-accent/30"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Start button */}
      <Button onClick={handleStart} disabled={loading} size="lg">
        {loading ? "Starting..." : "Start Practice"}
      </Button>
    </div>
  );
}
