interface MasteryChartProps {
  categories: Array<{
    displayName: string;
    mastery: number;
    questionsSeen: number;
  }>;
}

export function MasteryChart({ categories }: MasteryChartProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {categories.map((cat) => {
        const hasData = cat.questionsSeen > 0;
        const barColor =
          cat.mastery >= 70
            ? "bg-success"
            : cat.mastery >= 40
              ? "bg-primary-gradient"
              : "bg-secondary";

        return (
          <div key={cat.displayName} className="group">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm text-text-primary">
                {cat.displayName}
              </span>
              <span className="text-xs font-medium tabular-nums text-text-muted">
                {hasData ? `${cat.mastery}%` : "—"}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[rgba(156,135,110,0.1)]">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
                style={{ width: hasData ? `${Math.max(cat.mastery, 2)}%` : "0%" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
