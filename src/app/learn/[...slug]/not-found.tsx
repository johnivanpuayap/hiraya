import Link from "next/link";

import { Card } from "@/components/ui/card";

export default function NotFound(): React.JSX.Element {
  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <h1 className="font-heading text-2xl text-text-primary">
        Lesson not found
      </h1>
      <p className="mt-2 text-text-secondary">
        This lesson moved or hasn&apos;t been published yet. Try heading back to
        the lesson list.
      </p>
      <div className="mt-6">
        <Link
          href="/learn"
          className="inline-flex items-center justify-center rounded-xl font-heading font-semibold transition-all duration-250 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 bg-primary-gradient text-white shadow-[0_4px_16px_rgba(199,123,26,0.35)] hover:shadow-[0_6px_24px_rgba(199,123,26,0.45)] hover:-translate-y-0.5 px-5 py-2.5 text-sm"
        >
          ← Back to Learn
        </Link>
      </div>
    </Card>
  );
}
