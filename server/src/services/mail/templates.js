import { appBase } from './config.js';

const COLORS = {
  ink: '#0f172a',
  body: '#334155',
  muted: '#64748b',
  faint: '#94a3b8',
  border: '#e2e8f0',
  panel: '#f8fafc',
  accent: '#2563eb',
};

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

export const formatDate = (value) => {
  if (!value) return 'Not specified';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not specified';
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const jobUrl = (job) => `${appBase()}/jobs/${job.slug || job._id}`;
const applyUrl = (job) => job.applyLink || job.officialWebsite || jobUrl(job);
const vacancyText = (job) => (job.totalVacancies ?? 'Not specified');

const heading = (text) =>
  `<h1 style="margin:0 0 14px;font-size:23px;line-height:1.3;font-weight:800;letter-spacing:-0.02em;color:${COLORS.ink};">${escapeHtml(text)}</h1>`;

const paragraph = (html) =>
  `<p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:${COLORS.body};">${html}</p>`;

const button = (href, label) =>
  `<a href="${escapeHtml(href)}" style="display:inline-block;background:${COLORS.ink};color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:11px 18px;border-radius:10px;">${escapeHtml(label)}</a>`;

const detailRow = (label, value) =>
  `<tr><td style="padding:5px 0;font-size:12px;color:${COLORS.muted};width:120px;">${escapeHtml(label)}</td><td style="padding:5px 0;font-size:13px;color:${COLORS.ink};font-weight:600;">${escapeHtml(value)}</td></tr>`;

const jobCard = (job, index) => {
  const url = jobUrl(job);
  const meta = [job.department || 'Department not specified', job.state || 'All India']
    .filter(Boolean).join(' · ');
  return `<tr><td style="border:1px solid ${COLORS.border};border-radius:12px;padding:15px 16px;background:#ffffff;">
    <div style="font-size:11px;font-weight:800;color:${COLORS.faint};letter-spacing:0.08em;text-transform:uppercase;">${index + 1}</div>
    <a href="${escapeHtml(url)}" style="display:block;margin-top:4px;font-size:15px;line-height:1.4;font-weight:700;color:${COLORS.ink};text-decoration:none;">${escapeHtml(job.title || 'Untitled job')}</a>
    <div style="margin-top:4px;font-size:12px;color:${COLORS.muted};">${escapeHtml(meta)}</div>
    <div style="margin-top:9px;font-size:12px;color:${COLORS.body};">
      <span style="font-weight:700;">Vacancies:</span> ${escapeHtml(vacancyText(job))}
      &nbsp;·&nbsp;
      <span style="font-weight:700;">Last date:</span> ${escapeHtml(formatDate(job.applicationEndDate))}
    </div>
    <div style="margin-top:11px;">
      <a href="${escapeHtml(url)}" style="font-size:12px;font-weight:700;color:${COLORS.accent};text-decoration:none;">View details →</a>
      <span style="color:${COLORS.border};">&nbsp;|&nbsp;</span>
      <a href="${escapeHtml(applyUrl(job))}" style="font-size:12px;font-weight:700;color:${COLORS.accent};text-decoration:none;">Apply →</a>
    </div>
  </td></tr>`;
};

const jobList = (jobs) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 10px;margin:6px 0 18px;">${jobs.map(jobCard).join('')}</table>`;

const footer = ({ reason, preferencesUrl, unsubscribeUrl }) => {
  const links = [
    preferencesUrl ? `<a href="${escapeHtml(preferencesUrl)}" style="color:${COLORS.muted};text-decoration:underline;">Manage email preferences</a>` : '',
    unsubscribeUrl ? `<a href="${escapeHtml(unsubscribeUrl)}" style="color:${COLORS.muted};text-decoration:underline;">Unsubscribe</a>` : '',
  ].filter(Boolean).join(' &nbsp;·&nbsp; ');
  return `<p style="margin:0 0 6px;">${escapeHtml(reason)}</p>
    ${links ? `<p style="margin:0 0 8px;">${links}</p>` : ''}
    <p style="margin:0;color:${COLORS.faint};">JobHexa · Government job alerts · jobhexa.com</p>`;
};

const layout = ({ title, preheader = '', content, reason, preferencesUrl, unsubscribeUrl }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLORS.ink};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
    <tr><td style="padding:0 4px 14px;">
      <span style="font-size:19px;font-weight:800;letter-spacing:-0.03em;color:${COLORS.ink};">JobHexa</span>
      <span style="font-size:11px;font-weight:600;color:${COLORS.muted};margin-left:8px;">Government job alerts</span>
    </td></tr>
    <tr><td style="background:#ffffff;border:1px solid ${COLORS.border};border-radius:16px;padding:32px 28px;">
      ${content}
    </td></tr>
    <tr><td style="padding:18px 8px 0;font-size:11px;line-height:1.7;color:${COLORS.faint};">
      ${footer({ reason, preferencesUrl, unsubscribeUrl })}
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

const greeting = (user) => (user?.name ? `Hi ${escapeHtml(user.name.split(/\s+/)[0])},` : 'Hi,');

export const preferencesUrl = () => `${appBase()}/profile`;

export const eligibleDigest = ({ user, jobs, unsubscribeUrl, preferencesUrl: prefs }) => {
  const count = jobs.length;
  const verb = count === 1 ? 'matches' : 'match';
  const subject = `${count} job${count === 1 ? '' : 's'} ${verb} your profile — JobHexa`;
  const intro = `${greeting(user)} based on the profile you saved, you can apply for ${count === 1 ? 'this job' : `these ${count} jobs`}:`;

  const textJobs = jobs.map((job, i) => [
    `${i + 1}. ${job.title}`,
    `   ${job.department || 'Department not specified'} · ${job.state || 'All India'}`,
    `   Vacancies: ${vacancyText(job)} · Last date: ${formatDate(job.applicationEndDate)}`,
    `   Details: ${jobUrl(job)}`,
    `   Apply: ${applyUrl(job)}`,
  ].join('\n')).join('\n\n');

  const text = [
    greeting(user).replace(/,$/, ','),
    '',
    `Based on your profile, you can apply for ${count === 1 ? 'this job' : `these ${count} jobs`}:`,
    '',
    textJobs,
    '',
    `Browse all jobs: ${appBase()}/jobs`,
    '',
    `Manage email preferences: ${prefs}`,
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join('\n');

  return {
    subject,
    text,
    html: layout({
      title: subject,
      preheader: `${count} matching job${count === 1 ? '' : 's'} today`,
      reason: 'You received this because you registered for job alerts at JobHexa.',
      preferencesUrl: prefs,
      unsubscribeUrl,
      content: [
        heading(`${count} job${count === 1 ? '' : 's'} ${verb} your profile`),
        paragraph(intro),
        jobList(jobs),
        `<div style="margin-top:4px;">${button(`${appBase()}/jobs`, 'Browse all jobs')}</div>`,
        `<p style="margin:16px 0 0;font-size:12px;line-height:1.7;color:${COLORS.muted};">Deadlines approach fast — apply early, and always confirm details on the official notification.</p>`,
      ].join(''),
    }),
  };
};

export const deadlineReminder = ({ user, job, daysLeft, unsubscribeUrl, preferencesUrl: prefs }) => {
  const when = daysLeft === 0 ? 'today is the last day' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
  const subject = daysLeft === 0
    ? `Last day to apply: ${job.title}`
    : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left: ${job.title}`;

  const text = [
    greeting(user),
    '',
    `${when[0].toUpperCase() + when.slice(1)} to apply for ${job.title}.`,
    '',
    `Department: ${job.department || 'Not specified'}`,
    `Vacancies: ${vacancyText(job)}`,
    `Last date: ${formatDate(job.applicationEndDate)}`,
    `Details: ${jobUrl(job)}`,
    `Apply: ${applyUrl(job)}`,
    '',
    `Manage email preferences: ${prefs}`,
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join('\n');

  return {
    subject,
    text,
    html: layout({
      title: subject,
      preheader: `${when} to apply`,
      reason: 'You received this because you saved or applied to this job on JobHexa.',
      preferencesUrl: prefs,
      unsubscribeUrl,
      content: [
        heading(daysLeft === 0 ? 'Last day to apply' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`),
        paragraph(`${greeting(user)} ${when} to apply for <strong>${escapeHtml(job.title)}</strong>.`),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.panel};border:1px solid ${COLORS.border};border-radius:12px;padding:14px 16px;margin:0 0 18px;">
          ${detailRow('Department', job.department || 'Not specified')}
          ${detailRow('Vacancies', vacancyText(job))}
          ${detailRow('Last date', formatDate(job.applicationEndDate))}
        </table>`,
        `<div>${button(applyUrl(job), 'Apply now')}</div>`,
        `<p style="margin:14px 0 0;font-size:12px;color:${COLORS.muted};">Or open the <a href="${escapeHtml(jobUrl(job))}" style="color:${COLORS.accent};text-decoration:none;font-weight:700;">full job details</a>.</p>`,
      ].join(''),
    }),
  };
};

export const studyPlanDay = ({ user, plan, day, unsubscribeUrl, preferencesUrl: prefs }) => {
  const subject = `Day ${day.day}: ${day.topic} — Study Plan`;
  const tasks = Array.isArray(day.tasks) ? day.tasks.filter(Boolean) : [];
  const taskText = tasks.length ? tasks.map((task) => `- ${task}`).join('\n') : '- Revise today’s topic';
  const taskHtml = tasks.length
    ? tasks.map((task) => `<li style="margin:0 0 6px;">${escapeHtml(task)}</li>`).join('')
    : '<li>Revise today’s topic</li>';

  const text = [
    greeting(user),
    '',
    `Day ${day.day} of your ${plan.exam} plan: ${day.topic} (${day.subject || 'General'}) — ${day.hours || 2}h.`,
    '',
    'Today’s tasks:',
    taskText,
    '',
    `Open your plan: ${appBase()}/my-plan`,
    '',
    `Manage email preferences: ${prefs}`,
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join('\n');

  return {
    subject,
    text,
    html: layout({
      title: subject,
      preheader: `Day ${day.day}: ${day.topic}`,
      reason: 'You received this because you started a study plan on JobHexa.',
      preferencesUrl: prefs,
      unsubscribeUrl,
      content: [
        heading(`Day ${day.day}: ${day.topic}`),
        paragraph(`${greeting(user)} today’s focus is <strong>${escapeHtml(day.topic)}</strong>${day.subject ? ` (${escapeHtml(day.subject)})` : ''} — about ${escapeHtml(String(day.hours || 2))} hour${Number(day.hours) === 1 ? '' : 's'}.`),
        `<div style="background:${COLORS.panel};border:1px solid ${COLORS.border};border-radius:12px;padding:16px 18px;margin:0 0 18px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:${COLORS.muted};">Today’s tasks</p>
          <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:${COLORS.body};">${taskHtml}</ul>
        </div>`,
        `<div>${button(`${appBase()}/my-plan`, 'Open my plan')}</div>`,
        `<p style="margin:16px 0 0;font-size:12px;color:${COLORS.muted};">${escapeHtml(plan.exam)} · Day ${day.day} of ${plan.plan?.length || '—'}</p>`,
      ].join(''),
    }),
  };
};

export const welcome = ({ user, preferencesUrl: prefs }) => {
  const name = user?.name ? escapeHtml(user.name.split(/\s+/)[0]) : 'there';
  const subject = 'Welcome to JobHexa';
  const text = [
    `Hi ${user?.name?.split(/\s+/)[0] || 'there'},`,
    '',
    'Your JobHexa account is ready.',
    '',
    'Complete your profile so we can match the right government jobs to your qualification, age and category.',
    '',
    `Complete your profile: ${appBase()}/profile`,
    `Browse jobs: ${appBase()}/jobs`,
    '',
    `Manage email preferences: ${prefs}`,
  ].join('\n');

  return {
    subject,
    text,
    html: layout({
      title: subject,
      preheader: 'Your account is ready — complete your profile to get matched jobs',
      reason: 'You received this because you created a JobHexa account.',
      preferencesUrl: prefs,
      content: [
        heading('Welcome to JobHexa'),
        paragraph(`Hi ${name}, your account is ready.`),
        paragraph('Complete your profile so we can match the right government jobs to your qualification, age and category.'),
        `<ol style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.9;color:${COLORS.body};">
          <li>Add your qualification and date of birth</li>
          <li>Choose your state and category</li>
          <li>Pick the exam types you are preparing for</li>
        </ol>`,
        `<div>${button(`${appBase()}/profile`, 'Complete your profile')}</div>`,
        `<p style="margin:16px 0 0;font-size:12px;color:${COLORS.muted};">Then <a href="${escapeHtml(`${appBase()}/jobs`)}" style="color:${COLORS.accent};text-decoration:none;font-weight:700;">browse jobs</a> or create a study plan in AI Chat.</p>`,
      ].join(''),
    }),
  };
};

export const passwordReset = ({ user, link, expiresMinutes = 10, preferencesUrl: prefs }) => {
  const subject = 'Reset your JobHexa password';
  const safeLink = escapeHtml(link);
  const text = [
    `Hi ${user?.name?.split(/\s+/)[0] || 'there'},`,
    '',
    `Use this link to reset your JobHexa password (valid ${expiresMinutes} minutes):`,
    link,
    '',
    'If you did not request this, you can ignore this email — your password will not change.',
    '',
    `Manage email preferences: ${prefs}`,
  ].join('\n');

  return {
    subject,
    text,
    html: layout({
      title: subject,
      preheader: `Reset link valid for ${expiresMinutes} minutes`,
      reason: 'You received this because a password reset was requested for this address.',
      preferencesUrl: prefs,
      content: [
        heading('Reset your password'),
        paragraph(`Hi ${user?.name?.split(/\s+/)[0] ? escapeHtml(user.name.split(/\s+/)[0]) : 'there'}, use the button below to choose a new password.`),
        `<div style="margin:6px 0 18px;">${button(link, 'Reset password')}</div>`,
        `<p style="margin:0 0 14px;font-size:12px;line-height:1.7;color:${COLORS.muted};">This link is valid for ${expiresMinutes} minutes. If the button does not work, copy this address into your browser:<br><a href="${safeLink}" style="color:${COLORS.accent};word-break:break-all;">${safeLink}</a></p>`,
        `<p style="margin:0;font-size:12px;line-height:1.7;color:${COLORS.muted};">If you did not request this, you can ignore this email — your password will not change.</p>`,
      ].join(''),
    }),
  };
};

export const adminTest = ({ name }) => {
  const subject = 'JobHexa mail test';
  const text = [
    `Hi ${name || 'admin'},`,
    '',
    'This is a test email from the JobHexa mail system.',
    'If it arrived in your inbox, the provider, sender address and templates are working.',
    '',
    'JobHexa',
  ].join('\n');
  return {
    subject,
    text,
    html: layout({
      title: subject,
      preheader: 'Mail system test',
      reason: 'You received this because an administrator sent a test from JobHexa.',
      preferencesUrl: preferencesUrl(),
      content: [
        heading('Mail system test'),
        paragraph(`Hi ${escapeHtml(name || 'admin')}, this is a test email from the JobHexa mail system.`),
        paragraph('If it arrived in your inbox, the provider, sender address and templates are working.'),
      ].join(''),
    }),
  };
};

export const adminManual = ({ name, message, html, unsubscribeUrl, preferencesUrl: prefs }) => {
  const bodyHtml = html || String(message || '')
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:${COLORS.body};">${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('');
  return {
    html: layout({
      title: 'Message from JobHexa',
      preheader: 'Message from the JobHexa team',
      reason: 'You received this because you have a JobHexa account.',
      preferencesUrl: prefs || preferencesUrl(),
      unsubscribeUrl: unsubscribeUrl || `${appBase()}/profile`,
      content: bodyHtml,
    }),
    text: message || String(html || '').replace(/<[^>]+>/g, ' '),
  };
};
