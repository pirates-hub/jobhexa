import SavedJob from '../models/SavedJob.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const getSavedJobs = async (req, res) => {
  try {
    const savedJobs = await SavedJob.find({ user: req.user._id })
      .populate('job')
      .sort({ createdAt: -1 });
    return successResponse(res, { savedJobs });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const saveJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const existing = await SavedJob.findOne({ user: req.user._id, job: jobId });
    if (existing) {
      return errorResponse(res, 'Job already saved', 400);
    }
    const savedJob = await SavedJob.create({ user: req.user._id, job: jobId });
    return successResponse(res, { savedJob }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const removeSavedJob = async (req, res) => {
  try {
    await SavedJob.findOneAndDelete({ user: req.user._id, job: req.params.jobId });
    return successResponse(res, { message: 'Job removed from saved list' });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
