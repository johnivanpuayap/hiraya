"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useClassMemberStore } from "@/stores/class-member-store";

export function JoinClassForm() {
  const joinClass = useClassMemberStore((s) => s.joinClass);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setLoading(true);

    const className = await joinClass(joinCode);

    if (className) {
      setJoinCode("");
    }

    setLoading(false);
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Join Code"
          name="joinCode"
          placeholder="e.g. ABC123"
          value={joinCode}
          onChange={(e) => {
            setJoinCode(e.target.value.toUpperCase());
          }}
          autoComplete="off"
        />

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
  );
}
