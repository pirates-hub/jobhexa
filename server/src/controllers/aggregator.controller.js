import crypto from 'node:crypto';
import Job from '../models/Job.js';
import AdminAuditLog from '../models/AdminAuditLog.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { extractJobs, importJobItems, MAX_IMPORT } from '../services/aggregatorImport.service.js';

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

    const result = await importJobItems(items);

    await AdminAuditLog.create({
      admin: req.user._id,
      action: 'import_aggregator_jobs',
      targetType: 'Job',
      targetId: null,
      details: { received: result.received, created: result.created, updated: result.updated, skipped: result.skipped },
      ipAddress: req.ip,
    });

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Machine-to-machine import used by the aggregator's auto-sync (cron / GitHub
// Actions). It has no admin session, so it authenticates with the shared
// AGG_SYNC_SECRET header instead of the protect/adminOnly middleware, and
// therefore must stay registered on a router without those middlewares.
export const syncAggregatorJobs = async (req, res) => {
  try {
    const expected = process.env.AGG_SYNC_SECRET;
    if (!expected) {
      return errorResponse(res, 'Aggregator sync is disabled (AGG_SYNC_SECRET not set)', 503);
    }
    const given = Buffer.from(String(req.get('x-aggregator-sync-secret') || ''));
    const want = Buffer.from(expected);
    if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) {
      return errorResponse(res, 'Invalid sync secret', 401);
    }

    const items = extractJobs(req.body);
    if (!items) {
      return errorResponse(res, 'Send a jobs array or { jobs: [...] }', 400);
    }
    if (items.length > MAX_IMPORT) {
      return errorResponse(res, `Too many jobs in one import (max ${MAX_IMPORT})`, 413);
    }

    const result = await importJobItems(items);
    return successResponse(res, { ...result, sync: true });
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
