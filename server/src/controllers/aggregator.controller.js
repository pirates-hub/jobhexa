import Job from '../models/Job.js';
import AdminAuditLog from '../models/AdminAuditLog.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { extractJobs, mapAggregatorJob, buildUpdate } from '../services/aggregatorImport.service.js';

const MAX_IMPORT = 2000;

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const importAggregatorJobs = async (req, res) => {
  try {
    const items = extractJobs(req.body);
    if (!items) {
      return errorResponse(res, 'Send a jobs array or { jobs: [...] }', 400);
    }
    if (items.length > MAX_IMPORT) {
      return errorResponse(res, `Too many jobs in one import (max ${MAX_IMPORT})`, 413);
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const item of items) {
      const mapped = mapAggregatorJob(item);
      if (!mapped.ok) {
        skipped += 1;
        errors.push({ title: item?.title || null, error: mapped.error });
        continue;
      }
      try {
        const existing = await Job.findOne({ 'aggregatorMeta.id': mapped.id }).select('_id');
        if (existing) {
          const { filter, update } = buildUpdate(mapped.id, mapped.doc);
          await Job.updateOne(filter, update);
          updated += 1;
        } else {
          await Job.create(mapped.doc);
          created += 1;
        }
      } catch (err) {
        skipped += 1;
        errors.push({ title: mapped.doc.title, error: err.message });
      }
    }

    await AdminAuditLog.create({
      admin: req.user._id,
      action: 'import_aggregator_jobs',
      targetType: 'Job',
      targetId: null,
      details: { received: items.length, created, updated, skipped },
      ipAddress: req.ip,
    });

    return successResponse(res, {
      received: items.length,
      created,
      updated,
      skipped,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getAggregatorJobs = async (req, res) => {
  try {
    const { category, q } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);

    const filter = { source: 'aggregator' };
    if (category && category !== 'all') filter['aggregatorMeta.category'] = category;
    if (q) {
      const needle = new RegExp(escapeRegex(String(q).trim()), 'i');
      filter.$or = [{ title: needle }, { organization: needle }, { 'aggregatorMeta.sourceId': needle }];
    }

    const [jobs, total, groups, latest] = await Promise.all([
      Job.find(filter)
        .sort({ 'aggregatorMeta.fetchedAt': -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-__v'),
      Job.countDocuments(filter),
      Job.aggregate([
        { $match: { source: 'aggregator' } },
        { $group: { _id: '$aggregatorMeta.category', count: { $sum: 1 } } },
      ]),
      Job.findOne({ source: 'aggregator' }).sort({ 'aggregatorMeta.fetchedAt': -1 }).select('aggregatorMeta.fetchedAt'),
    ]);

    const counts = { new: 0, active: 0, closing_soon: 0, expired: 0, unknown: 0 };
    for (const g of groups) {
      const key = g._id || 'unknown';
      counts[key] = (counts[key] || 0) + g.count;
    }

    return successResponse(res, {
      jobs,
      total,
      page,
      limit,
      counts,
      totalImported: Object.values(counts).reduce((n, v) => n + v, 0),
      lastFetchedAt: latest?.aggregatorMeta?.fetchedAt || null,
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const deleteAggregatorJob = async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, source: 'aggregator' });
    if (!job) return errorResponse(res, 'Aggregator job not found', 404);
    await AdminAuditLog.create({
      admin: req.user._id,
      action: 'delete_aggregator_job',
      targetType: 'Job',
      targetId: job._id,
      details: { title: job.title },
      ipAddress: req.ip,
    });
    return successResponse(res, { message: 'Deleted', id: job._id });
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};
