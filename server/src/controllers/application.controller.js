import Application from '../models/Application.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const getApplications = async (req, res) => {
  try {
    const apps = await Application.find({ user: req.user._id }).populate('job').sort({ createdAt: -1 });
    return successResponse(res, { applications: apps });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const createApplication = async (req, res) => {
  try {
    const { jobId, status, notes } = req.body;
    if (!jobId) return errorResponse(res, 'jobId required', 400);
    const existing = await Application.findOne({ user: req.user._id, job: jobId });
    if (existing) return errorResponse(res, 'Already tracking this job', 400);
    const app = await Application.create({ user: req.user._id, job: jobId, status: status || 'saved', notes });
    await app.populate('job');
    return successResponse(res, { application: app }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const updateApplication = async (req, res) => {
  try {
    const app = await Application.findOne({ _id: req.params.id, user: req.user._id });
    if (!app) return errorResponse(res, 'Application not found', 404);
    if (req.body.status) app.status = req.body.status;
    if (req.body.notes !== undefined) app.notes = req.body.notes;
    if (req.body.status === 'applied' && !app.appliedDate) app.appliedDate = new Date();
    await app.save();
    await app.populate('job');
    return successResponse(res, { application: app });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const deleteApplication = async (req, res) => {
  try {
    const app = await Application.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!app) return errorResponse(res, 'Application not found', 404);
    return successResponse(res, { message: 'Removed from tracker' });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
