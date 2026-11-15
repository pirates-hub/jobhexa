// Shared application-window -> job status mapping. One copy of the rule:
//   end in the past            -> closed
//   start in the future        -> upcoming
//   both present and current   -> closing_soon (<= 3 days) | active
//   indeterminate (missing)    -> null (caller keeps the existing status)
// Used by the daily collector (buildPendingJob), the 6 AM status cron and
// the weekly state refresh so the portal, the cron and the collector can
// never disagree about a job's status.
export const windowStatus = (start, end, now = new Date()) => {
  const t = now instanceof Date ? now : new Date(now);
  if (end && new Date(end) < t) return 'closed';
  if (start && new Date(start) > t) return 'upcoming';
  if (start && end) {
    const days = Math.ceil((new Date(end) - t) / 86400000);
    if (days <= 3) return 'closing_soon';
    return 'active';
  }
  return null;
};
