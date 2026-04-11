import { Button } from "@/components/ui/button";

interface QuizNavProps {
  mode: "study" | "exam";
  hasAnswered: boolean;
  showingFeedback: boolean;
  isLastQuestion: boolean;
  onNext: () => void;
  onQuit: () => void;
  onSubmitExam: () => void;
}

export function QuizNav({
  mode,
  hasAnswered,
  showingFeedback,
  isLastQuestion,
  onNext,
  onQuit,
  onSubmitExam,
}: QuizNavProps) {
  if (mode === "study") {
    return (
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onQuit}>
          Quit
        </Button>
        {showingFeedback && (
          <Button onClick={onNext}>
            {isLastQuestion ? "Finish" : "Next Question"}
          </Button>
        )}
      </div>
    );
  }

  // Exam mode
  return (
    <div className="flex items-center justify-between">
      <Button variant="ghost" onClick={onQuit}>
        Quit Exam
      </Button>
      {isLastQuestion && hasAnswered ? (
        <Button onClick={onSubmitExam}>Submit Exam</Button>
      ) : (
        <Button onClick={onNext} disabled={!hasAnswered}>
          Next Question
        </Button>
      )}
    </div>
  );
}
