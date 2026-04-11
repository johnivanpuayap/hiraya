import { Card } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-surface" />
      <div className="mt-2 h-5 w-72 animate-pulse rounded-lg bg-surface" />

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <div className="h-4 w-24 animate-pulse rounded bg-background" />
            <div className="mt-3 h-9 w-16 animate-pulse rounded bg-background" />
          </Card>
        ))}
      </div>
    </div>
  );
}
