"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useClassStore } from "@/stores/class-store";

export default function NewClassPage() {
  const router = useRouter();
  const addClass = useClassStore((s) => s.addClass);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);

    const classId = await addClass(name);

    if (classId) {
      router.push(`/classes/${classId}`);
    } else {
      setLoading(false);
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
              onChange={(e) => setName(e.target.value)}
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
