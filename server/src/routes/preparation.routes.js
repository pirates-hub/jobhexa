import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { getExams, getExamBySlug, getSubjects, getSubjectBySlug, getTopicBySlug, getMissingTopics, getSyllabusMatch, getSavedResources, saveResource, removeSavedResource, getProgressBySubject } from '../controllers/preparation.controller.js';

const router = Router();
// Preparation visible to logged-in users only
router.use(protect);
router.get('/exams', getExams);
router.get('/exams/:slug', getExamBySlug);
router.get('/subjects', getSubjects);
router.get('/subjects/:slug', getSubjectBySlug);
router.get('/topics/:slug', getTopicBySlug);
router.get('/missing-topics', getMissingTopics);
router.get('/syllabus-match/:examSlug', getSyllabusMatch);
router.get('/progress/by-subject', getProgressBySubject);
router.get('/saved-resources', getSavedResources);
router.post('/saved-resources/:id', saveResource);
router.delete('/saved-resources/:id', removeSavedResource);

export default router;
