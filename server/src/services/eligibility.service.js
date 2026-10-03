// Qualification hierarchy: higher number = higher qualification
const QUALIFICATION_RANK = {
  '10th': 1,
  '12th': 2,
  'diploma': 3,
  'graduate': 4,
  'engineering': 4,
  'medical': 4,
  'postgraduate': 5,
  'phd': 6,
};

// Normalizes category keys between user enum ('ex-serviceman') and
// stored relaxation keys ('exServiceman', 'ex_serviceman', ...).
const normalizeCategoryKey = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');

const RELAX_ALIASES = { exserviceman: ['exserviceman', 'exservice', 'esm'] };

const lookupRelaxation = (relaxMap = {}, userCategory) => {
  const norm = normalizeCategoryKey(userCategory);
  for (const [key, val] of Object.entries(relaxMap)) {
    if (normalizeCategoryKey(key) === norm) return val;
    if ((RELAX_ALIASES[norm] || []).includes(normalizeCategoryKey(key))) return val;
  }
  return 0;
};

// Helper to calculate age from DOB
const calculateAge = (dateOfBirth, referenceDate) => {
  const dob = new Date(dateOfBirth);
  const ref = referenceDate ? new Date(referenceDate) : new Date();
  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age--;
  return age;
};

export const checkEligibility = (user, job) => {
  const breakdown = {};
  const reasons = [];
  const warnings = [];
  const missing = [];
  let totalScore = 0;
  let weightSum = 0;

  // 1. Qualification check (weight 40) — level + field + percentage
  const qualWeight = 40;
  weightSum += qualWeight;
  if (!job.eligibility?.qualifications?.length) {
    breakdown.qualification = { met: true, score: 100, details: 'No specific qualification required' };
    totalScore += qualWeight;
    reasons.push('No specific qualification requirement - eligible');
  } else if (!user.qualification?.highest) {
    breakdown.qualification = { met: false, score: 0, details: 'Please complete your profile with qualification' };
    warnings.push('Add your qualification to check eligibility');
    missing.push('qualification');
  } else {
    const userRank = QUALIFICATION_RANK[user.qualification.highest] || 0;
    const requiredLevels = job.eligibility.qualifications.map(q => q.level);
    const requiredRanks = requiredLevels.map(l => QUALIFICATION_RANK[l] || 0);
    const minRequiredRank = Math.min(...requiredRanks);
    const levelMet = userRank >= minRequiredRank;
    const details = [];
    let met = levelMet;
    let score = levelMet ? 100 : Math.round((userRank / minRequiredRank) * 100);
    details.push(levelMet
      ? `Your qualification (${user.qualification.highest}) meets requirement (${requiredLevels.join(' or ')})`
      : `Your qualification (${user.qualification.highest}) does not meet requirement (${requiredLevels.join(' or ')})`);
    // Field of study: required only when the notification names one
    const requiredFields = [...new Set(job.eligibility.qualifications.map(q => q.field).filter(Boolean))];
    if (requiredFields.length && user.qualification.field) {
      const uf = user.qualification.field.toLowerCase();
      const fieldMet = requiredFields.some((f) => {
        const rf = String(f).toLowerCase();
        return uf.includes(rf) || rf.includes(uf);
      });
      if (!fieldMet) {
        met = false;
        score = Math.min(score, 40);
        details.push(`Requires field: ${requiredFields.join(' / ')}, yours: ${user.qualification.field}`);
      } else {
        details.push(`Field matches (${user.qualification.field})`);
      }
    } else if (requiredFields.length) {
      warnings.push(`This post prefers field: ${requiredFields.join(' / ')} — add yours to verify`);
      missing.push('qualification.field');
    }
    // Percentage: fail only when both required and known
    const requiredPerc = Math.max(0, ...job.eligibility.qualifications.map(q => Number(q.percentage) || 0));
    if (requiredPerc > 0) {
      if (user.qualification.percentage !== undefined && user.qualification.percentage !== null && user.qualification.percentage !== '') {
        if (Number(user.qualification.percentage) < requiredPerc) {
          met = false;
          score = Math.min(score, 30);
          details.push(`Requires ${requiredPerc}% but you have ${user.qualification.percentage}%`);
        } else {
          details.push(`Meets ${requiredPerc}% requirement (${user.qualification.percentage}%)`);
        }
      } else {
        warnings.push(`This post requires ${requiredPerc}% — add your percentage to verify`);
        missing.push('qualification.percentage');
      }
    }
    breakdown.qualification = { met, score: Math.max(0, Math.min(score, 100)), details: details.join('. ') };
    if (met) {
      totalScore += qualWeight;
      reasons.push(breakdown.qualification.details);
    } else {
      warnings.push(breakdown.qualification.details);
    }
  }

  // 2. Age check (weight 30)
  const ageWeight = 30;
  weightSum += ageWeight;
  if (!user.dateOfBirth) {
    breakdown.age = { met: false, score: 0, details: 'Please add your date of birth' };
    warnings.push('Add your date of birth to check age eligibility');
    missing.push('dateOfBirth');
  } else if (!job.eligibility?.ageMax) {
    breakdown.age = { met: true, score: 100, details: 'No upper age limit' };
    totalScore += ageWeight;
  } else {
    const referenceDate = job.applicationEndDate || job.examDate || new Date();
    const age = calculateAge(user.dateOfBirth, referenceDate);
    const relaxation = lookupRelaxation(job.eligibility.ageRelaxation, user.category);
    // Also check default relaxation for category
    const effectiveMaxAge = job.eligibility.ageMax + (relaxation || 0);
    const minAge = job.eligibility.ageMin || 18;
    const met = age >= minAge && age <= effectiveMaxAge;
    const score = met ? 100 : age < minAge ? 0 : Math.max(0, 100 - (age - effectiveMaxAge) * 10);
    breakdown.age = {
      met,
      score: Math.max(0, Math.min(score, 100)),
      details: met
        ? `Age ${age} is within limit (${minAge}-${effectiveMaxAge} years${relaxation ? ` with ${relaxation}y relaxation for ${user.category}` : ''})`
        : age < minAge
          ? `Age ${age} is below minimum (${minAge} years)`
          : `Age ${age} exceeds limit (${effectiveMaxAge} years${relaxation ? ` with ${relaxation}y relaxation` : ''})`,
      age,
      effectiveMaxAge,
      relaxation,
    };
    if (met) {
      totalScore += ageWeight;
      reasons.push(breakdown.age.details);
    } else {
      warnings.push(breakdown.age.details);
    }
  }

  // 3. Category check (weight 15) — enforced only when the job restricts categories
  const catWeight = 15;
  weightSum += catWeight;
  const allowed = job.eligibility?.allowedCategories;
  if (Array.isArray(allowed) && allowed.length > 0) {
    const normAllowed = allowed.map(normalizeCategoryKey);
    const met = user.category ? normAllowed.includes(normalizeCategoryKey(user.category)) : false;
    breakdown.category = {
      met,
      score: met ? 100 : 0,
      details: met
        ? `Category ${user.category} is eligible for this post`
        : user.category
          ? `This post is restricted to: ${allowed.join(', ')}`
          : 'Please add your category to check this restricted post',
    };
    if (met) {
      totalScore += catWeight;
      reasons.push(breakdown.category.details);
    } else {
      warnings.push(breakdown.category.details);
      if (!user.category) missing.push('category');
    }
  } else {
    // Open to all categories
    breakdown.category = { met: true, score: 100, details: user.category ? `Category: ${user.category}` : 'No category specified' };
    totalScore += catWeight;
    if (user.category) reasons.push(`Category ${user.category} accepted`);
  }

  // 4. State/Domicile check (weight 15)
  const stateWeight = 15;
  weightSum += stateWeight;
  if (!job.state || job.state === 'All India') {
    breakdown.state = { met: true, score: 100, details: 'All India job - no domicile restriction' };
    totalScore += stateWeight;
    reasons.push('All India job - open to all states');
  } else if (!user.state) {
    breakdown.state = { met: false, score: 50, details: 'Please add your state to verify domicile' };
    totalScore += 7;
    warnings.push(`This job is for ${job.state} domicile`);
  } else if (user.state.toLowerCase() === job.state.toLowerCase()) {
    breakdown.state = { met: true, score: 100, details: `Domicile matches: ${job.state}` };
    totalScore += stateWeight;
    reasons.push(`Domicile matches ${job.state}`);
  } else {
    breakdown.state = { met: false, score: 0, details: `Requires ${job.state} domicile, you are from ${user.state}` };
    warnings.push(breakdown.state.details);
  }

  const score = Math.round((totalScore / weightSum) * 100);
  const checksMet = breakdown.qualification.met && breakdown.age.met && breakdown.category.met && breakdown.state.score > 0;

  // Incomplete profile is NOT ineligibility — caller shows "complete profile" instead
  if (missing.length > 0) {
    return {
      eligible: null,
      incompleteProfile: true,
      missing,
      score,
      breakdown,
      reasons,
      warnings,
    };
  }

  return {
    eligible: checksMet,
    incompleteProfile: false,
    missing: [],
    score,
    breakdown,
    reasons,
    warnings,
  };
};

export const getEligibilityForJobs = (user, jobs) => {
  return jobs.map(job => ({
    job,
    eligibility: checkEligibility(user, job),
  }));
};
