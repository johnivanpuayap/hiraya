"use client";

interface QuestionCardProps {
  questionText: string;
  imageUrl: string | null;
  options: { key: "a" | "b" | "c" | "d"; text: string }[];
  selectedAnswer: "a" | "b" | "c" | "d" | null;
  correctAnswer?: string | null;
  showFeedback: boolean;
  disabled: boolean;
  onSelect: (answer: "a" | "b" | "c" | "d") => void;
}

const OPTION_LABELS = { a: "A", b: "B", c: "C", d: "D" } as const;

export function QuestionCard({
  questionText,
  imageUrl,
  options,
  selectedAnswer,
  correctAnswer,
  showFeedback,
  disabled,
  onSelect,
}: QuestionCardProps) {
  function getOptionStyle(key: "a" | "b" | "c" | "d"): string {
    const base =
      "flex w-full items-start gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-colors";

    if (showFeedback && correctAnswer) {
      if (key === correctAnswer) {
        return `${base} border-success bg-success/10 text-text-primary`;
      }
      if (key === selectedAnswer && key !== correctAnswer) {
        return `${base} border-danger bg-danger/10 text-text-primary`;
      }
      return `${base} border-surface bg-white text-text-secondary`;
    }

    if (key === selectedAnswer) {
      return `${base} border-accent bg-accent/10 text-text-primary`;
    }

    return `${base} border-surface bg-white text-text-primary hover:border-accent/30`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-lg font-medium leading-relaxed text-text-primary">
          {questionText}
        </p>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Question illustration"
            className="mt-4 max-h-64 rounded-xl"
          />
        )}
      </div>

      <div className="flex flex-col gap-3">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option.key)}
            className={getOptionStyle(option.key)}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface font-heading text-xs font-bold text-text-secondary">
              {OPTION_LABELS[option.key]}
            </span>
            <span>{option.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
