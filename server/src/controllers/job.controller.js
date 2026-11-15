import Job from '../models/Job.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { checkEligibility } from '../services/eligibility.service.js';
import { cached } from '../utils/cache.js';

// Public list endpoints render JobCard only — these fields are never shown on
// a list (they live on the detail page), so lists never ship them.
const LIST_EXCLUDE = '-description -syllabus -howToApply -categoryWiseVacancies -postingLocations -tags -verificationNotes -__v';

const toPositiveInt = (v, def, max) => Math.min(Math.max(parseInt(v) || def, 1), max);

export const getJobs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      examType,
      state,
      category,
      jobStatus,
      qualification,
      department,
      organization,
      level,
      fresh,
      sortBy = 'newest',
    } = req.query;

    const filter = { verificationStatus: 'verified' };

    if (jobStatus) {
      filter.jobStatus = jobStatus;
    } else {
      filter.jobStatus = { $in: ['active', 'upcoming', 'closing_soon'] };
    }
    if (examType) filter.examType = examType;
    if (state) filter.state = state;
    if (category) filter.category = category;
    // level=central|state is independent of reservation category and
    // never overwrites an explicit state filter:
    // central => All-India postings, state => state-specific postings
    if (!state) {
      if (level === 'central') filter.state = 'All India';
      else if (level === 'state') filter.state = { $ne: 'All India' };
    }
    if (department) filter.department = new RegExp(String(department).trim(), 'i');
    if (organization) filter.organization = new RegExp(String(organization).trim(), 'i');
    if (qualification) filter['eligibility.qualifications.level'] = String(qualification).trim();
    // fresh=N — added/verified in last N days (weekly=7, monthly=30)
    if (fresh) {
      const cutoff = new Date(Date.now() - Math.min(parseInt(fresh) || 7, 90) * 86400000);
      filter.$or = [{ verificationDate: { $gte: cutoff } }, { createdAt: { $gte: cutoff } }];
    }
    if (search) {
      filter.$text = { $search: search };
    }

    let sort = { createdAt: -1 };
    if (sortBy === 'deadline') sort = { applicationEndDate: 1 };
    if (sortBy === 'vacancies') sort = { totalVacancies: -1 };

    // Bounded pagination: page >= 1, 1 <= limit <= 100
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .select(LIST_EXCLUDE)
        .lean(),
      Job.countDocuments(filter),
    ]);
    // Total vacancy posts for current filter ($text search can't aggregate — fallback 0)
    let totalPosts = 0;
    try {
      const postsAgg = await Job.aggregate([{ $match: filter }, { $group: { _id: null, posts: { $sum: '$totalVacancies' } } }]);
      totalPosts = postsAgg[0]?.posts || 0;
    } catch {}

    return successResponse(res, {
      jobs,
      totalPosts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getJobBySlug = async (req, res) => {
  try {
    // One round trip: bump the view counter and return the doc atomically
    // (the old read-then-save cost two queries per page view).
    const job = await Job.findOneAndUpdate(
      { slug: req.params.slug, verificationStatus: 'verified' },
      { $inc: { views: 1 } },
      { new: true },
    ).select('-__v').lean();

    if (!job) {
      return errorResponse(res, 'Job not found', 404);
    }

    return successResponse(res, { job });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getJobsByExamType = async (req, res) => {
  try {
    const page = toPositiveInt(req.query.page, 1, 100000);
    const limit = toPositiveInt(req.query.limit, 50, 100);
    const filter = {
      examType: req.params.examType,
      jobStatus: 'active',
      verificationStatus: 'verified',
    };
    const jobs = await cached(`jobs:exam:${req.params.examType}:${page}:${limit}`, async () => {
      const [rows, total] = await Promise.all([
        Job.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .select(LIST_EXCLUDE)
          .lean(),
        Job.countDocuments(filter),
      ]);
      return { jobs: rows, total };
    });

    return successResponse(res, {
      ...jobs,
      pagination: { page, limit, total: jobs.total, pages: Math.ceil(jobs.total / limit) },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getJobsByState = async (req, res) => {
  try {
    const page = toPositiveInt(req.query.page, 1, 100000);
    const limit = toPositiveInt(req.query.limit, 50, 100);
    const filter = {
      $or: [
        { state: req.params.state },
        { state: 'All India' },
      ],
      jobStatus: 'active',
      verificationStatus: 'verified',
    };
    // State pages are the hottest listing (one per state) — cached with a
    // 6 min TTL and flushed after every pipeline/admin write.
    const jobs = await cached(`jobs:state:${req.params.state}:${page}:${limit}`, async () => {
      const [rows, total] = await Promise.all([
        Job.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .select(LIST_EXCLUDE)
          .lean(),
        Job.countDocuments(filter),
      ]);
      return { jobs: rows, total };
    });

    return successResponse(res, {
      ...jobs,
      pagination: { page, limit, total: jobs.total, pages: Math.ceil(jobs.total / limit) },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getUpcomingDeadlines = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const jobs = await Job.find({
      jobStatus: { $in: ['active', 'upcoming'] },
      verificationStatus: 'verified',
      applicationEndDate: { $gte: now, $lte: thirtyDaysFromNow },
    }).sort({ applicationEndDate: 1 }).limit(10).select(LIST_EXCLUDE).lean();

    return successResponse(res, { jobs });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const checkJobEligibility = async (req, res) => {
  try {
    const job = await Job.findOne({ slug: req.params.slug }).lean();
    if (!job) return errorResponse(res, 'Job not found', 404);
    if (!req.user) {
      return successResponse(res, { eligible: null, message: 'Login to check eligibility', jobId: job._id });
    }
    const result = checkEligibility(req.user, job);
    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getRecommendedJobs = async (req, res) => {
  try {
    if (!req.user) return errorResponse(res, 'Login required', 401);
    const { state, level, limit = 20 } = req.query;
    const filter = { jobStatus: { $in: ['active', 'upcoming', 'closing_soon'] }, verificationStatus: 'verified' };
    // State page: own state + All India central jobs are both eligible pools
    if (state) filter.$or = [{ state }, { state: 'All India' }];
    // Central page: All India jobs only
    if (level === 'central') filter.state = 'All India';
    const jobs = await Job.find(filter)
      .select(LIST_EXCLUDE)
      .lean()
      .limit(Math.min(parseInt(limit) || 20, 50));
    const scored = jobs.map(job => {
      try {
        const result = checkEligibility(req.user, job);
        return { job, score: result.score, eligible: result.eligible };
      } catch { return { job, score: 0, eligible: false }; }
    });
    scored.sort((a,b) => b.score - a.score);
    return successResponse(res, { jobs: scored.slice(0, 10) });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
