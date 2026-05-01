import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth";
import { getLessonForReader } from "@/lib/lessons/loader-public";
import { createAdminClient } from "@/lib/supabase/admin";

import { Card } from "@/components/ui/card";
import { MarkdownBody } from "@/components/markdown/markdown-body";

import { LessonQuiz } from "./lesson-quiz";
import { MarkAsReadButton } from "./mark-as-read-button";

interface LessonReaderPageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function LessonReaderPage({
  params,
}: LessonReaderPageProps): Promise<React.JSX.Element> {
  const { slug: slugSegments } = await params;
  const slug = slugSegments.join("/");

  const { user, role } = await getAuthenticatedUser();

  if (!user) redirect("/login");
  if (role !== "student") redirect("/dashboard");

  const lesson = await getLessonForReader(slug);
  if (!lesson) notFound();

  const admin = createAdminClient();

  const [lessonRowResult, readResult] = await Promise.all([
    admin
      .from("lessons")
      .select("id")
      .eq("slug", slug)
      .is("deleted_at", null)
      .maybeSingle(),
    admin
      .from("lesson_reads")
      .select("lesson_id, lessons!inner(slug)")
      .eq("user_id", user.id)
      .eq("lessons.slug", slug)
      .maybeSingle(),
  ]);

  const lessonRow = lessonRowResult.data;
  if (!lessonRow) notFound();

  const alreadyRead = readResult.data !== null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/learn"
          className="text-sm text-text-secondary hover:text-accent"
        >
          ← Back to Learn
        </Link>
      </div>

      <header className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-text-primary">
          {lesson.title}
        </h1>
        {lesson.estimatedMinutes != null ? (
          <p className="mt-2 text-sm text-text-secondary">
            📖 {lesson.estimatedMinutes} min read
          </p>
        ) : null}
      </header>

      <Card className="mb-6">
        <MarkdownBody>{lesson.body}</MarkdownBody>
      </Card>

      <Card className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-bold text-text-primary">
              Finished this one?
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Tick it off — we&apos;ll keep your progress glowing.
            </p>
          </div>
          <MarkAsReadButton
            lessonId={lessonRow.id}
            alreadyRead={alreadyRead}
          />
        </div>
      </Card>

      {lesson.quiz.length > 0 ? (
        <section>
          <h2 className="mb-4 font-heading text-2xl font-bold text-text-primary">
            Check your understanding
          </h2>
          <LessonQuiz lessonSlug={slug} questions={lesson.quiz} />
        </section>
      ) : null}
    </div>
  );
}
