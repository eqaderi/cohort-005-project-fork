import { db } from "~/db";
import {
  quizzes,
  quizQuestions,
  quizOptions,
  quizAttempts,
  quizAnswers,
} from "~/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

export function getQuizByLessonId(lessonId: number) {
  return db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).get();
}

export function getQuizById(quizId: number) {
  return db.select().from(quizzes).where(eq(quizzes.id, quizId)).get();
}

function getQuestions(quizId: number) {
  return db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(quizQuestions.position)
    .all();
}

function getOptionsForQuestions(questionIds: number[]) {
  if (questionIds.length === 0) return [];
  return db
    .select()
    .from(quizOptions)
    .where(inArray(quizOptions.questionId, questionIds))
    .all();
}

export function getQuizWithQuestions(quizId: number) {
  const quiz = getQuizById(quizId);
  if (!quiz) return null;

  const questions = getQuestions(quizId);
  const options = getOptionsForQuestions(questions.map((q) => q.id));

  const questionsWithOptions = questions.map((question) => ({
    ...question,
    options: options.filter((o) => o.questionId === question.id),
  }));

  return { ...quiz, questions: questionsWithOptions };
}

export function getBestAttempt(userId: number, quizId: number) {
  return db
    .select()
    .from(quizAttempts)
    .where(
      and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quizId))
    )
    .orderBy(desc(quizAttempts.score))
    .limit(1)
    .get();
}

export function calculateGrade(score: number): string {
  if (score >= 0.9) return "A";
  if (score >= 0.8) return "B";
  if (score >= 0.7) return "C";
  if (score >= 0.6) return "D";
  return "F";
}

export type QuestionResult = {
  questionId: number;
  correct: boolean;
  selectedOptionId: number | null;
  correctOptionId: number | null;
};

function scoreAnswers(
  questions: Array<{ id: number }>,
  correctOptionByQuestion: Map<number, number>,
  selectedAnswers: Record<number, number>
): QuestionResult[] {
  return questions.map((q) => {
    const selected = selectedAnswers[q.id];
    if (!selected) {
      return {
        questionId: q.id,
        correct: false,
        selectedOptionId: null,
        correctOptionId: null,
      };
    }
    const correctOptionId = correctOptionByQuestion.get(q.id) ?? null;
    return {
      questionId: q.id,
      correct: selected === correctOptionId,
      selectedOptionId: selected,
      correctOptionId,
    };
  });
}

// The attempt and its answers land together, or an attempt is left with no
// record of what was chosen.
function saveAttempt(
  attemptValues: typeof quizAttempts.$inferInsert,
  questionResults: QuestionResult[]
) {
  return db.transaction((tx) => {
    const attempt = tx
      .insert(quizAttempts)
      .values(attemptValues)
      .returning()
      .get();

    const answers = questionResults.flatMap((result) =>
      result.selectedOptionId === null
        ? []
        : [
            {
              attemptId: attempt.id,
              questionId: result.questionId,
              selectedOptionId: result.selectedOptionId,
            },
          ]
    );
    if (answers.length > 0) tx.insert(quizAnswers).values(answers).run();

    return attempt;
  });
}

export function computeResult(
  userId: number,
  quizId: number,
  selectedAnswers: Record<number, number>
) {
  try {
    const quiz = getQuizById(quizId);
    if (!quiz) {
      console.error("quiz not found");
      return null;
    }

    const questions = getQuestions(quizId);
    const correctOptionByQuestion = new Map<number, number>();
    for (const option of getOptionsForQuestions(questions.map((q) => q.id))) {
      if (option.isCorrect && !correctOptionByQuestion.has(option.questionId)) {
        correctOptionByQuestion.set(option.questionId, option.id);
      }
    }

    const questionResults = scoreAnswers(
      questions,
      correctOptionByQuestion,
      selectedAnswers
    );
    const correct = questionResults.filter((r) => r.correct).length;
    const total = questions.length;
    const scoreValue = total > 0 ? correct / total : 0;
    const passed = scoreValue > 0.7;
    const attempt = saveAttempt(
      { userId, quizId, score: scoreValue, passed },
      questionResults
    );

    return {
      attemptId: attempt.id,
      score: scoreValue,
      passed,
      grade: calculateGrade(scoreValue),
      totalCorrect: correct,
      totalQuestions: total,
      questionResults,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}
