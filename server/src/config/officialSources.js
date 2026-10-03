// Official government recruitment source registry for JobHexa schedulers.
//
// ABSOLUTE RULE: every officialUrl below must be a REAL official website
// that was observed to exist. Placeholder, example, or invented URLs are
// forbidden — validateRegistry() throws at server boot if one slips in.
//
// collectionMethod:
//   "auto"   - plain-HTTP discovery was OBSERVED to yield usable
//              recruitment links (do not mark auto on guesswork).
//   "manual" - blocks bots (403), unreachable, JS-rendered, or simply not
//              yet verified for automated discovery. The daily cron SKIPS
//              these (logged); an admin supplies notification URLs explicitly.
// Never bypass CAPTCHA, login, or anti-bot protection.
//
// To add a source: append an entry, probe once with plain HTTP, set the
// method from what you OBSERVED. Nothing else needs code changes.
// Optional `rssUrl`: an official RSS/Atom feed — the daily cron checks it
// FIRST and only falls back to HTML scraping when the feed yields nothing.
// Only set rssUrl to a feed you verified returns recruitment items.

const SOURCES = [
  // ---------- auto: usable recruitment links observed ----------
  { name: 'RBI', fullName: 'Reserve Bank of India (Opportunities)', officialUrl: 'https://www.rbi.org.in', level: 'central', examType: 'banking', state: 'All India', enabled: true, collectionMethod: 'auto' },
  { name: 'India Post', fullName: 'Department of Posts', officialUrl: 'https://www.indiapost.gov.in', level: 'central', examType: 'central', state: 'All India', enabled: true, collectionMethod: 'auto' },
  { name: 'India Post GDS', fullName: 'India Post GDS Online Engagement', officialUrl: 'https://www.indiapost.gov.in/gdsonlineengagement', level: 'central', examType: 'central', state: 'All India', enabled: true, collectionMethod: 'auto' },
  { name: 'UPPSC', fullName: 'Uttar Pradesh Public Service Commission', officialUrl: 'https://uppsc.up.nic.in', level: 'state', examType: 'statepsc', state: 'Uttar Pradesh', enabled: true, collectionMethod: 'auto' },
  { name: 'WBPSC', fullName: 'West Bengal Public Service Commission', officialUrl: 'https://psc.wb.gov.in', level: 'state', examType: 'statepsc', state: 'West Bengal', enabled: true, collectionMethod: 'auto' },
  { name: 'EPFO', fullName: "Employees' Provident Fund Organisation", officialUrl: 'https://www.epfindia.gov.in', level: 'central', examType: 'central', state: 'All India', enabled: true, collectionMethod: 'auto' },

  // ---------- manual: supply notification URLs explicitly ----------
  { name: 'SSC', fullName: 'Staff Selection Commission', officialUrl: 'https://ssc.gov.in', level: 'central', examType: 'ssc', state: 'All India', enabled: true, collectionMethod: 'manual', manualReason: 'JS-rendered homepage exposes no links to plain HTTP fetch.' },
  { name: 'UPSC', fullName: 'Union Public Service Commission', officialUrl: 'https://upsc.gov.in', level: 'central', examType: 'upsc', state: 'All India', enabled: true, collectionMethod: 'manual', manualReason: 'Server returns 403 to automated fetching.' },
  { name: 'RRB', fullName: 'Railway Recruitment Boards', officialUrl: 'https://indianrailways.gov.in', level: 'central', examType: 'railway', state: 'All India', enabled: true, collectionMethod: 'manual', manualReason: 'Not yet verified for plain-HTTP discovery.' },
  { name: 'IBPS', fullName: 'Institute of Banking Personnel Selection', officialUrl: 'https://www.ibps.in', level: 'central', examType: 'banking', state: 'All India', enabled: true, collectionMethod: 'manual', manualReason: 'Host unreachable from server network.' },
  { name: 'SBI', fullName: 'State Bank of India (Careers)', officialUrl: 'https://www.sbi.co.in/web/careers', level: 'central', examType: 'banking', state: 'All India', enabled: true, collectionMethod: 'manual', manualReason: 'Not yet verified for plain-HTTP discovery.' },
  { name: 'BOI', fullName: 'Bank of India (Careers)', officialUrl: 'https://www.bankofindia.bank.in', level: 'central', examType: 'banking', state: 'All India', enabled: true, collectionMethod: 'manual', manualReason: 'Not yet verified for plain-HTTP discovery.' },
  { name: 'IOB', fullName: 'Indian Overseas Bank (Careers)', officialUrl: 'https://www.iob.bank.in', level: 'central', examType: 'banking', state: 'All India', enabled: true, collectionMethod: 'manual', manualReason: 'Not yet verified for plain-HTTP discovery.' },
  { name: 'UIIC', fullName: 'United India Insurance Company', officialUrl: 'https://uiic.co.in', level: 'central', examType: 'psu', state: 'All India', enabled: true, collectionMethod: 'manual', manualReason: 'Not yet verified for plain-HTTP discovery.' },
  { name: 'NIC', fullName: 'National Informatics Centre (Recruitment)', officialUrl: 'https://recruitment.nic.in', level: 'central', examType: 'central', state: 'All India', enabled: true, collectionMethod: 'manual', manualReason: 'Not yet verified for plain-HTTP discovery.' },
  { name: 'PGIMER', fullName: 'Postgraduate Institute of Medical Education and Research', officialUrl: 'https://pgimer.edu.in', level: 'central', examType: 'central', state: 'Chandigarh', enabled: true, collectionMethod: 'manual', manualReason: 'Not yet verified for plain-HTTP discovery.' },
  { name: 'ISRO', fullName: 'Indian Space Research Organisation (Careers)', officialUrl: 'https://www.isro.gov.in', level: 'central', examType: 'central', state: 'All India', enabled: true, collectionMethod: 'manual', manualReason: 'Not yet verified for plain-HTTP discovery.' },
  { name: 'DRDO', fullName: 'Defence Research and Development Organisation', officialUrl: 'https://drdo.gov.in', level: 'central', examType: 'psu', state: 'All India', enabled: true, collectionMethod: 'manual', manualReason: 'Host unreachable from server network.' },
  { name: 'Defence', fullName: 'Indian Army (Join Indian Army)', officialUrl: 'https://joinindianarmy.nic.in', level: 'central', examType: 'defense', state: 'All India', enabled: true, collectionMethod: 'manual', manualReason: 'Not yet verified for plain-HTTP discovery.' },
  { name: 'TNPSC', fullName: 'Tamil Nadu Public Service Commission', officialUrl: 'https://www.tnpsc.gov.in', level: 'state', examType: 'statepsc', state: 'Tamil Nadu', enabled: true, collectionMethod: 'manual', manualReason: 'Not yet verified for plain-HTTP discovery.' },
  { name: 'UPSSSC', fullName: 'UP Subordinate Services Selection Commission', officialUrl: 'https://upsssc.gov.in', level: 'state', examType: 'state', state: 'Uttar Pradesh', enabled: true, collectionMethod: 'manual', manualReason: 'Not yet verified for plain-HTTP discovery.' },
  { name: 'OPSC', fullName: 'Odisha Public Service Commission', officialUrl: 'https://opsc.gov.in', level: 'state', examType: 'statepsc', state: 'Odisha', enabled: true, collectionMethod: 'manual', manualReason: 'Not yet verified for plain-HTTP discovery.' },
  { name: 'ESIC', fullName: 'Employees State Insurance Corporation', officialUrl: 'https://www.esic.gov.in', level: 'central', examType: 'central', state: 'All India', enabled: true, collectionMethod: 'manual', manualReason: 'Host unreachable from server network.' },
  { name: 'KPSC', fullName: 'Karnataka Public Service Commission', officialUrl: 'https://www.kpsc.kar.nic.in', level: 'state', examType: 'statepsc', state: 'Karnataka', enabled: true, collectionMethod: 'manual', manualReason: 'Host unreachable from server network.' },
  { name: 'APPSC', fullName: 'Andhra Pradesh Public Service Commission', officialUrl: 'https://psc.ap.gov.in', level: 'state', examType: 'statepsc', state: 'Andhra Pradesh', enabled: true, collectionMethod: 'manual', manualReason: 'Landing page exposes almost no links to plain HTTP fetch.' },
  { name: 'TSPSC', fullName: 'Telangana State Public Service Commission', officialUrl: 'https://www.tspsc.gov.in', level: 'state', examType: 'statepsc', state: 'Telangana', enabled: true, collectionMethod: 'manual', manualReason: 'Host unreachable from server network.' },
  { name: 'BPSC', fullName: 'Bihar Public Service Commission', officialUrl: 'https://www.bpsc.bih.nic.in', level: 'state', examType: 'statepsc', state: 'Bihar', enabled: true, collectionMethod: 'manual', manualReason: 'Host unreachable from server network.' },
  { name: 'MPSC', fullName: 'Maharashtra Public Service Commission', officialUrl: 'https://mpsc.gov.in', level: 'state', examType: 'statepsc', state: 'Maharashtra', enabled: true, collectionMethod: 'manual', manualReason: 'JS-rendered homepage exposes no links to plain HTTP fetch.' },
  // ---------- aggregator expansion: NCS, Employment News + sectoral ----------
  { name: 'NCS', fullName: 'National Career Service', officialUrl: 'https://www.ncs.gov.in', level: 'central', examType: 'central', state: 'All India', enabled: true, collectionMethod: 'manual', manualReason: 'JS-rendered search exposes no links to plain HTTP fetch.' },
  { name: 'EmploymentNews', fullName: 'Employment News (DPR)', officialUrl: 'https://employmentnews.gov.in', level: 'central', examType: 'central', state: 'All India', enabled: true, collectionMethod: 'manual', manualReason: 'Weekly PDF archive needs explicit issue URLs.' },
  { name: 'CTET', fullName: 'Central Teacher Eligibility Test', officialUrl: 'https://ctet.nic.in', level: 'central', examType: 'teaching', state: 'All India', enabled: true, collectionMethod: 'manual', manualReason: 'Not yet verified for plain-HTTP discovery.' },
  { name: 'AIIMS', fullName: 'AIIMS NORCET Nursing', officialUrl: 'https://www.aiimsexams.ac.in', level: 'central', examType: 'central', state: 'All India', enabled: true, collectionMethod: 'manual', manualReason: 'Not yet verified for plain-HTTP discovery.' },
  { name: 'SupremeCourt', fullName: 'Supreme Court of India (Recruitment)', officialUrl: 'https://www.sci.gov.in', level: 'central', examType: 'central', state: 'All India', enabled: true, collectionMethod: 'manual', manualReason: 'Not yet verified for plain-HTTP discovery.' },
  { name: 'UGC', fullName: 'University Grants Commission (Jobs)', officialUrl: 'https://www.ugc.gov.in', level: 'central', examType: 'teaching', state: 'All India', enabled: true, collectionMethod: 'manual', manualReason: 'Not yet verified for plain-HTTP discovery.' },
  { name: 'NTPC', fullName: 'NTPC Limited (Careers)', officialUrl: 'https://www.ntpc.co.in', level: 'central', examType: 'psu', state: 'All India', enabled: true, collectionMethod: 'manual', manualReason: 'Not yet verified for plain-HTTP discovery.' },
  { name: 'PowerGrid', fullName: 'Power Grid Corporation (Careers)', officialUrl: 'https://www.powergrid.in', level: 'central', examType: 'psu', state: 'All India', enabled: true, collectionMethod: 'manual', manualReason: 'Not yet verified for plain-HTTP discovery.' },
  { name: 'UPSRTC', fullName: 'UP State Road Transport Corporation', officialUrl: 'https://upsrtc.up.gov.in', level: 'state', examType: 'state', state: 'Uttar Pradesh', enabled: true, collectionMethod: 'manual', manualReason: 'Not yet verified for plain-HTTP discovery.' },
  { name: 'MCGM', fullName: 'Brihanmumbai Municipal Corporation', officialUrl: 'https://www.mcgm.gov.in', level: 'state', examType: 'state', state: 'Maharashtra', enabled: true, collectionMethod: 'manual', manualReason: 'Not yet verified for plain-HTTP discovery.' },
];

const PLACEHOLDER_PATTERNS = [
  /example\.(com|org|net)/i,
  /placeholder/i,
  /todo/i,
  /your-?url/i,
  /xxx+/i,
  /^https?:\/\/localhost/i,
  /127\.0\.0\.1/,
];

export const validateRegistry = (sources = SOURCES) => {
  const errors = [];
  const names = new Set();
  for (const s of sources) {
    if (!s.name || !s.officialUrl || !s.collectionMethod) {
      errors.push(`${s.name || '(unnamed)'}: missing name/officialUrl/collectionMethod`);
      continue;
    }
    if (names.has(s.name)) errors.push(`${s.name}: duplicate registry entry`);
    names.add(s.name);
    let url;
    try {
      url = new URL(s.officialUrl);
    } catch {
      errors.push(`${s.name}: officialUrl is not a valid URL: ${s.officialUrl}`);
      continue;
    }
    if (url.protocol !== 'https:') errors.push(`${s.name}: officialUrl must be https: ${s.officialUrl}`);
    if (PLACEHOLDER_PATTERNS.some((re) => re.test(s.officialUrl))) {
      errors.push(`${s.name}: officialUrl looks fake/placeholder: ${s.officialUrl}`);
    }
    if (!['auto', 'manual'].includes(s.collectionMethod)) errors.push(`${s.name}: bad collectionMethod`);
    if (s.collectionMethod === 'manual' && !s.manualReason) errors.push(`${s.name}: manual source needs a manualReason`);
    if (s.rssUrl !== undefined) {
      try {
        const ru = new URL(s.rssUrl);
        if (ru.protocol !== 'https:' && ru.protocol !== 'http:') errors.push(`${s.name}: rssUrl must be http(s): ${s.rssUrl}`);
      } catch {
        errors.push(`${s.name}: rssUrl is not a valid URL: ${s.rssUrl}`);
      }
      if (PLACEHOLDER_PATTERNS.some((re) => re.test(s.rssUrl))) {
        errors.push(`${s.name}: rssUrl looks fake/placeholder: ${s.rssUrl}`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
};

export const assertValidRegistry = () => {
  const { valid, errors } = validateRegistry();
  if (!valid) {
    throw new Error(`Fake/invalid URLs in official source registry:\n- ${errors.join('\n- ')}`);
  }
};

export default SOURCES;
