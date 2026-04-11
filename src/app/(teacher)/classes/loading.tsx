export default function ClassesLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 rounded-xl bg-surface" />
        <div className="h-10 w-32 rounded-xl bg-surface" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
