interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
}

export function StreakDisplay({
  currentStreak,
  longestStreak,
}: StreakDisplayProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-3xl" role="img" aria-label="fire">
        🔥
      </span>
      <div>
        <p className="font-heading text-5xl text-primary">
          {currentStreak} <span className="text-sm text-text-muted font-medium">day{currentStreak !== 1 ? "s" : ""}</span>
        </p>
        <p className="text-xs text-text-secondary">
          Longest: {longestStreak} day{longestStreak !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
