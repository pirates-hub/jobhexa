// Title quality gate — the aggregator auto-publishes to the public site, so
// navigation junk ("Click Here"), language switches ("English version"),
// non-recruitment notices (workshops, results, manuals, calendars) and
// semantically empty titles ("Permanent District Code") must never become
// jobs. Four tiers, cheapest first:
//   1. exact chrome labels (View / Read More / RTI / Form - A …)
//   2. non-recruitment patterns (result of, admit card, workshop, manual …)
//   3. descriptive-length (short labels without any digit are chrome)
//   4. positive recruitment signal for Latin titles ("recruitment", "posts of",
//      "walk-in", "advertisement" …). Non-Latin scripts (Hindi/Tamil/Kannada/
//      Marathi notices) skip tier 4 — the signals are English-only, and
//      official-language titles are trusted after tiers 1-3.
// Applied in run.js before a doc is enriched/stored; the server mapper
// (aggregatorImport.service.js) repeats these rules as the final line of
// defense for old exports — keep both in sync.

// Whole-title chrome: nav/menu/CTA labels that never describe a recruitment.
const JUNK_TITLE = /^(click\s?here|check\s?here|read\s?(more|details)|view\s?(details|pdf|more|all)?|download(\s?(here|pdf))?|details|more(\s?(info|details))?|apply\s?online|login|home|back|next|previous|english(\s+version)?|hindi(\s+version)?|notification(\s+board)?|advertisements?|press\s?(note|release|conference)?|important\s?(notice|links)?|links?|menu|sitemap|contact\s?us|about\s?us|whats?\s?new|latest|archives?|old\s?notifications?|results?( & archive)?|recruitment results?( & archive)?|recruitment related announcements?|rti|faq|faqs|form\s*-?\s*[a-z0-9]?|exam schedule|online application|one time registration \(?otr\)?|self attestation form|bonafide certificate)$/i;

// Non-recruitment notices: exam artifacts, documents and events — not openings.
// The exam-logistics group (admission certificates, corrigenda, revised dates,
// exam programmes, scribe/OMR instructions, candidate lists) re-announces a
// recruitment that is already on the site; it is checked before tier 4, so it
// also neutralizes titles that mention a post/advertisement number.
const NON_JOB = /\b(workshop|seminar|conference|webinar|awareness|tender|auction|holiday|merit\s?list|answer\s?key|admit\s?card|exam\s?result|result\s?of|final\s?result|orientation|foundation\s?day|annual\s?day|photo\s?gallery|news\s?letter|newsletter|calendar|manual|handbook|booklet|annual report|walk[- ]?in\s?(date|time|schedule)|admission certificate|city of examination|revised dates?|date change|revised programme|corrigendums?|programme for (preliminary|main|written|computer)?\s*examination|instructions? to (the )?candidates?|use of scribe|omr\s?(sheet)?|eligible\s?(&|and)\s?rejected candidates list|cancellation of advertisement|status of\s+lateral\s+recruitment\s+cases|status of recruitment cases)\b/i;

// Same idea for official-language chrome we can't judge with English signals:
// Hindi Day messages, birth-record corrections, advertisement guidelines,
// vigilance/public-information officer pages, "information" links.
const NON_JOB_NON_LATIN = /(दिवस\s?के\s?उपलक्ष|जन्म\s?नोंद|मार्गदर्शक|जागृत|सार्वजनिक\s?माहिति|ವಿವರ|ಮಾಹಿತಿ\s?ಅಧಿಕಾರಿ|ಜಾಗೃತ|ದಾಖಲೆ|प्रदर्शनी)/u;

// Tier-3: short labels without a digit (post counts, years, post codes) are
// almost always chrome ("Click Here" = 10, "English version" = 15).
const MIN_LENGTH = 16;

// Tier-4: the title must point at a recruitment. Deliberately excludes bare
// "career"/"opportunities"/"employment" (nav marketing pages) and bare
// "opportunity" (ISRO "Announcement of Opportunity" research calls).
// Also covers how state boards actually title vacancies: an advertisement
// number ("Advt A-4/E-1/2026", "Advt. No. 09 of 2026-27"), a category number
// ("Cat.No:469/2024"), an application form ("… Online Form 2026"), the last
// date, or a bare post name ("Constable (GD) …", "Staff Nurse Gr-II …").
const RECRUIT_SIGNAL = /recruit|vacanc|walk[- ]?in|apprentic|engagement|\bappointment\b|\bselection\b|interview|shortlisting|empanel|deputation|scrutiny of documents|post(s)?\s+(of|for|to)\b|for\s+(the\s+)?posts?\b|advertis|\badvt\b|cat\.?\s*no|online forms?|application forms?|last\s+date|\b(constable|nurse|peon|clerk|driver|guard|cook|mts|chowkidar|sachiv|secretary|librarian|doctor|specialist|demonstrator|professor|lecturer|assistant professor|junior engineer|engineer|technician|supervisor|inspector|sub[- ]?inspector|patwari|revenue officer|surveyor|panchayat secretary)\b|\bjobs?\b|hiring|naukri|bharti|walkin/i;

// Scripts whose titles we cannot evaluate with English signals.
const NON_LATIN = /[\p{Script=Devanagari}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Bengali}\p{Script=Gujarati}\p{Script=Gurmukhi}\p{Script=Malayalam}\p{Script=Oriya}\p{Script=Arabic}]/u;

// "Advertisement - (View)" -> "Advertisement" so tier 1/3 can see the core.
function coreTitle(t) {
  return t
    .replace(/\(\s*(view|details|more|pdf|download|link)\s*\)/gi, ' ')
    .replace(/^[\s\-–—|]+|[\s\-–—|]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isRecruitmentTitle(title) {
  return !rejectReason(title);
}

// Which tier rejected this title? null = passes. Exported for tuning
// (scripts/quality-check.mjs) and tests.
export function rejectReason(title) {
  const t = String(title || '').replace(/\s+/g, ' ').trim();
  if (!t) return 'empty';
  const core = coreTitle(t);
  if (!core) return 'chrome-parens'; // e.g. "(View)"
  if (JUNK_TITLE.test(core)) return 'junk-title';
  if (NON_JOB.test(t)) return 'non-job';
  if (core.length < MIN_LENGTH && !/\d/.test(core)) return 'too-short';
  if (NON_LATIN.test(t)) {
    // Official-language notice: tiers 1-3 plus the non-Latin chrome list.
    return NON_JOB_NON_LATIN.test(t) ? 'non-job' : null;
  }
  if (!RECRUIT_SIGNAL.test(t)) return 'no-recruit-signal';
  return null;
}
