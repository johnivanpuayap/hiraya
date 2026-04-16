"use client";

import { useState } from "react";

import { Card } from "@/components/ui/card";
import { assignRole } from "./actions";

export default function SelectRolePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(role: "student" | "teacher"): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      await assignRole(role);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="text-center">
        <h2 className="font-heading text-2xl font-bold text-text-primary">
          Welcome to Hiraya!
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          One last step — tell us how you&apos;ll use Hiraya.
        </p>
      </div>

      {error && (
        <p className="mt-4 text-center text-sm text-danger">{error}</p>
      )}

      <div className="mt-7 flex flex-col gap-3.5">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleSelect("student")}
          className="flex items-center gap-3.5 rounded-2xl border-2 border-glass p-5 text-left transition-all duration-200 hover:border-accent/30 hover:-translate-y-0.5 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#C77B1A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <div>
            <div className="text-[15px] font-semibold text-text-primary">
              I&apos;m a Student
            </div>
            <div className="mt-0.5 text-sm text-text-secondary">
              Practice questions, track my progress, and prepare for the exam
            </div>
          </div>
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => handleSelect("teacher")}
          className="flex items-center gap-3.5 rounded-2xl border-2 border-glass p-5 text-left transition-all duration-200 hover:border-secondary/30 hover:-translate-y-0.5 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#B85A3B"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <div className="text-[15px] font-semibold text-text-primary">
              I&apos;m a Teacher
            </div>
            <div className="mt-0.5 text-sm text-text-secondary">
              Create classes, assign practice sets, and monitor student progress
            </div>
          </div>
        </button>
      </div>
    </Card>
  );
}
