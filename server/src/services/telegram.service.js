// Telegram alerts scaffold — set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in server/.env.
// Best-effort only: never throws, respects rate limits with a tiny queue.
let queue = [];
let busy = false;

const sendRaw = async (text) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.log(`[Telegram Skip] ${text.slice(0, 80)}`);
    return { skipped: true };
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000) }),
  });
  if (!res.ok) throw new Error(`Telegram HTTP ${res.status}`);
  return res.json();
};

const pump = async () => {
  if (busy || queue.length === 0) return;
  busy = true;
  while (queue.length) {
    const { text, resolve, reject } = queue.shift();
    try {
      const r = await sendRaw(text);
      resolve(r);
    } catch (e) {
      console.error('[Telegram Failed]', e.message);
      reject(e);
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  busy = false;
};

export const sendTelegram = (text) => new Promise((resolve, reject) => {
  queue.push({ text, resolve, reject });
  pump();
});

export const notifyNewJobTelegram = (job) => sendTelegram(
  `New govt job: ${job.title}\n${job.organization || ''} — ${job.totalVacancies || '?'} posts\nLast: ${job.applicationEndDate ? new Date(job.applicationEndDate).toLocaleDateString('en-IN') : 'see notification'}\n${job.officialWebsite || ''}`
).catch(() => {});

export const notifyDeadlineTelegram = (job, daysLeft) => sendTelegram(
  `Reminder: ${daysLeft === 0 ? 'today is last day' : `${daysLeft} days left`} — ${job.title}\nLast: ${new Date(job.applicationEndDate).toLocaleDateString('en-IN')}`
).catch(() => {});
