import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound(): React.JSX.Element {
  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <h1 className="font-heading text-2xl text-text-primary">
        Lost a page?
      </h1>
      <p className="mt-2 text-text-secondary">
        Looks like this one moved — let&apos;s get you back to the lessons.
      </p>
      <div className="mt-6">
        <Link href="/learn">
          <Button>← Back to Learn</Button>
        </Link>
      </div>
    </Card>
  );
}
