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
        <p className="font-heading text-2xl font-bold text-text-primary">
          {currentStreak} day{currentStreak !== 1 ? "s" : ""}
        </p>
        <p className="text-xs text-text-secondary">
          Longest: {longestStreak} day{longestStreak !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
