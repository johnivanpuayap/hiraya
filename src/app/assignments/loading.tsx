export default function AssignmentsLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 rounded-xl bg-surface" />
      <div className="mt-2 h-4 w-72 rounded-xl bg-surface" />
      <div className="mt-6 flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
