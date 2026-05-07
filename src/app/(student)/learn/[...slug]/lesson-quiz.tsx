"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MarkdownBody } from "@/components/markdown/markdown-body";
import { useToastStore } from "@/stores/toast-store";

import { submitQuizAttempt } from "@/app/learn/actions";

interface QuizOption {
  text: string;
}

interface QuizQuestion {
  prompt: string;
  options: QuizOption[];
}

interface QuizResult {
  correctCount: number;
  totalCount: number;
  passed: boolean;
  explanations: string[];
  correctIndices: number[];
}

interface LessonQuizProps {
  lessonSlug: string;
  questions: QuizQuestion[];
}

export function LessonQuiz({
  lessonSlug,
  questions,
}: LessonQuizProps): React.JSX.Element {
  const optionRefs = useRef<Map<number, (HTMLButtonElement | null)[]>>(
    new Map()
  );
  const addToast = useToastStore((s) => s.addToast);
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    Array(questions.length).fill(null)
  );
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const allAnswered = answers.every((a) => a !== null);

  function setOptionRef(
    questionIndex: number,
    optionIndex: number,
    optionsLength: number,
    el: HTMLButtonElement | null
  ): void {
    let row = optionRefs.current.get(questionIndex);
    if (!row) {
      row = new Array<HTMLButtonElement | null>(optionsLength).fill(null);
      optionRefs.current.set(questionIndex, row);
    }
    row[optionIndex] = el;
  }

  function focusAndSelect(questionIndex: number, optionIndex: number): void {
    setAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = optionIndex;
      return next;
    });
    const row = optionRefs.current.get(questionIndex);
    const target = row ? row[optionIndex] : null;
    if (target) target.focus();
  }

  function handleSelect(questionIndex: number, optionIndex: number): void {
    if (submitted) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = optionIndex;
      return next;
    });
  }

  function handleOptionKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    questionIndex: number,
    optionIndex: number,
    optionsLength: number
  ): void {
    if (submitted) return;

    let nextIndex: number | null = null;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      nextIndex = (optionIndex + 1) % optionsLength;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      nextIndex = (optionIndex - 1 + optionsLength) % optionsLength;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = optionsLength - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    focusAndSelect(questionIndex, nextIndex);
  }

  async function handleSubmit(): Promise<void> {
    if (!allAnswered) return;

    const numericAnswers: number[] = answers.map((a) => {
      if (a === null) {
        throw new Error("Unexpected null answer after allAnswered guard");
      }
      return a;
    });

    setSubmitting(true);
    const response = await submitQuizAttempt({
      lessonSlug,
      answers: numericAnswers,
    });
    setSubmitting(false);

    if (response.error) {
      addToast({ type: "error", message: response.error });
      return;
    }

    setResult({
      correctCount: response.correctCount,
      totalCount: response.totalCount,
      passed: response.passed,
      explanations: response.explanations,
      correctIndices: response.correctIndices,
    });
    setSubmitted(true);
    addToast({ type: "success", message: "Quiz submitted" });
  }

  function handleReset(): void {
    setAnswers(Array(questions.length).fill(null));
    setSubmitted(false);
    setResult(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {submitted && result ? (
        <Card aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3
                className={`font-heading text-xl font-bold ${
                  result.passed ? "text-success" : "text-secondary"
                }`}
              >
                {result.correctCount} / {result.totalCount} correct
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                {result.passed
                  ? "Nice work — you got them all!"
                  : "Almost — review the notes below and give it another go."}
              </p>
            </div>
            <Button variant="secondary" onClick={handleReset}>
              Try again
            </Button>
          </div>
        </Card>
      ) : null}

      {questions.map((question, questionIndex) => {
        const selected = answers[questionIndex];
        const explanation =
          submitted && result ? result.explanations[questionIndex] : undefined;
        const correctIndex =
          submitted && result ? result.correctIndices[questionIndex] : undefined;
        const promptId = `question-${questionIndex}-prompt`;

        return (
          <Card key={questionIndex}>
            <h3
              id={promptId}
              className="font-heading text-lg text-text-primary mb-3"
            >
              {questionIndex + 1}. {question.prompt}
            </h3>
            <div
              role="radiogroup"
              aria-labelledby={promptId}
              className="flex flex-col gap-2"
            >
              {question.options.map((option, optionIndex) => {
                const isSelected = selected === optionIndex;
                const isCorrectAnswer =
                  submitted && correctIndex === optionIndex;
                const isUserCorrect =
                  submitted && isSelected && isCorrectAnswer;
                const isUserWrong =
                  submitted && isSelected && !isCorrectAnswer;
                const isUnpickedCorrect =
                  submitted && !isSelected && isCorrectAnswer;

                let stateClasses: string;
                if (isUserCorrect) {
                  stateClasses =
                    "border-success bg-[rgba(90,142,76,0.08)] text-text-primary";
                } else if (isUserWrong) {
                  stateClasses =
                    "border-danger bg-[rgba(191,74,45,0.08)] text-text-primary";
                } else if (isUnpickedCorrect) {
                  stateClasses =
                    "border-success bg-[rgba(90,142,76,0.08)] text-text-primary";
                } else if (isSelected) {
                  stateClasses = "border-accent bg-accent/10 text-accent";
                } else {
                  stateClasses =
                    "border-surface text-text-secondary hover:border-accent/30";
                }

                const isTabStop =
                  isSelected || (selected === null && optionIndex === 0);

                return (
                  <button
                    key={optionIndex}
                    ref={(el) =>
                      setOptionRef(
                        questionIndex,
                        optionIndex,
                        question.options.length,
                        el
                      )
                    }
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={isTabStop ? 0 : -1}
                    onClick={() => handleSelect(questionIndex, optionIndex)}
                    onKeyDown={(event) =>
                      handleOptionKeyDown(
                        event,
                        questionIndex,
                        optionIndex,
                        question.options.length
                      )
                    }
                    disabled={submitted}
                    className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ${stateClasses} ${
                      submitted ? "cursor-not-allowed" : ""
                    }`}
                  >
                    {option.text}
                  </button>
                );
              })}
            </div>

            {submitted && explanation ? (
              <div className="mt-4 border-l-4 border-accent/40 bg-[rgba(199,123,26,0.06)] pl-4 pr-4 py-2 text-text-secondary">
                <MarkdownBody className="text-sm">{explanation}</MarkdownBody>
              </div>
            ) : null}
          </Card>
        );
      })}

      {!submitted ? (
        <Button
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          size="lg"
        >
          {submitting ? "Submitting..." : "Submit Quiz"}
        </Button>
      ) : null}
    </div>
  );
}
