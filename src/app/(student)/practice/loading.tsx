export default function PracticeLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-32 rounded-xl bg-surface" />
      <div className="mt-2 h-4 w-64 rounded-xl bg-surface" />
      <div className="mt-6 flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
