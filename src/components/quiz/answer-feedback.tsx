interface AnswerFeedbackProps {
  isCorrect: boolean;
}

export function AnswerFeedback({ isCorrect }: AnswerFeedbackProps) {
  return (
    <div
      className={`rounded-xl border-2 px-4 py-3 text-sm font-medium ${
        isCorrect
          ? "border-success/30 bg-success/10 text-success"
          : "border-danger/30 bg-danger/10 text-danger"
      }`}
    >
      {isCorrect ? "Correct! Well done." : "Incorrect. Review this topic."}
    </div>
  );
}
