import MockTest from '../models/MockTest.js';
import MockAttempt from '../models/MockAttempt.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

// Shape sent to the client while attempting — answer key is stripped so it
// can never be read from the network tab.
const toPublicTest = (test, questionCountOverride) => ({
  _id: test._id,
  title: test.title,
  slug: test.slug,
  subjectName: test.subjectName,
  topicSlug: test.topicSlug,
  description: test.description,
  durationMinutes: test.durationMinutes,
  difficulty: test.difficulty,
  questionCount: questionCountOverride ?? test.questions.length,
  questions: test.questions.map((q) => ({ text: q.text, options: q.options })),
});

export const getMockTests = async (req, res) => {
  try {
    const tests = await MockTest.find({ isActive: true }).sort({ title: 1 });
    const attempts = await MockAttempt.find({ user: req.user._id }).sort({ createdAt: -1 });

    const byTest = new Map();
    for (const a of attempts) {
      const key = String(a.mockTest);
      if (!byTest.has(key)) byTest.set(key, []);
      byTest.get(key).push(a);
    }

    const list = tests.map((t) => {
      const mine = byTest.get(String(t._id)) || [];
      const bestScore = mine.length ? Math.max(...mine.map((a) => a.score)) : null;
      const lastAttempt = mine[0] || null;
      return {
        _id: t._id,
        title: t.title,
        slug: t.slug,
        subjectName: t.subjectName,
        topicSlug: t.topicSlug,
        description: t.description,
        durationMinutes: t.durationMinutes,
        difficulty: t.difficulty,
        questionCount: t.questions.length,
        attemptCount: mine.length,
        bestScore,
        lastScore: lastAttempt ? lastAttempt.score : null,
        lastAttemptAt: lastAttempt ? lastAttempt.submittedAt : null,
      };
    });

    return successResponse(res, { tests: list });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getMockTestBySlug = async (req, res) => {
  try {
    const test = await MockTest.findOne({ slug: req.params.slug, isActive: true });
    if (!test) return errorResponse(res, 'Mock test not found', 404);

    const attempts = await MockAttempt.find({ user: req.user._id, mockTest: test._id })
      .sort({ createdAt: -1 })
      .select('score total timeTakenSeconds submittedAt');

    return successResponse(res, {
      test: toPublicTest(test),
      attempts,
      bestScore: attempts.length ? Math.max(...attempts.map((a) => a.score)) : null,
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const submitMockTest = async (req, res) => {
  try {
    const { answers = [], timeTakenSeconds = 0 } = req.body || {};
    const test = await MockTest.findOne({ slug: req.params.slug, isActive: true });
    if (!test) return errorResponse(res, 'Mock test not found', 404);

    const total = test.questions.length;
    if (!total) return errorResponse(res, 'This mock test has no questions', 400);
    if (!Array.isArray(answers)) return errorResponse(res, 'answers must be an array', 400);

    const byIndex = new Map();
    for (const a of answers) {
      const i = Number(a?.questionIndex);
      if (Number.isInteger(i) && i >= 0 && i < total) {
        const sel = a?.selectedIndex;
        byIndex.set(i, Number.isInteger(Number(sel)) ? Number(sel) : null);
      }
    }

    let score = 0;
    const normalized = [];
    const review = [];
    test.questions.forEach((q, i) => {
      const selectedIndex = byIndex.has(i) ? byIndex.get(i) : null;
      const isCorrect = selectedIndex === q.correctIndex;
      if (isCorrect) score += 1;
      normalized.push({ questionIndex: i, selectedIndex });
      review.push({
        questionIndex: i,
        text: q.text,
        options: q.options,
        selectedIndex,
        correctIndex: q.correctIndex,
        isCorrect,
        explanation: q.explanation || '',
      });
    });

    const attempt = await MockAttempt.create({
      user: req.user._id,
      mockTest: test._id,
      score,
      total,
      answers: normalized,
      timeTakenSeconds: Number(timeTakenSeconds) || 0,
    });

    return successResponse(res, {
      attemptId: attempt._id,
      score,
      total,
      percentage: Math.round((score / total) * 100),
      review,
    }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
