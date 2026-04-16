export function Divider({ text = "or" }: { text?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs uppercase tracking-wider text-text-muted">
        {text}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
