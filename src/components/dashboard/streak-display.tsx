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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(199,123,26,0.1)]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C77B1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2c.5 3.5 2 6 4 8.5C18 13 19 15.5 19 18a7 7 0 1 1-14 0c0-2.5 1-5 3-7.5C10 8 11.5 5.5 12 2Z" />
        </svg>
      </div>
      <div>
        <p className="font-heading text-2xl text-text-primary">
          {currentStreak} <span className="text-sm font-medium text-text-muted">day{currentStreak !== 1 ? "s" : ""}</span>
        </p>
        <p className="text-xs text-text-secondary">
          Best: {longestStreak} day{longestStreak !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
