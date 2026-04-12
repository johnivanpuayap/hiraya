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
      "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all duration-250";

    if (showFeedback && correctAnswer) {
      if (key === correctAnswer) {
        return `${base} border-success bg-success/10 text-text-primary`;
      }
      if (key === selectedAnswer && key !== correctAnswer) {
        return `${base} border-danger bg-danger/10 text-text-primary`;
      }
      return `${base} border-glass bg-white text-text-secondary`;
    }

    if (key === selectedAnswer) {
      return `${base} border-primary bg-[rgba(199,123,26,0.15)] shadow-[0_2px_12px_rgba(199,123,26,0.1)] text-text-primary`;
    }

    return `${base} border-glass bg-white text-text-primary hover:translate-x-1 hover:border-primary hover:bg-[rgba(199,123,26,0.08)]`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-heading text-xl leading-relaxed text-text-primary">
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
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-heading text-xs font-bold ${option.key === selectedAnswer && !showFeedback ? "bg-primary-gradient text-white shadow-[0_2px_8px_rgba(199,123,26,0.3)]" : "bg-[rgba(156,135,110,0.1)] text-text-secondary"}`}>
              {OPTION_LABELS[option.key]}
            </span>
            <span>{option.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
