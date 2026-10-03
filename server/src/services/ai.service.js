const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';
const OLLAMA_TIMEOUT_MS = 90000;

const ollamaChat = async (messages) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text();
      // Handle model not found
      if (res.status === 404 || text.includes('model')) {
        throw new Error(`Ollama model not found: ${OLLAMA_MODEL}. Run: ollama pull ${OLLAMA_MODEL}`);
      }
      throw new Error(`Ollama error ${res.status}: ${text}`);
    }

    const data = await res.json();
    // Ollama returns { message: { role, content }, done: true }
    const content = data.message?.content || data.response || '';
    if (!content) throw new Error('Empty response from Ollama');
    return content;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error(`Ollama timeout after ${OLLAMA_TIMEOUT_MS / 1000}s - model may be loading`);
    }
    if (err.cause?.code === 'ECONNREFUSED' || err.message.includes('ECONNREFUSED') || err.message.includes('fetch failed')) {
      throw new Error(`Ollama not running at ${OLLAMA_BASE_URL}. Start with: ollama serve`);
    }
    throw err;
  }
};

export const summarizePdf = async (pdfText) => {
  try {
    const content = await ollamaChat([
      { role: 'system', content: 'You are a government job notification summarizer. Summarize the key details: title, department, vacancies, eligibility, important dates, fee, and syllabus in a concise summary with bullet key points.' },
      { role: 'user', content: pdfText.substring(0, 8000) },
    ]);
    return {
      summary: content,
      keyPoints: content.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('•') || l.trim().startsWith('*')).slice(0, 5),
    };
  } catch (e) {
    console.error('[Ollama] Summarize error:', e.message);
    // Mock fallback - keep existing behavior
    if (e.message.includes('not running') || e.message.includes('model not found') || e.message.includes('timeout')) {
      return {
        summary: `Ollama unavailable (${e.message}). Mock: This government notification contains job details, eligibility, dates, and syllabus.`,
        keyPoints: ['Mock fallback - Ollama not available', `PDF length: ${pdfText?.length || 0} chars`, `Error: ${e.message}`],
      };
    }
    return { summary: 'AI summarization failed: ' + e.message, keyPoints: [] };
  }
};

export const chatWithAI = async (message, context) => {
  try {
    // RAG: Inject real JobHexa jobs so AI doesn't hallucinate dates
    let jobsContext = '';
    try {
      const { default: Job } = await import('../models/Job.js');
      const lower = message.toLowerCase();
      const isEligibleQuery = lower.includes('elig');
      // State-aware RAG: if user names a state, only ground on that state + All India
      const STATES = ['tamil nadu','uttar pradesh','maharashtra','karnataka','kerala','bihar','west bengal','odisha','punjab','rajasthan','gujarat','assam','delhi','telangana','andhra pradesh','madhya pradesh','haryana','jharkhand','chhattisgarh'];
      const hitState = STATES.find((s) => lower.includes(s));
      const baseFilter = { jobStatus: { $in: ['active', 'closing_soon'] }, verificationStatus: 'verified' };
      const proj = 'title slug department examType state applicationEndDate examDate totalVacancies eligibility applyLink officialWebsite';
      let jobs;
      if (hitState) {
        // State jobs first, then All-India fill — otherwise centrals crowd out state rows
        const own = await Job.find({ ...baseFilter, state: new RegExp(hitState, 'i') }).limit(20).select(proj);
        const rest = await Job.find({ ...baseFilter, state: 'All India' }).limit(Math.max(0, 20 - own.length)).select(proj);
        jobs = [...own, ...rest];
      } else {
        jobs = await Job.find(baseFilter).limit(20).select(proj);
      }
      // For "what exam am I eligible" queries, filter to only eligible jobs using real eligibility engine
      if (isEligibleQuery && (lower.includes('what') || lower.includes('which') || !lower.includes('for')) && context?._id) {
        try {
          const { checkEligibility } = await import('./eligibility.service.js');
          const { default: User } = await import('../models/User.js');
          const user = await User.findById(context._id);
          if (user) {
            const eligible = jobs.filter(j => {
              const result = checkEligibility(user, j);
              return result.eligible;
            });
            if (eligible.length > 0) jobs = eligible;
          }
        } catch (e) { console.error('[RAG] Eligibility filter failed', e.message); }
      }
      if (jobs.length) {
        const row = (j) => {
          const dl = j.applicationEndDate ? j.applicationEndDate.toISOString().split('T')[0] : 'Not specified';
          const ex = j.examDate ? j.examDate.toISOString().split('T')[0] : 'Not specified';
          const qual = j.eligibility?.qualifications?.map((q) => q.level).join(',') || 'Not specified';
          const age = j.eligibility?.ageMax ? `${j.eligibility?.ageMin || 18}-${j.eligibility.ageMax}` : 'Not specified';
          const vac = j.totalVacancies ?? 'Not specified';
          return `- [${j.title}](/jobs/${j.slug}) | ${j.examType || 'Not specified'} | ${j.department || 'Not specified'} | ${j.state || ''} | Vacancies: ${vac} | Deadline: ${dl} | Exam: ${ex} | Qual: ${qual} | Age ${age} | Apply: ${j.applyLink || j.officialWebsite || 'see job page'}`;
        };
        jobsContext = `\n\nJobHexa Database — these are the ONLY jobs you may mention. Copy titles, vacancy numbers, dates and links EXACTLY as written. NEVER invent jobs, vacancy counts, groups (e.g. Group X/A/B/C/V) or dates not in this list. Write "Not specified" instead of guessing. If the user asks for something not in this list, say it is not in the database and point to the official site.\n${jobs.map(row).join('\n')}\nOfficial sites: SSC https://ssc.gov.in, UPSC https://upsc.gov.in, IBPS https://ibps.in, RRB https://indianrailways.gov.in, TNPSC https://tnpsc.gov.in, DRDO https://drdo.gov.in.\nIMPORTANT: list every job as: N. [Title](/jobs/slug) | Vacancies | Deadline | [Details](/jobs/slug) [Apply](apply-url). "Details" and "Apply" MUST be markdown links — never plain text. Keep the title link exactly [Title](/jobs/slug) so users can click through.`;
        if (isEligibleQuery && jobs.length < 10) {
          jobsContext += `\nNOTE: This list is already filtered to only jobs you are eligible for based on your profile. Say you are eligible for these ${jobs.length} exams.`;
        }
      }
    } catch (e) { console.error('[RAG] Jobs fetch failed', e.message); }

    const content = await ollamaChat([
      { role: 'system', content: 'You are JobHexa AI assistant for Indian government job aspirants. RULES: (1) Only mention jobs from the JobHexa Database below — never invent post names, groups, vacancy numbers or dates. (2) Copy titles, numbers, dates and links exactly. (3) Use "Not specified" for anything missing — never write "undefined". (4) If asked for jobs not in the list, say so and direct to the official site. For each job, format the title as a markdown link [Title](/jobs/slug) exactly as provided so user can click to visit. Be accurate, concise, helpful. User context: ' + JSON.stringify(context || {}) + jobsContext },
      { role: 'user', content: message },
    ]);
    return { reply: content };
  } catch (e) {
    console.error('[Ollama] Chat error:', e.message);
    // Mock fallback
    if (e.message.includes('not running') || e.message.includes('model not found') || e.message.includes('timeout')) {
      return {
        reply: `Ollama unavailable: ${e.message}. Mock reply - You asked: "${message}". Add Ollama at ${OLLAMA_BASE_URL} with model ${OLLAMA_MODEL} to enable real AI.`,
      };
    }
    return { reply: 'AI error: ' + e.message };
  }
};

export const extractJobFromPdf = async (pdfText) => {
  try {
    const content = await ollamaChat([
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
    console.error('[Ollama] Extract error:', e.message);
    if (e.message.includes('not running') || e.message.includes('model not found')) {
      return { title: 'Mock extraction - Ollama unavailable', confidence: 0.5, vacancies: null, qualifications: [], dates: {}, error: e.message };
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
    const content = await ollamaChat([
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
    console.error('[Ollama] Study plan error:', e.message);
    return { error: e.message, plan: [] };
  }
};

export const generateInterviewQuestions = async (jobTitle, user) => {
  try {
    const content = await ollamaChat([
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
