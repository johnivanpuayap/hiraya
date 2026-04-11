"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClass } from "../actions";

export default function NewClassPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    const result = await createClass({ name });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else if (result.classId) {
      router.push(`/t/classes/${result.classId}`);
    }
  }

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Create a Class
      </h2>
      <p className="mt-1 text-text-secondary">
        Students will use a join code to enter your class.
      </p>

      <div className="mt-6 max-w-md">
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Class Name"
              name="name"
              placeholder="e.g. FE Review — Section A"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              error={error ?? undefined}
            />
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Creating..." : "Create Class"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
