"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { joinClass } from "./actions";

export default function JoinClassPage() {
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await joinClass(joinCode);

    if (result.error) {
      setError(result.error);
    } else if (result.className) {
      setSuccess(`Successfully joined "${result.className}"!`);
      setJoinCode("");
    }

    setLoading(false);
  }

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Join a Class
      </h2>
      <p className="mt-1 text-text-secondary">
        Enter the join code provided by your teacher.
      </p>

      <div className="mt-6 max-w-md">
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Join Code"
              name="joinCode"
              placeholder="e.g. ABC123"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase());
                setError(null);
              }}
              error={error ?? undefined}
              autoComplete="off"
            />

            {success && (
              <p className="text-sm font-medium text-success">{success}</p>
            )}

            <Button type="submit" disabled={loading || !joinCode.trim()}>
              {loading ? "Joining..." : "Join Class"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link
              href="/dashboard"
              className="text-sm text-text-secondary hover:text-accent"
            >
              Back to Dashboard
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
