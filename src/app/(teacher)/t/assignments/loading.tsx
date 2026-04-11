export default function AssignmentsLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded-xl bg-surface" />
        <div className="h-10 w-40 rounded-xl bg-surface" />
      </div>
      <div className="mt-6 flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
