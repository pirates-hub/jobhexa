// All AI features run on Groq cloud (OpenAI-compatible API) — no local Ollama.
// Required env: GROQ_API_KEY (from console.groq.com, free, no card).
// Optional: GROQ_MODEL (default openai/gpt-oss-120b), GROQ_BASE_URL.
const GROQ_BASE_URL = (process.env.GROQ_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
const GROQ_MODEL = process.env.GROQ_MODEL || process.env.OPENAI_MODEL || 'openai/gpt-oss-120b';
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '';
const GROQ_TIMEOUT_MS = parseInt(process.env.GROQ_TIMEOUT_MS || process.env.OPENAI_TIMEOUT_MS || '60000', 10);

// Single entry point used by every AI feature (chat, study plans, PDF, structuring).
export const aiChat = async (messages, opts = {}) => {
  const timeoutMs = opts.timeoutMs || GROQ_TIMEOUT_MS;
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY is missing — add your Groq key (console.groq.com) to server/.env');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const body = { model: GROQ_MODEL, messages, stream: false };
    if (opts.maxTokens) body.max_tokens = opts.maxTokens;
    const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`AI provider error ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (!content) throw new Error('Empty response from AI provider');
    return content;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error(`AI provider timeout after ${timeoutMs / 1000}s`);
    throw err;
  }
};

export const summarizePdf = async (pdfText) => {
  try {
    const content = await aiChat([
      { role: 'system', content: 'You are a government job notification summarizer. Summarize the key details: title, department, vacancies, eligibility, important dates, fee, and syllabus in a concise summary with bullet key points.' },
      { role: 'user', content: pdfText.substring(0, 8000) },
    ]);
    return {
      summary: content,
      keyPoints: content.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('•') || l.trim().startsWith('*')).slice(0, 5),
    };
  } catch (e) {
    console.error('[AI] Summarize error:', e.message);
    // Mock fallback - keep existing behavior
    if (e.message.includes('unreachable') || e.message.includes('model error') || e.message.includes('timeout')) {
      return {
        summary: `AI unavailable (${e.message}). Mock: This government notification contains job details, eligibility, dates, and syllabus.`,
        keyPoints: ['Mock fallback - AI not available', `PDF length: ${pdfText?.length || 0} chars`, `Error: ${e.message}`],
      };
    }
    return { summary: 'AI summarization failed: ' + e.message, keyPoints: [] };
  }
};

// ---------------------------------------------------------------------------
// Chat grounding
// ---------------------------------------------------------------------------
// The job database is evidence, not the answer. It used to be injected into
// every prompt with an instruction to print every row, so even "what is the
// capital of India?" came back as the same 10 listings. The database block is
// now added only for job-related questions, and the prompt no longer mandates
// the listing format unless the user asked for jobs.

const INDIAN_STATES = [
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa',
  'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka', 'kerala',
  'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland',
  'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura',
  'uttar pradesh', 'uttarakhand', 'west bengal', 'delhi', 'jammu and kashmir',
  'ladakh', 'puducherry', 'chandigarh', 'andaman and nicobar islands',
  'dadra and nagar haveli', 'daman and diu', 'lakshadweep',
].sort((a, b) => b.length - a.length);

// Exam shorthand the database actually uses in titles. Matching this lets
// "SSC CGL details" retrieve the CGL row instead of any 10 random jobs.
const EXAM_RX = /\b(ssc(?:\s+(?:cgl|chsl|mts|gd|je|stenographer))?|upsc(?:\s+(?:cse|ias|ifs))?|ibps(?:\s+(?:po|clerk|so))?|sbi(?:\s+(?:po|clerk|so))?|rrb(?:\s+(?:alp|ntpc|group\s*d|je))?|tnpsc|mpsc|appsc|tspsc|kpsc|kerala\s+psc|nda|cds|afcat|ctet|tet|ugc\s*net|csir\s*net|lic(?:\s+aao)?|nabard|rbi(?:\s+grade\s*b)?|drdo|isro|bsf|crpf|cisf|itbp)\b/i;

// Anything that makes this a question about the job database.
const JOB_TOPIC_RX = /\b(jobs?|vacanc(?:y|ies)|posts?|openings?|recruit(?:ment|ing|s|ed)?|notifications?|apply|applications?|last\s*date|deadlines?|eligib(?:le|ility)|qualifications?|age\s*limit|salary|pay\s*scale|fees?|sarkari|naukri|hiring|admit\s*card|exam\s*date|exam\s*pattern|selection\s*process)\b/i;

// Study/prep questions mention exams but should be answered from general
// knowledge, not by listing job rows.
const PREP_TOPIC_RX = /\b(syllabus|topics?|study|preparation|prepare|mock|interview|strategy|books?|cut[\s-]?off|previous\s+(?:year|paper)|how\s+to\s+prepare)\b/i;

// Words that describe the request rather than the job. Without removing these,
// "show me the latest jobs" would be searched as a title keyword and match nothing.
const STOP_WORDS = new Set([
  'what', 'which', 'when', 'where', 'who', 'why', 'how', 'many', 'much', 'are', 'is',
  'was', 'were', 'the', 'a', 'an', 'and', 'or', 'for', 'in', 'on', 'at', 'to', 'of',
  'with', 'from', 'by', 'about', 'me', 'my', 'i', 'you', 'your', 'we', 'our', 'it',
  'its', 'their', 'this', 'that', 'these', 'those', 'there', 'here', 'any', 'all',
  'some', 'please', 'tell', 'give', 'show', 'list', 'find', 'get', 'want', 'need',
  'can', 'could', 'should', 'would', 'do', 'does', 'did', 'has', 'have', 'had', 'be',
  'been', 'being', 'latest', 'recent', 'recently', 'new', 'newest', 'top', 'best',
  'current', 'currently', 'active', 'available', 'open', 'opening', 'openings', 'job',
  'jobs', 'vacancy', 'vacancies', 'post', 'posts', 'recruitment', 'notification',
  'notifications', 'apply', 'application', 'applications', 'last', 'date', 'deadline',
  'deadlines', 'detail', 'details', 'full', 'information', 'info', 'official', 'link',
  'links', 'government', 'govt', 'central', 'state', 'india', 'indian', 'exam', 'exams',
  'test', 'tests', 'syllabus', 'topic', 'topics', 'study', 'plan', 'preparation',
  'strategy', 'books', 'cutoff', 'cut', 'off', 'previous', 'year', 'paper', 'salary',
  'pay', 'scale', 'qualification', 'qualifications', 'age', 'limit', 'fee', 'fees',
  'eligible', 'eligibility', 'admit', 'card', 'selection', 'process', 'more', 'much',
]);

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Keep follow-up turns small and strictly shaped: only user/assistant text,
// newest last, bounded so one pasted document cannot blow up the prompt.
const sanitizeHistory = (history) => {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-6)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
};

const findState = (text) => {
  const lower = ` ${String(text || '').toLowerCase()} `;
  // Word-boundary match so "goa" does not fire inside "goalkeeper".
  return INDIAN_STATES.find((s) => new RegExp(`(^|[^a-z])${escapeRegex(s)}([^a-z]|$)`).test(lower)) || '';
};

const findExam = (text) => {
  const match = String(text || '').match(EXAM_RX);
  return match ? match[0].replace(/\s+/g, ' ').trim() : '';
};

const searchTerms = (text, exam, state) => {
  let cleaned = ` ${String(text || '').toLowerCase()} `;
  if (exam) cleaned = cleaned.replace(new RegExp(exam.split(/\s+/).map(escapeRegex).join('\\s+'), 'gi'), ' ');
  if (state) cleaned = cleaned.replace(new RegExp(escapeRegex(state), 'gi'), ' ');
  return [...new Set(
    cleaned.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
  )].slice(0, 5);
};

const buildJobFilter = (baseFilter, { exam, state, terms }) => {
  const clauses = [];
  if (exam) {
    // "SSC CGL" must match "SSC CGL 2026…" in the title, while a bare "SSC"
    // also matches the examType enum.
    const rx = new RegExp(exam.split(/\s+/).map(escapeRegex).join('\\s*'), 'i');
    clauses.push({ $or: [{ title: rx }, { department: rx }, { postName: rx }, { examType: rx }, { tags: rx }] });
  }
  if (state) {
    // Central ("All India") jobs are open to every state, so include them.
    const rx = new RegExp(escapeRegex(state), 'i');
    clauses.push({ $or: [{ state: rx }, { state: 'All India' }] });
  }
  // Each remaining term narrows further (e.g. "police" AND "constable").
  for (const term of terms) {
    const rx = new RegExp(escapeRegex(term), 'i');
    clauses.push({ $or: [{ title: rx }, { department: rx }, { postName: rx }, { tags: rx }] });
  }
  return clauses.length ? { ...baseFilter, $and: clauses } : { ...baseFilter };
};

const jobRow = (j) => {
  const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : 'Not specified');
  const qualifications = j.eligibility?.qualifications?.length
    ? j.eligibility.qualifications.map((q) => [q.level, q.field].filter(Boolean).join(' ')).filter(Boolean).join(' / ')
    : 'Not specified';
  const ageRange = (j.eligibility?.ageMin || j.eligibility?.ageMax)
    ? `${j.eligibility?.ageMin ?? '?'}-${j.eligibility?.ageMax ?? '?'} years`
    : 'Not specified';
  return `- [${j.title}](/jobs/${j.slug}) | Dept: ${j.department || 'Not specified'} | State: ${j.state || 'Not specified'} | Vacancies: ${j.totalVacancies ?? 'Not specified'} | Last date: ${day(j.applicationEndDate)} | Exam date: ${day(j.examDate)} | Qualification: ${qualifications} | Age: ${ageRange} | Salary: ${j.salary || 'Not specified'} | Apply: ${j.applyLink || j.officialWebsite || 'see job page'} | Official: ${j.officialWebsite || 'Not specified'}`;
};

export const chatWithAI = async (message, context, history = []) => {
  try {
    const turns = sanitizeHistory(history);
    const text = String(message || '');
    const priorUser = turns.filter((t) => t.role === 'user').map((t) => t.content).slice(-2).join(' ');
    const trimmed = text.trim();
    const hasSubject = Boolean(findExam(text) || findState(text) || searchTerms(text, '', '').length);
    // "What is its last date?" / "and the vacancies?" have no subject of their
    // own — keep the exam/state from the previous user turn.
    const isSmallTalk = /^(hi|hello|hey|thanks|thank you|good\s+(?:morning|evening|afternoon)|ok|okay|bye)\b/i.test(trimmed);
    const looksLikeFollowUp = !isSmallTalk && (
      /^(and|also|what about|how about|its|it|their|them|this|that|tell me more|more|why|which one)\b/i.test(trimmed)
      || /\b(its|their|it|them|the same|those)\b/i.test(trimmed)
      || (!hasSubject && Boolean(priorUser))
    );
    const currentIsJobQuery = JOB_TOPIC_RX.test(text) || (EXAM_RX.test(text) && !PREP_TOPIC_RX.test(text));
    const priorWasJobQuery = JOB_TOPIC_RX.test(priorUser) || EXAM_RX.test(priorUser);
    const wantsJobs = currentIsJobQuery || (looksLikeFollowUp && priorWasJobQuery);
    const wantsEligibility = /\b(am\s+i|can\s+i|do\s+i|my\s+(?:profile|eligibility|chances)|qualify)\b/i.test(text)
      || (/\beligib/i.test(text) && /\b(i|me|my)\b/i.test(text));

    let jobsContext = '';
    try {
      if (wantsJobs) {
        const { default: Job } = await import('../models/Job.js');
        const exam = findExam(text) || (looksLikeFollowUp ? findExam(priorUser) : '');
        const state = findState(text) || (looksLikeFollowUp ? findState(priorUser) : '');
        const terms = searchTerms(text, exam, state);
        const baseFilter = { jobStatus: { $in: ['active', 'closing_soon'] }, verificationStatus: 'verified' };
        const filter = buildJobFilter(baseFilter, { exam, state, terms });
        const proj = 'title slug department postName examType state applicationEndDate examDate totalVacancies eligibility salary applyLink officialWebsite tags';

        const totalJobs = await Job.countDocuments(baseFilter);
        let matchedTotal = await Job.countDocuments(filter);
        let vacancyTotal = 0;
        let jobs = [];
        let eligibilityChecked = false;
        let eligibilityIncomplete = false;
        let missingFields = [];

        // Eligibility needs the whole candidate set (76 jobs today), not a
        // sample, otherwise a qualified job outside the first 10 is missed.
        if (wantsEligibility && context?._id) {
          const { checkEligibility } = await import('./eligibility.service.js');
          // req.user already carries the profile, so only hit the database when
          // the caller passed an id alone.
          const hasProfile = ['qualification', 'dateOfBirth', 'category'].some((k) => k in context);
          const user = hasProfile ? context : await (await import('../models/User.js')).default.findById(context._id);
          if (user) {
            const pool = await Job.find(filter).sort({ createdAt: -1 }).limit(200).select(proj);
            const evaluated = pool.map((j) => ({ job: j, result: checkEligibility(user, j) }));
            const eligibleJobs = evaluated.filter((e) => e.result.eligible === true).map((e) => e.job);
            // eligible === null means "profile incomplete", not "not eligible".
            eligibilityIncomplete = eligibleJobs.length === 0 && evaluated.some((e) => e.result.incompleteProfile);
            missingFields = [...new Set(evaluated.flatMap((e) => e.result.missing || []))];
            jobs = eligibleJobs.slice(0, 10);
            matchedTotal = eligibleJobs.length;
            vacancyTotal = eligibleJobs.reduce((sum, j) => sum + (Number(j.totalVacancies) || 0), 0);
            eligibilityChecked = true;
          }
        }

        // Only fall back to a keyword-less sample when eligibility was not the
        // filter — otherwise zero eligible jobs would be replaced by a list of
        // jobs the user cannot apply for.
        if (!jobs.length && !eligibilityChecked) {
          jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(10).select(proj);
          const agg = await Job.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: '$totalVacancies' } } }]);
          vacancyTotal = agg[0]?.total || 0;
        }

        const scope = [exam && `exam "${exam}"`, state && `state ${state}`, terms.length && `keywords "${terms.join(' ')}"`]
          .filter(Boolean).join(', ');

        if (matchedTotal === 0) {
          jobsContext = eligibilityIncomplete
            ? `\n\nJobHexa Database — TOTAL ACTIVE JOBS IN THE SYSTEM: ${totalJobs}. The user's profile is incomplete (missing: ${missingFields.join(', ') || 'details'}), so eligibility cannot be determined. Ask them to complete their profile before answering; do not say they are ineligible.`
            : eligibilityChecked
              ? `\n\nJobHexa Database — TOTAL ACTIVE JOBS IN THE SYSTEM: ${totalJobs}. The user's saved profile does not meet the eligibility criteria for any active verified job${scope ? ` matching ${scope}` : ''}. Say so honestly, suggest updating their profile, and never invent an eligible job.`
              : `\n\nJobHexa Database — TOTAL ACTIVE JOBS IN THE SYSTEM: ${totalJobs}. There is no active verified job${scope ? ` matching ${scope}` : ''}. Tell the user it is not in the JobHexa database and point them to the official website. Never invent a job to fill the gap.`;
        } else {
          jobsContext = `\n\nJobHexa Database — TOTAL ACTIVE JOBS IN THE SYSTEM: ${totalJobs}. MATCHING THIS QUERY${scope ? ` (${scope})` : ''}: ${matchedTotal} job(s), ${vacancyTotal} vacancies in total. The ${jobs.length} row(s) below are the latest sample, not the whole set. Copy every number, date and link exactly; use "Not specified" for blank fields.\n${jobs.map(jobRow).join('\n')}\nOfficial sites: SSC https://ssc.gov.in, UPSC https://upsc.gov.in, IBPS https://ibps.in, RRB https://indianrailways.gov.in, TNPSC https://tnpsc.gov.in, DRDO https://drdo.gov.in.`;
          if (wantsEligibility) {
            jobsContext += eligibilityChecked
              ? `\nELIGIBILITY: This list is filtered to jobs the user's saved profile meets (${matchedTotal}). Say the user is eligible for these; never claim eligibility for jobs outside this list.`
              : '\nELIGIBILITY: The user is not logged in (or their profile could not be loaded), so eligibility cannot be checked. Explain that they need to log in and complete their profile for an eligibility answer.';
          }
        }
      }
    } catch (e) { console.error('[RAG] Jobs fetch failed', e.message); }

    // Minimal user context: the full user doc (ids, tokens, prefs) is both
    // a token hog and must never leave for a third-party API.
    const cu = (context && typeof context.toObject === 'function') ? context.toObject() : (context || {});
    const tinyCtx = { name: cu.name, state: cu.state, category: cu.category, qualification: cu.qualification, dateOfBirth: cu.dateOfBirth };

    const systemPrompt = [
      'You are JobHexa AI, a helpful assistant for Indian government job aspirants.',
      'Answer the question the user actually asked. Do NOT paste a job list unless they asked for jobs, vacancies, openings or recommendations.',
      'Only state job facts (titles, vacancies, dates, fees, links) that appear in the JobHexa Database section; never invent or guess them. Copy values exactly.',
      'If a job field is missing from the database, write "Not specified" — never "undefined" or an invented value.',
      'If the user asks about one exam, answer about that exam only.',
      'If the user asks how many jobs or vacancies, use the TOTAL / MATCHING / VACANCIES numbers in the database section. Never count the sample rows and present that as the total.',
      'If a requested job is not in the database, say it is not in the database and link the official site.',
      'Only when the user asked to see jobs, format each as: N. [Title](/jobs/slug) — Vacancies: X — Last date: YYYY-MM-DD — [Details](/jobs/slug) [Apply](url), using the exact slug and apply URL from the row.',
      'For non-job questions (general knowledge, greetings, study advice, syllabus, interview prep), answer normally from your own knowledge and ignore the database section.',
      'Be concise, accurate and friendly. Use markdown.',
      `User profile: ${JSON.stringify(tinyCtx)}.`,
    ].join('\n') + jobsContext;

    // Drop an echoed current message if the client included it in history.
    if (turns.length && turns[turns.length - 1].role === 'user' && turns[turns.length - 1].content.trim() === text.trim()) {
      turns.pop();
    }

    const content = await aiChat([
      { role: 'system', content: systemPrompt },
      ...turns,
      { role: 'user', content: text },
    ], { maxTokens: 1200 });
    return { reply: content };
  } catch (e) {
    console.error('[AI] Chat error:', e.message);
    // Mock fallback
    if (e.message.includes('unreachable') || e.message.includes('model error') || e.message.includes('timeout')) {
      return {
        reply: `AI unavailable: ${e.message}. Mock reply - You asked: "${message}". Add your Groq key (console.groq.com) as OPENAI_API_KEY in server/.env to enable real AI.`,
      };
    }
    return { reply: 'AI error: ' + e.message };
  }
};

export const extractJobFromPdf = async (pdfText) => {
  try {
    const content = await aiChat([
      { role: 'system', content: 'Extract government job data from this notification PDF. Return ONLY valid JSON with: title, department, vacancies {general,obc,sc,st,ews}, qualifications [{level,field}], ageLimits {min,max,relaxation:{obc,sc,st}}, dates {applicationStart,applicationEnd,examDate}, fees {general,obc,sc,st}, officialWebsite, syllabus [{section, topics:[], marks, duration, tableData:[]}], selectionProcess, examPattern. For syllabus tables, preserve rows/columns as tableData. No extra text, only JSON.' },
      { role: 'user', content: pdfText.substring(0, 8000) },
    ]);
    // Try to extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(content);
  } catch (e) {
    console.error('[AI] Extract error:', e.message);
    if (e.message.includes('unreachable') || e.message.includes('model error')) {
      return { title: 'Mock extraction - AI unavailable', confidence: 0.5, vacancies: null, qualifications: [], dates: {}, error: e.message };
    }
    return { error: e.message };
  }
};

export const generateStudyPlan = async (examName, user, missingTopics, days = 30) => {
  // Real-topic fallback: cycle actual syllabus topics instead of a generic repeating list
  const fallbackPlan = async (total) => {
    let names = (missingTopics || []).map((t) => (typeof t === 'string' ? t : t.name)).filter(Boolean);
    if (!names.length) {
      try {
        const { default: Topic } = await import('../models/Topic.js');
        const docs = await Topic.find().select('name subject').populate('subject', 'name').limit(60);
        names = docs.map((d) => `${d.name} (${d.subject?.name || 'General'})`);
      } catch {}
    }
    if (!names.length) names = ['Revision'];
    const perDay = Math.max(1, Math.ceil(names.length / total));
    return Array.from({ length: total }, (_, i) => {
      const slice = names.slice(i * perDay, i * perDay + perDay);
      const topic = slice.length ? slice.join(' + ') : names[i % names.length];
      return { day: i + 1, topic, subject: 'Syllabus', hours: 2, tasks: [`Study ${topic}`, 'Practice questions', 'Revise previous'] };
    });
  };
  try {
    const topicsList = missingTopics?.map(t => t.name).join(', ') || 'General topics';
    // For large plans (>30 days), use fast fallback to avoid Ollama timeout
    if (days > 30) {
      return fallbackPlan(days);
    }
    const content = await aiChat([
      { role: 'system', content: `You are a government exam preparation planner. Create a concise ${days}-day study plan for ${examName}. User: ${JSON.stringify(user || {})}. Focus on missing topics: ${topicsList}. Return as JSON array with ${days} objects: {day:1, topic:"", subject:"", hours:2, tasks:[""]}. Be concise.` },
      { role: 'user', content: `Create ${days}-day plan for ${examName}. Missing topics: ${topicsList}` },
    ]);
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, days);
      }
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, days);
      return fallbackPlan(days);
    } catch {
      // Fallback: real syllabus topics instead of a generic repeating list
      return fallbackPlan(days);
    }
  } catch (e) {
    console.error('[AI] Study plan error:', e.message);
    return { error: e.message, plan: [] };
  }
};

export const generateInterviewQuestions = async (jobTitle, user) => {
  try {
    const content = await aiChat([
      { role: 'system', content: `You are an interviewer for Indian government jobs. Generate 5 mock interview questions for ${jobTitle}. User: ${JSON.stringify(user || {})}. Return JSON array: [{question:"", tip:"", category:""}].` },
      { role: 'user', content: `Generate interview questions for ${jobTitle}` },
    ]);
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return JSON.parse(content);
    } catch {
      return [
        { question: `Why do you want to join ${jobTitle}?`, tip: 'Mention passion for public service', category: 'Motivation' },
        { question: 'Tell us about yourself', tip: 'Brief background + strengths', category: 'General' },
        { question: 'What are your strengths?', tip: 'Relate to job requirements', category: 'General' },
        { question: 'How do you handle pressure?', tip: 'Give example', category: 'Behavioral' },
        { question: `What do you know about ${jobTitle}?`, tip: 'Mention department and role', category: 'Knowledge' },
      ];
    }
  } catch (e) {
    return { error: e.message, questions: [] };
  }
};
