"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { createAssignment } from "../actions";

const QUESTION_COUNTS = [10, 20, 30, 50] as const;

interface ClassOption {
  id: string;
  name: string;
}

interface CategoryOption {
  id: string;
  display_name: string;
}

export default function NewAssignmentPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"study" | "exam">("study");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<string>("");
  const [deadline, setDeadline] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(1);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [classesRes, catsRes] = await Promise.all([
        supabase.from("classes").select("id, name").order("name"),
        supabase
          .from("categories")
          .select("id, display_name")
          .order("display_name"),
      ]);
      setClasses(classesRes.data ?? []);
      setCategories(catsRes.data ?? []);
      if (classesRes.data?.[0]) setClassId(classesRes.data[0].id);
      setLoading(false);
    }
    load();
  }, []);

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!classId || !title.trim()) return;

    setSubmitting(true);
    setError(null);

    const result = await createAssignment({
      classId,
      title,
      mode,
      categoryIds: selectedCategories,
      questionCount,
      timeLimitMinutes: timeLimitMinutes ? parseInt(timeLimitMinutes) : null,
      deadline: deadline || null,
      maxAttempts,
    });

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    } else {
      router.push("/assignments");
    }
  }

  if (loading) {
    return <div className="h-96 animate-pulse rounded-2xl glass" />;
  }

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Create Assignment
      </h2>
      <p className="mt-1 text-text-secondary">
        Assign practice to your students.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 flex max-w-lg flex-col gap-6"
      >
        <Card>
          <div className="flex flex-col gap-4">
            <Select
              label="Class"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Input
              label="Title"
              placeholder="e.g. Week 3 — Database Review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </Card>

        <Card>
          <h3 className="font-heading text-base font-bold text-text-primary">
            Mode
          </h3>
          <div className="mt-3 flex gap-3">
            {(["study", "exam"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-xl border-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  mode === m
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-glass text-text-secondary"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-heading text-base font-bold text-text-primary">
            Topics
          </h3>
          <p className="mt-1 text-xs text-text-secondary">
            Leave empty for all topics.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={`rounded-xl border-2 px-3 py-1 text-xs font-medium transition-colors ${
                  selectedCategories.includes(cat.id)
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-glass text-text-secondary"
                }`}
              >
                {cat.display_name}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="font-heading text-base font-bold text-text-primary">
                Questions
              </h3>
              <div className="mt-3 flex gap-3">
                {QUESTION_COUNTS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setQuestionCount(count)}
                    className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-bold transition-colors ${
                      questionCount === count
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-glass text-text-secondary"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {mode === "exam" && (
              <Input
                label="Time Limit (minutes)"
                type="number"
                placeholder="e.g. 75"
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(e.target.value)}
              />
            )}

            <Input
              label="Deadline (optional)"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />

            <Input
              label="Max Attempts"
              type="number"
              value={maxAttempts.toString()}
              onChange={(e) =>
                setMaxAttempts(parseInt(e.target.value) || 1)
              }
            />
          </div>
        </Card>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button
          type="submit"
          disabled={submitting || !classId || !title.trim()}
        >
          {submitting ? "Creating..." : "Create Assignment"}
        </Button>
      </form>
    </div>
  );
}
