import { sendEmail } from '../config/nodemailer.js';

export const sendWelcomeEmail = async (user) => {
  return sendEmail({
    to: user.email,
    subject: 'Welcome to JobHexa!',
    html: `<h2>Welcome ${user.name}!</h2><p>Your JobHexa account has been created. Complete your profile to get personalized job recommendations.</p>`,
    text: `Welcome ${user.name}! Complete your profile on JobHexa to get personalized recommendations.`,
  });
};

export const sendDeadlineReminder = async (user, job, daysLeft) => {
  const subject = daysLeft === 0 ? `Last day to apply: ${job.title}` : `${daysLeft} days left: ${job.title}`;
  return sendEmail({
    to: user.email,
    subject,
    html: `<h2>Deadline Reminder</h2><p>Hi ${user.name},</p><p>Only <strong>${daysLeft === 0 ? 'today' : `${daysLeft} days`}</strong> left to apply for <strong>${job.title}</strong> at ${job.department}.</p><p>Deadline: ${new Date(job.applicationEndDate).toLocaleDateString('en-IN')}</p><p><a href="${job.applyLink || job.officialWebsite}">Apply Now</a></p>`,
    text: `Hi ${user.name}, ${daysLeft} days left for ${job.title}. Deadline: ${job.applicationEndDate}`,
  });
};

export const sendNewJobNotification = async (user, job) => {
  return sendEmail({
    to: user.email,
    subject: `New job matching your profile: ${job.title}`,
    html: `<h2>New Job Alert</h2><p>Hi ${user.name},</p><p>A new job matching your profile: <strong>${job.title}</strong> at ${job.department}</p><p>Vacancies: ${job.totalVacancies}</p><p><a href="${job.applyLink || '#'}">View Details</a></p>`,
    text: `New job: ${job.title} at ${job.department}`,
  });
};
