export default function QuestionsLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-surface" />
      <div className="mt-2 h-4 w-64 rounded-xl bg-surface" />
      <div className="mt-4 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-xl bg-surface" />
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
