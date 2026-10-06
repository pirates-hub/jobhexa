import { extractJobFromPdf, summarizePdf } from '../services/ai.service.js';
import Job from '../models/Job.js';

export const uploadAndExtract = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'PDF file required' });
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: req.file.buffer });
    const result = await parser.getText();
    await parser.destroy().catch(() => {});
    const text = (result?.text || '').replace(/\s+/g, ' ').trim();
    if (!text || text.trim().length < 20) {
      return res.status(400).json({ success: false, message: 'Could not extract text from PDF' });
    }
    const [extraction, summary] = await Promise.all([
      extractJobFromPdf(text),
      summarizePdf(text),
    ]);
    const total = result?.total ?? result?.pages?.length ?? undefined;
    res.json({ success: true, data: { text: text.substring(0, 5000), extraction, summary, pages: total } });
  } catch (e) {
    console.error('PDF error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
};

// Publish an AI extraction as a verified job (admin reviewed by clicking).
// Always lands on /jobs immediately — no silent pending.
export const createJobFromExtraction = async (req, res) => {
  try {
    const ex = req.body?.extraction || {};
    if (!ex.title) return res.status(400).json({ success: false, message: 'Extraction needs at least a title' });
    const asDate = (v) => {
      if (!v) return undefined;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? undefined : d;
    };
    const vac = ex.vacancies;
    const totalVacancies = typeof vac === 'number' ? vac
      : vac && typeof vac === 'object'
        ? Object.values(vac).reduce((s, v) => s + (Number(v) || 0), 0) || undefined
        : undefined;
    const job = await Job.create({
      title: String(ex.title).trim(),
      department: ex.department || 'Government Department',
      organization: ex.organization || ex.department || 'Government of India',
      examType: ex.examType || 'central',
      state: ex.state || 'All India',
      description: ex.description || `Published from official notification PDF. Verify at ${ex.officialWebsite || 'the official site'}.`,
      shortDescription: String(ex.title).slice(0, 180),
      totalVacancies,
      postName: ex.postName,
      advertisementNumber: ex.advertisementNumber,
      salary: ex.salary,
      selectionProcess: Array.isArray(ex.selectionProcess) ? ex.selectionProcess : ex.selectionProcess ? [String(ex.selectionProcess)] : [],
      publicationDate: asDate(ex.publicationDate),
      eligibility: {
        qualifications: Array.isArray(ex.qualifications) ? ex.qualifications.map((q) => typeof q === 'string' ? { level: q } : q) : [],
        ageMin: ex.ageLimits?.min ?? ex.ageMin ?? 18,
        ageMax: ex.ageLimits?.max ?? ex.ageMax,
      },
      applicationStartDate: asDate(ex.dates?.applicationStart),
      applicationEndDate: asDate(ex.dates?.applicationEnd),
      examDate: asDate(ex.dates?.examDate),
      applicationFee: ex.fees && typeof ex.fees === 'object' ? ex.fees : undefined,
      officialWebsite: ex.officialWebsite,
      officialNotificationUrl: ex.officialNotificationUrl,
      applyLink: ex.officialWebsite,
      officialApplyUrl: ex.officialWebsite,
      syllabus: ex.syllabus ? { sections: Array.isArray(ex.syllabus) ? ex.syllabus : [] } : undefined,
      howToApply: [
        `Open ${ex.officialWebsite || 'the official site'} and find this notification`,
        'Read the notification PDF fully before applying',
        'Complete registration, fill the form and upload documents',
        'Pay the fee online and submit before the deadline; keep the printout',
      ],
      source: 'admin',
      verificationStatus: 'verified',
      verifiedBy: req.user._id,
      verificationDate: new Date(),
      jobStatus: 'active',
      lastVerifiedDate: new Date(),
    });
    try {
      const Notification = (await import('../models/Notification.js')).default;
      const User = (await import('../models/User.js')).default;
      const users = await User.find({ 'notificationPreferences.newJobs': { $ne: false } }).select('_id').limit(2000);
      if (users.length) {
        await Notification.insertMany(users.map((u) => ({
          user: u._id, type: 'new_job', title: `New job: ${job.title}`,
          message: `${job.organization} — Last date: ${job.applicationEndDate ? new Date(job.applicationEndDate).toLocaleDateString('en-IN') : 'see notification'}.`, jobId: job._id,
        })), { ordered: false });
      }
    } catch (e) { console.error('[Notify] pdf publish failed', e.message); }
    res.status(201).json({ success: true, data: { job } });
  } catch (e) {
    console.error('PDF publish error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
};
