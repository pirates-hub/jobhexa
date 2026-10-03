import Job from '../models/Job.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { checkEligibility } from '../services/eligibility.service.js';

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
        .select('-__v'),
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
    const job = await Job.findOne({ slug: req.params.slug, verificationStatus: 'verified' }).select('-__v');
    if (!job) {
      return errorResponse(res, 'Job not found', 404);
    }

    job.views += 1;
    await job.save();

    return successResponse(res, { job });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getJobsByExamType = async (req, res) => {
  try {
    const jobs = await Job.find({
      examType: req.params.examType,
      jobStatus: 'active',
      verificationStatus: 'verified',
    }).sort({ createdAt: -1 });

    return successResponse(res, { jobs });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getJobsByState = async (req, res) => {
  try {
    const jobs = await Job.find({
      $or: [
        { state: req.params.state },
        { state: 'All India' },
      ],
      jobStatus: 'active',
      verificationStatus: 'verified',
    }).sort({ createdAt: -1 });

    return successResponse(res, { jobs });
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
    }).sort({ applicationEndDate: 1 }).limit(10);

    return successResponse(res, { jobs });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const checkJobEligibility = async (req, res) => {
  try {
    const job = await Job.findOne({ slug: req.params.slug });
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
    const jobs = await Job.find(filter).limit(Math.min(parseInt(limit) || 20, 50));
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
