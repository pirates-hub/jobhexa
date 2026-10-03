import ExamType from '../models/ExamType.js';
import Subject from '../models/Subject.js';
import Topic from '../models/Topic.js';
import ExamTopic from '../models/ExamTopic.js';
import VideoLink from '../models/VideoLink.js';
import SavedResource from '../models/SavedResource.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const getExams = async (req, res) => {
  try {
    const exams = await ExamType.find({ isActive: true }).sort({ name: 1 });
    return successResponse(res, { exams });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getExamBySlug = async (req, res) => {
  try {
    const exam = await ExamType.findOne({ slug: req.params.slug });
    if (!exam) return errorResponse(res, 'Exam not found', 404);
    return successResponse(res, { exam });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ name: 1 });
    return successResponse(res, { subjects });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getSubjectBySlug = async (req, res) => {
  try {
    const subject = await Subject.findOne({ slug: req.params.slug });
    if (!subject) return errorResponse(res, 'Subject not found', 404);
    const topics = await Topic.find({ subject: subject._id }).sort({ name: 1 });
    return successResponse(res, { subject, topics });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getTopicBySlug = async (req, res) => {
  try {
    const topic = await Topic.findOne({ slug: req.params.slug }).populate('subject');
    if (!topic) return errorResponse(res, 'Topic not found', 404);
    const videos = await VideoLink.find({ topic: topic._id }).sort({ isVerified: -1 });
    return successResponse(res, { topic, videos });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getMissingTopics = async (req, res) => {
  try {
    // Personalized: topics in the user's preferred exams minus topics they saved a video for
    const prefs = req.user?.preferredExamTypes || [];
    let pool;
    if (prefs.length) {
      const exams = await ExamType.find({ $or: [{ slug: { $in: prefs } }, { name: { $in: prefs } }] }).select('_id');
      const mappings = await ExamTopic.find({ examType: { $in: exams.map((e) => e._id) } }).populate('topics.topic', 'name slug subject');
      const seen = new Map();
      for (const m of mappings) for (const t of m.topics || []) {
        if (t.topic?._id && !seen.has(String(t.topic._id))) seen.set(String(t.topic._id), t.topic);
      }
      pool = [...seen.values()];
    }
    if (!pool || !pool.length) {
      pool = await Topic.find().populate('subject', 'name slug').limit(20);
      return successResponse(res, { missingTopics: pool, personalized: false, message: 'Set preferred exams in your profile for personalized missing topics' });
    }
    const saved = await SavedResource.find({ user: req.user._id }).populate({ path: 'video', select: 'topic' });
    const doneTopics = new Set(saved.map((s) => String(s.video?.topic)).filter(Boolean));
    const missing = pool.filter((t) => !doneTopics.has(String(t._id || t)));
    return successResponse(res, { missingTopics: missing.slice(0, 20), personalized: true, completedCount: doneTopics.size });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getSyllabusMatch = async (req, res) => {
  try {
    const { examSlug } = req.params;
    const exam = await ExamType.findOne({ slug: examSlug });
    if (!exam) return errorResponse(res, 'Exam not found', 404);
    const mappings = await ExamTopic.find({ examType: exam._id })
      .populate('subject')
      .populate('topics.topic');
    // Fallback to all subjects/topics if mapping not seeded yet
    if (!mappings || mappings.length === 0) {
      const subjects = await Subject.find();
      const topics = await Topic.find().populate('subject');
      let completedTopics = [];
      let coverage = 0;
      try {
        if (req.user?._id) {
          const topicIds = topics.map((t) => t._id);
          const videos = await VideoLink.find({ topic: { $in: topicIds } }).select('_id topic');
          const vidToTopic = new Map(videos.map((v) => [String(v._id), String(v.topic)]));
          const saved = await SavedResource.find({ user: req.user._id }).select('video');
          const done = new Set();
          for (const s of saved) {
            const tid = vidToTopic.get(String(s.video));
            if (tid) done.add(tid);
          }
          completedTopics = [...done];
          coverage = topics.length ? Math.round((done.size / topics.length) * 100) : 0;
        }
      } catch {}
      return successResponse(res, {
        exam,
        subjects,
        topics,
        coverage,
        completedTopics,
        totalTopics: topics.length,
      });
    }
    const subjects = mappings.map((m) => m.subject);
    const topics = mappings.flatMap((m) =>
      (m.topics || []).map((t) => ({
        ...(t.topic?.toObject ? t.topic.toObject() : t.topic),
        weightage: t.weightage,
        isOptional: t.isOptional,
        subjectSlug: m.subject?.slug,
        totalMarks: m.totalMarks,
        totalQuestions: m.totalQuestions,
      }))
    );
    const totalMarks = mappings.reduce((s, m) => s + (m.totalMarks || 0), 0);
    const totalQuestions = mappings.reduce((s, m) => s + (m.totalQuestions || 0), 0);
    // Real coverage: topics with at least one video saved by this user
    let completedTopics = [];
    let coverage = 0;
    try {
      if (req.user?._id) {
        const topicIds = topics.map((t) => t._id).filter(Boolean);
        const videos = await VideoLink.find({ topic: { $in: topicIds } }).select('_id topic');
        const vidToTopic = new Map(videos.map((v) => [String(v._id), String(v.topic)]));
        const saved = await SavedResource.find({ user: req.user._id }).select('video');
        const done = new Set();
        for (const s of saved) {
          const tid = vidToTopic.get(String(s.video));
          if (tid) done.add(tid);
        }
        completedTopics = [...done];
        coverage = topics.length ? Math.round((done.size / topics.length) * 100) : 0;
      }
    } catch {}
    return successResponse(res, {
      exam,
      subjects,
      topics,
      mappings,
      coverage,
      completedTopics,
      totalTopics: topics.length,
      totalMarks,
      totalQuestions,
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getSavedResources = async (req, res) => {
  try {
    const saved = await SavedResource.find({ user: req.user._id }).select('video');
    return successResponse(res, { saved: saved.map((s) => s.video) });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const saveResource = async (req, res) => {
  try {
    const video = await VideoLink.findById(req.params.id).select('_id');
    if (!video) return errorResponse(res, 'Video not found', 404);
    await SavedResource.updateOne(
      { user: req.user._id, video: video._id },
      { $setOnInsert: { user: req.user._id, video: video._id } },
      { upsert: true }
    );
    return successResponse(res, { message: 'Saved' });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const removeSavedResource = async (req, res) => {
  try {
    await SavedResource.deleteOne({ user: req.user._id, video: req.params.id });
    return successResponse(res, { message: 'Removed' });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Per-subject saved-video progress for real (non-decorative) rings
export const getProgressBySubject = async (req, res) => {
  try {
    const videos = await VideoLink.find().populate({ path: 'topic', select: 'subject name' });
    const saved = await SavedResource.find({ user: req.user._id }).select('video');
    const savedIds = new Set(saved.map((s) => String(s.video)));
    const bySubject = {};
    for (const v of videos) {
      const sid = String(v.topic?.subject);
      if (!sid || sid === 'undefined') continue;
      bySubject[sid] = bySubject[sid] || { subject: sid, totalVideos: 0, savedVideos: 0 };
      bySubject[sid].totalVideos += 1;
      if (savedIds.has(String(v._id))) bySubject[sid].savedVideos += 1;
    }
    return successResponse(res, { progress: Object.values(bySubject) });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
