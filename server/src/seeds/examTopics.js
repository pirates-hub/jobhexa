// Exam -> Subject -> Topics mapping with weightage (% within subject), marks & questions.
// Based on official 2025-26 patterns: UPSC, SSC, RRB, IBPS, SBI, NTA, CTET, State, Defence, DRDO, ISRO.
// Slugs must match examTypes.js, subjects.js, topics.js
// Usage: seed.js resolves examSlug/subjectSlug/topicSlug to ObjectIds for ExamTopic model.
export default [
  // ============ 1. UPSC CSE (Prelims GS-I 100Q/200M + CSAT 80Q/200M + Mains 9 papers) ============
  { examSlug: "upsc-cse", subjectSlug: "indian-polity", totalMarks: 40, totalQuestions: 20, topics: [
    { topicSlug: "indian-constitution", weightage: 30 }, { topicSlug: "fundamental-rights", weightage: 20 },
    { topicSlug: "parliament", weightage: 25 }, { topicSlug: "judiciary", weightage: 15 }, { topicSlug: "panchayati-raj", weightage: 10 }]},
  { examSlug: "upsc-cse", subjectSlug: "history", totalMarks: 40, totalQuestions: 20, topics: [
    { topicSlug: "ancient-india", weightage: 20 }, { topicSlug: "medieval-india", weightage: 20 },
    { topicSlug: "modern-india", weightage: 30 }, { topicSlug: "indian-national-movement", weightage: 20 }, { topicSlug: "world-history", weightage: 10 }]},
  { examSlug: "upsc-cse", subjectSlug: "geography", totalMarks: 35, totalQuestions: 17, topics: [
    { topicSlug: "indian-geography", weightage: 35 }, { topicSlug: "world-geography", weightage: 20 },
    { topicSlug: "climatology", weightage: 20 }, { topicSlug: "economic-geography", weightage: 15 }, { topicSlug: "map-reading", weightage: 10 }]},
  { examSlug: "upsc-cse", subjectSlug: "economics", totalMarks: 30, totalQuestions: 15, topics: [
    { topicSlug: "indian-economy-basics", weightage: 30 }, { topicSlug: "banking-finance", weightage: 20 },
    { topicSlug: "budget-fiscal-policy", weightage: 20 }, { topicSlug: "poverty-unemployment", weightage: 15 }, { topicSlug: "international-economics", weightage: 15 }]},
  { examSlug: "upsc-cse", subjectSlug: "general-science", totalMarks: 25, totalQuestions: 12, topics: [
    { topicSlug: "physics", weightage: 20 }, { topicSlug: "chemistry", weightage: 20 }, { topicSlug: "biology", weightage: 25 },
    { topicSlug: "environment", weightage: 25 }, { topicSlug: "space-technology", weightage: 10 }]},
  { examSlug: "upsc-cse", subjectSlug: "general-awareness", totalMarks: 20, totalQuestions: 10, topics: [
    { topicSlug: "current-affairs", weightage: 60 }, { topicSlug: "static-gk", weightage: 20 },
    { topicSlug: "awards-honours", weightage: 5 }, { topicSlug: "books-authors", weightage: 5 }, { topicSlug: "sports", weightage: 10 }]},
  { examSlug: "upsc-cse", subjectSlug: "quantitative-aptitude", totalMarks: 70, totalQuestions: 25, topics: [
    { topicSlug: "percentage", weightage: 15 }, { topicSlug: "profit-and-loss", weightage: 15 },
    { topicSlug: "simple-compound-interest", weightage: 15 }, { topicSlug: "time-and-work", weightage: 25 },
    { topicSlug: "ratio-proportion", weightage: 30, isOptional: true }]},
  { examSlug: "upsc-cse", subjectSlug: "reasoning", totalMarks: 70, totalQuestions: 25, topics: [
    { topicSlug: "analogies", weightage: 10 }, { topicSlug: "coding-decoding", weightage: 20 },
    { topicSlug: "blood-relations", weightage: 20 }, { topicSlug: "syllogisms", weightage: 25 }, { topicSlug: "seating-arrangements", weightage: 25 }]},
  { examSlug: "upsc-cse", subjectSlug: "english-language", totalMarks: 60, totalQuestions: 30, topics: [
    { topicSlug: "reading-comprehension", weightage: 50 }, { topicSlug: "error-spotting", weightage: 10 },
    { topicSlug: "cloze-test", weightage: 10 }, { topicSlug: "vocabulary", weightage: 15 }, { topicSlug: "sentence-correction", weightage: 15 }]},
  { examSlug: "upsc-cse", subjectSlug: "descriptive-writing", totalMarks: 500, totalQuestions: 9, topics: [
    { topicSlug: "essay-writing", weightage: 50 }, { topicSlug: "letter-writing", weightage: 20 }, { topicSlug: "precis-writing", weightage: 30 }]},

  // ============ 2. SSC CGL (Tier-I 100Q/200M: 25 each QA/Reason/Eng/GK) ============
  { examSlug: "ssc-cgl", subjectSlug: "quantitative-aptitude", totalMarks: 50, totalQuestions: 25, topics: [
    { topicSlug: "percentage", weightage: 20 }, { topicSlug: "profit-and-loss", weightage: 20 },
    { topicSlug: "simple-compound-interest", weightage: 20 }, { topicSlug: "time-and-work", weightage: 20 }, { topicSlug: "ratio-proportion", weightage: 20 }]},
  { examSlug: "ssc-cgl", subjectSlug: "reasoning", totalMarks: 50, totalQuestions: 25, topics: [
    { topicSlug: "analogies", weightage: 20 }, { topicSlug: "coding-decoding", weightage: 25 },
    { topicSlug: "blood-relations", weightage: 15 }, { topicSlug: "syllogisms", weightage: 15 }, { topicSlug: "seating-arrangements", weightage: 25 }]},
  { examSlug: "ssc-cgl", subjectSlug: "english-language", totalMarks: 50, totalQuestions: 25, topics: [
    { topicSlug: "reading-comprehension", weightage: 25 }, { topicSlug: "error-spotting", weightage: 25 },
    { topicSlug: "cloze-test", weightage: 15 }, { topicSlug: "vocabulary", weightage: 20 }, { topicSlug: "sentence-correction", weightage: 15 }]},
  { examSlug: "ssc-cgl", subjectSlug: "general-awareness", totalMarks: 50, totalQuestions: 25, topics: [
    { topicSlug: "current-affairs", weightage: 30 }, { topicSlug: "static-gk", weightage: 30 },
    { topicSlug: "awards-honours", weightage: 10 }, { topicSlug: "books-authors", weightage: 10 }, { topicSlug: "sports", weightage: 20 }]},
  { examSlug: "ssc-cgl", subjectSlug: "general-science", totalMarks: 20, totalQuestions: 10, topics: [
    { topicSlug: "physics", weightage: 25 }, { topicSlug: "chemistry", weightage: 25 }, { topicSlug: "biology", weightage: 30 },
    { topicSlug: "environment", weightage: 10 }, { topicSlug: "space-technology", weightage: 10, isOptional: true }]},
  { examSlug: "ssc-cgl", subjectSlug: "computer-knowledge", totalMarks: 60, totalQuestions: 20, topics: [
    { topicSlug: "ms-office", weightage: 25 }, { topicSlug: "internet-networking", weightage: 25 },
    { topicSlug: "computer-hardware", weightage: 15 }, { topicSlug: "computer-software", weightage: 20 }, { topicSlug: "cyber-security", weightage: 15 }]},
  { examSlug: "ssc-cgl", subjectSlug: "statistics", totalMarks: 60, totalQuestions: 20, topics: [
    { topicSlug: "data-interpretation", weightage: 50 }, { topicSlug: "mean-median-mode", weightage: 15 },
    { topicSlug: "probability", weightage: 20 }, { topicSlug: "standard-deviation", weightage: 15 }]},
  { examSlug: "ssc-cgl", subjectSlug: "indian-polity", totalMarks: 20, totalQuestions: 10, topics: [
    { topicSlug: "indian-constitution", weightage: 30 }, { topicSlug: "fundamental-rights", weightage: 25 },
    { topicSlug: "parliament", weightage: 25 }, { topicSlug: "judiciary", weightage: 10 }, { topicSlug: "panchayati-raj", weightage: 10 }]},
  { examSlug: "ssc-cgl", subjectSlug: "history", totalMarks: 15, totalQuestions: 7, topics: [
    { topicSlug: "ancient-india", weightage: 20 }, { topicSlug: "medieval-india", weightage: 20 }, { topicSlug: "modern-india", weightage: 35 },
    { topicSlug: "indian-national-movement", weightage: 15 }, { topicSlug: "world-history", weightage: 10, isOptional: true }]},
  { examSlug: "ssc-cgl", subjectSlug: "geography", totalMarks: 15, totalQuestions: 7, topics: [
    { topicSlug: "indian-geography", weightage: 40 }, { topicSlug: "world-geography", weightage: 20 },
    { topicSlug: "climatology", weightage: 15 }, { topicSlug: "economic-geography", weightage: 15 }, { topicSlug: "map-reading", weightage: 10 }]},
  { examSlug: "ssc-cgl", subjectSlug: "economics", totalMarks: 15, totalQuestions: 7, topics: [
    { topicSlug: "indian-economy-basics", weightage: 35 }, { topicSlug: "banking-finance", weightage: 25 },
    { topicSlug: "budget-fiscal-policy", weightage: 20 }, { topicSlug: "poverty-unemployment", weightage: 10 }, { topicSlug: "international-economics", weightage: 10, isOptional: true }]},

  // ============ 3. SSC CHSL (Tier-I 100Q/200M) ============
  { examSlug: "ssc-chsl", subjectSlug: "quantitative-aptitude", totalMarks: 50, totalQuestions: 25, topics: [
    { topicSlug: "percentage", weightage: 25 }, { topicSlug: "profit-and-loss", weightage: 20 },
    { topicSlug: "simple-compound-interest", weightage: 20 }, { topicSlug: "time-and-work", weightage: 15 }, { topicSlug: "ratio-proportion", weightage: 20 }]},
  { examSlug: "ssc-chsl", subjectSlug: "reasoning", totalMarks: 50, totalQuestions: 25, topics: [
    { topicSlug: "analogies", weightage: 25 }, { topicSlug: "coding-decoding", weightage: 25 },
    { topicSlug: "blood-relations", weightage: 20 }, { topicSlug: "syllogisms", weightage: 15 }, { topicSlug: "seating-arrangements", weightage: 15 }]},
  { examSlug: "ssc-chsl", subjectSlug: "english-language", totalMarks: 50, totalQuestions: 25, topics: [
    { topicSlug: "reading-comprehension", weightage: 20 }, { topicSlug: "error-spotting", weightage: 25 },
    { topicSlug: "cloze-test", weightage: 20 }, { topicSlug: "vocabulary", weightage: 20 }, { topicSlug: "sentence-correction", weightage: 15 }]},
  { examSlug: "ssc-chsl", subjectSlug: "general-awareness", totalMarks: 50, totalQuestions: 25, topics: [
    { topicSlug: "current-affairs", weightage: 35 }, { topicSlug: "static-gk", weightage: 30 },
    { topicSlug: "awards-honours", weightage: 10 }, { topicSlug: "books-authors", weightage: 10 }, { topicSlug: "sports", weightage: 15 }]},
  { examSlug: "ssc-chsl", subjectSlug: "general-science", totalMarks: 15, totalQuestions: 8, topics: [
    { topicSlug: "physics", weightage: 25 }, { topicSlug: "chemistry", weightage: 25 }, { topicSlug: "biology", weightage: 30 },
    { topicSlug: "environment", weightage: 10 }, { topicSlug: "space-technology", weightage: 10, isOptional: true }]},
  { examSlug: "ssc-chsl", subjectSlug: "computer-knowledge", totalMarks: 30, totalQuestions: 15, topics: [
    { topicSlug: "ms-office", weightage: 30 }, { topicSlug: "internet-networking", weightage: 25 },
    { topicSlug: "computer-hardware", weightage: 15 }, { topicSlug: "computer-software", weightage: 20 }, { topicSlug: "cyber-security", weightage: 10 }]},
  { examSlug: "ssc-chsl", subjectSlug: "descriptive-writing", totalMarks: 100, totalQuestions: 2, topics: [
    { topicSlug: "essay-writing", weightage: 50 }, { topicSlug: "letter-writing", weightage: 35 }, { topicSlug: "precis-writing", weightage: 15 }]},
  { examSlug: "ssc-chsl", subjectSlug: "hindi-language", totalMarks: 25, totalQuestions: 12, topics: [
    { topicSlug: "hindi-grammar", weightage: 50 }, { topicSlug: "hindi-comprehension", weightage: 30 }, { topicSlug: "hindi-vocabulary", weightage: 20, isOptional: true }]},

  // ============ 4. SSC MTS (Session-1 QA+Reason 40Q no-neg, Session-2 Eng+GK 50Q) ============
  { examSlug: "ssc-mts", subjectSlug: "quantitative-aptitude", totalMarks: 60, totalQuestions: 20, topics: [
    { topicSlug: "percentage", weightage: 25 }, { topicSlug: "profit-and-loss", weightage: 25 },
    { topicSlug: "simple-compound-interest", weightage: 15 }, { topicSlug: "time-and-work", weightage: 15 }, { topicSlug: "ratio-proportion", weightage: 20 }]},
  { examSlug: "ssc-mts", subjectSlug: "reasoning", totalMarks: 60, totalQuestions: 20, topics: [
    { topicSlug: "analogies", weightage: 30 }, { topicSlug: "coding-decoding", weightage: 30 },
    { topicSlug: "blood-relations", weightage: 20 }, { topicSlug: "syllogisms", weightage: 10 }, { topicSlug: "seating-arrangements", weightage: 10, isOptional: true }]},
  { examSlug: "ssc-mts", subjectSlug: "english-language", totalMarks: 75, totalQuestions: 25, topics: [
    { topicSlug: "reading-comprehension", weightage: 20 }, { topicSlug: "error-spotting", weightage: 20 },
    { topicSlug: "cloze-test", weightage: 15 }, { topicSlug: "vocabulary", weightage: 30 }, { topicSlug: "sentence-correction", weightage: 15 }]},
  { examSlug: "ssc-mts", subjectSlug: "general-awareness", totalMarks: 75, totalQuestions: 25, topics: [
    { topicSlug: "current-affairs", weightage: 40 }, { topicSlug: "static-gk", weightage: 35 },
    { topicSlug: "awards-honours", weightage: 5 }, { topicSlug: "books-authors", weightage: 5 }, { topicSlug: "sports", weightage: 15 }]},
  { examSlug: "ssc-mts", subjectSlug: "general-science", totalMarks: 20, totalQuestions: 8, topics: [
    { topicSlug: "physics", weightage: 25 }, { topicSlug: "chemistry", weightage: 25 }, { topicSlug: "biology", weightage: 30 },
    { topicSlug: "environment", weightage: 10 }, { topicSlug: "space-technology", weightage: 10, isOptional: true }]},
  { examSlug: "ssc-mts", subjectSlug: "hindi-language", totalMarks: 25, totalQuestions: 10, topics: [
    { topicSlug: "hindi-grammar", weightage: 50 }, { topicSlug: "hindi-comprehension", weightage: 30 }, { topicSlug: "hindi-vocabulary", weightage: 20, isOptional: true }]},

  // ============ 5. SSC CPO (Paper-I 200Q/200M: 50 each) ============
  { examSlug: "ssc-cpo", subjectSlug: "quantitative-aptitude", totalMarks: 50, totalQuestions: 50, topics: [
    { topicSlug: "percentage", weightage: 20 }, { topicSlug: "profit-and-loss", weightage: 20 },
    { topicSlug: "simple-compound-interest", weightage: 15 }, { topicSlug: "time-and-work", weightage: 25 }, { topicSlug: "ratio-proportion", weightage: 20 }]},
  { examSlug: "ssc-cpo", subjectSlug: "reasoning", totalMarks: 50, totalQuestions: 50, topics: [
    { topicSlug: "analogies", weightage: 20 }, { topicSlug: "coding-decoding", weightage: 20 },
    { topicSlug: "blood-relations", weightage: 15 }, { topicSlug: "syllogisms", weightage: 20 }, { topicSlug: "seating-arrangements", weightage: 25 }]},
  { examSlug: "ssc-cpo", subjectSlug: "english-language", totalMarks: 250, totalQuestions: 250, topics: [
    { topicSlug: "reading-comprehension", weightage: 30 }, { topicSlug: "error-spotting", weightage: 25 },
    { topicSlug: "cloze-test", weightage: 15 }, { topicSlug: "vocabulary", weightage: 15 }, { topicSlug: "sentence-correction", weightage: 15 }]},
  { examSlug: "ssc-cpo", subjectSlug: "general-awareness", totalMarks: 50, totalQuestions: 50, topics: [
    { topicSlug: "current-affairs", weightage: 30 }, { topicSlug: "static-gk", weightage: 30 },
    { topicSlug: "awards-honours", weightage: 10 }, { topicSlug: "books-authors", weightage: 10 }, { topicSlug: "sports", weightage: 20 }]},
  { examSlug: "ssc-cpo", subjectSlug: "general-science", totalMarks: 15, totalQuestions: 15, topics: [
    { topicSlug: "physics", weightage: 25 }, { topicSlug: "chemistry", weightage: 25 }, { topicSlug: "biology", weightage: 30 },
    { topicSlug: "environment", weightage: 10 }, { topicSlug: "space-technology", weightage: 10, isOptional: true }]},
  { examSlug: "ssc-cpo", subjectSlug: "indian-polity", totalMarks: 15, totalQuestions: 15, topics: [
    { topicSlug: "indian-constitution", weightage: 30 }, { topicSlug: "fundamental-rights", weightage: 25 },
    { topicSlug: "parliament", weightage: 20 }, { topicSlug: "judiciary", weightage: 15 }, { topicSlug: "panchayati-raj", weightage: 10 }]},

  // ============ 6. RRB NTPC (CBT-1 100Q, CBT-2 120Q) ============
  { examSlug: "rrb-ntpc", subjectSlug: "quantitative-aptitude", totalMarks: 35, totalQuestions: 35, topics: [
    { topicSlug: "percentage", weightage: 20 }, { topicSlug: "profit-and-loss", weightage: 20 },
    { topicSlug: "simple-compound-interest", weightage: 20 }, { topicSlug: "time-and-work", weightage: 20 }, { topicSlug: "ratio-proportion", weightage: 20 }]},
  { examSlug: "rrb-ntpc", subjectSlug: "reasoning", totalMarks: 35, totalQuestions: 35, topics: [
    { topicSlug: "analogies", weightage: 25 }, { topicSlug: "coding-decoding", weightage: 25 },
    { topicSlug: "blood-relations", weightage: 15 }, { topicSlug: "syllogisms", weightage: 15 }, { topicSlug: "seating-arrangements", weightage: 20 }]},
  { examSlug: "rrb-ntpc", subjectSlug: "general-awareness", totalMarks: 50, totalQuestions: 50, topics: [
    { topicSlug: "current-affairs", weightage: 40 }, { topicSlug: "static-gk", weightage: 30 },
    { topicSlug: "awards-honours", weightage: 10 }, { topicSlug: "books-authors", weightage: 5 }, { topicSlug: "sports", weightage: 15 }]},
  { examSlug: "rrb-ntpc", subjectSlug: "general-science", totalMarks: 20, totalQuestions: 20, topics: [
    { topicSlug: "physics", weightage: 25 }, { topicSlug: "chemistry", weightage: 25 }, { topicSlug: "biology", weightage: 30 },
    { topicSlug: "environment", weightage: 10 }, { topicSlug: "space-technology", weightage: 10 }]},
  { examSlug: "rrb-ntpc", subjectSlug: "history", totalMarks: 15, totalQuestions: 15, topics: [
    { topicSlug: "ancient-india", weightage: 20 }, { topicSlug: "medieval-india", weightage: 20 },
    { topicSlug: "modern-india", weightage: 35 }, { topicSlug: "indian-national-movement", weightage: 15 }, { topicSlug: "world-history", weightage: 10, isOptional: true }]},
  { examSlug: "rrb-ntpc", subjectSlug: "geography", totalMarks: 15, totalQuestions: 15, topics: [
    { topicSlug: "indian-geography", weightage: 40 }, { topicSlug: "world-geography", weightage: 20 },
    { topicSlug: "climatology", weightage: 15 }, { topicSlug: "economic-geography", weightage: 15 }, { topicSlug: "map-reading", weightage: 10 }]},
  { examSlug: "rrb-ntpc", subjectSlug: "indian-polity", totalMarks: 15, totalQuestions: 15, topics: [
    { topicSlug: "indian-constitution", weightage: 30 }, { topicSlug: "fundamental-rights", weightage: 25 },
    { topicSlug: "parliament", weightage: 25 }, { topicSlug: "judiciary", weightage: 10 }, { topicSlug: "panchayati-raj", weightage: 10 }]},
  { examSlug: "rrb-ntpc", subjectSlug: "economics", totalMarks: 10, totalQuestions: 10, topics: [
    { topicSlug: "indian-economy-basics", weightage: 40 }, { topicSlug: "banking-finance", weightage: 20 },
    { topicSlug: "budget-fiscal-policy", weightage: 20 }, { topicSlug: "poverty-unemployment", weightage: 10 }, { topicSlug: "international-economics", weightage: 10, isOptional: true }]},

  // ============ 7. RRB Group D (100Q: QA25/Reason30/GS25/GK20) ============
  { examSlug: "rrb-group-d", subjectSlug: "quantitative-aptitude", totalMarks: 25, totalQuestions: 25, topics: [
    { topicSlug: "percentage", weightage: 25 }, { topicSlug: "profit-and-loss", weightage: 20 },
    { topicSlug: "simple-compound-interest", weightage: 15 }, { topicSlug: "time-and-work", weightage: 20 }, { topicSlug: "ratio-proportion", weightage: 20 }]},
  { examSlug: "rrb-group-d", subjectSlug: "reasoning", totalMarks: 30, totalQuestions: 30, topics: [
    { topicSlug: "analogies", weightage: 30 }, { topicSlug: "coding-decoding", weightage: 30 },
    { topicSlug: "blood-relations", weightage: 15 }, { topicSlug: "syllogisms", weightage: 10 }, { topicSlug: "seating-arrangements", weightage: 15 }]},
  { examSlug: "rrb-group-d", subjectSlug: "general-science", totalMarks: 25, totalQuestions: 25, topics: [
    { topicSlug: "physics", weightage: 30 }, { topicSlug: "chemistry", weightage: 30 }, { topicSlug: "biology", weightage: 25 },
    { topicSlug: "environment", weightage: 10 }, { topicSlug: "space-technology", weightage: 5, isOptional: true }]},
  { examSlug: "rrb-group-d", subjectSlug: "general-awareness", totalMarks: 20, totalQuestions: 20, topics: [
    { topicSlug: "current-affairs", weightage: 45 }, { topicSlug: "static-gk", weightage: 30 },
    { topicSlug: "awards-honours", weightage: 5 }, { topicSlug: "books-authors", weightage: 5 }, { topicSlug: "sports", weightage: 15 }]},

  // ============ 8. IBPS PO (Pre 100Q/100M + Mains 155Q + Descriptive) ============
  { examSlug: "ibps-po", subjectSlug: "quantitative-aptitude", totalMarks: 50, totalQuestions: 50, topics: [
    { topicSlug: "percentage", weightage: 15 }, { topicSlug: "profit-and-loss", weightage: 15 },
    { topicSlug: "simple-compound-interest", weightage: 15 }, { topicSlug: "time-and-work", weightage: 25 }, { topicSlug: "ratio-proportion", weightage: 30 }]},
  { examSlug: "ibps-po", subjectSlug: "reasoning", totalMarks: 60, totalQuestions: 55, topics: [
    { topicSlug: "analogies", weightage: 10 }, { topicSlug: "coding-decoding", weightage: 15 },
    { topicSlug: "blood-relations", weightage: 15 }, { topicSlug: "syllogisms", weightage: 20 }, { topicSlug: "seating-arrangements", weightage: 40 }]},
  { examSlug: "ibps-po", subjectSlug: "english-language", totalMarks: 65, totalQuestions: 65, topics: [
    { topicSlug: "reading-comprehension", weightage: 40 }, { topicSlug: "error-spotting", weightage: 15 },
    { topicSlug: "cloze-test", weightage: 15 }, { topicSlug: "vocabulary", weightage: 15 }, { topicSlug: "sentence-correction", weightage: 15 }]},
  { examSlug: "ibps-po", subjectSlug: "general-awareness", totalMarks: 40, totalQuestions: 40, topics: [
    { topicSlug: "current-affairs", weightage: 60 }, { topicSlug: "static-gk", weightage: 15 },
    { topicSlug: "awards-honours", weightage: 5 }, { topicSlug: "books-authors", weightage: 5 }, { topicSlug: "sports", weightage: 15 }]},
  { examSlug: "ibps-po", subjectSlug: "economics", totalMarks: 25, totalQuestions: 25, topics: [
    { topicSlug: "indian-economy-basics", weightage: 20 }, { topicSlug: "banking-finance", weightage: 50 },
    { topicSlug: "budget-fiscal-policy", weightage: 15 }, { topicSlug: "poverty-unemployment", weightage: 5 }, { topicSlug: "international-economics", weightage: 10 }]},
  { examSlug: "ibps-po", subjectSlug: "computer-knowledge", totalMarks: 20, totalQuestions: 20, topics: [
    { topicSlug: "ms-office", weightage: 20 }, { topicSlug: "internet-networking", weightage: 30 },
    { topicSlug: "computer-hardware", weightage: 15 }, { topicSlug: "computer-software", weightage: 20 }, { topicSlug: "cyber-security", weightage: 15 }]},
  { examSlug: "ibps-po", subjectSlug: "statistics", totalMarks: 30, totalQuestions: 20, topics: [
    { topicSlug: "data-interpretation", weightage: 70 }, { topicSlug: "mean-median-mode", weightage: 5 },
    { topicSlug: "probability", weightage: 15 }, { topicSlug: "standard-deviation", weightage: 10, isOptional: true }]},
  { examSlug: "ibps-po", subjectSlug: "descriptive-writing", totalMarks: 25, totalQuestions: 2, topics: [
    { topicSlug: "essay-writing", weightage: 50 }, { topicSlug: "letter-writing", weightage: 40 }, { topicSlug: "precis-writing", weightage: 10 }]},

  // ============ 9. IBPS Clerk (Pre 100Q + Mains 190Q/200M) ============
  { examSlug: "ibps-clerk", subjectSlug: "quantitative-aptitude", totalMarks: 50, totalQuestions: 50, topics: [
    { topicSlug: "percentage", weightage: 20 }, { topicSlug: "profit-and-loss", weightage: 20 },
    { topicSlug: "simple-compound-interest", weightage: 20 }, { topicSlug: "time-and-work", weightage: 20 }, { topicSlug: "ratio-proportion", weightage: 20 }]},
  { examSlug: "ibps-clerk", subjectSlug: "reasoning", totalMarks: 50, totalQuestions: 50, topics: [
    { topicSlug: "analogies", weightage: 15 }, { topicSlug: "coding-decoding", weightage: 20 },
    { topicSlug: "blood-relations", weightage: 15 }, { topicSlug: "syllogisms", weightage: 20 }, { topicSlug: "seating-arrangements", weightage: 30 }]},
  { examSlug: "ibps-clerk", subjectSlug: "english-language", totalMarks: 40, totalQuestions: 40, topics: [
    { topicSlug: "reading-comprehension", weightage: 35 }, { topicSlug: "error-spotting", weightage: 20 },
    { topicSlug: "cloze-test", weightage: 15 }, { topicSlug: "vocabulary", weightage: 15 }, { topicSlug: "sentence-correction", weightage: 15 }]},
  { examSlug: "ibps-clerk", subjectSlug: "general-awareness", totalMarks: 50, totalQuestions: 50, topics: [
    { topicSlug: "current-affairs", weightage: 55 }, { topicSlug: "static-gk", weightage: 20 },
    { topicSlug: "awards-honours", weightage: 5 }, { topicSlug: "books-authors", weightage: 5 }, { topicSlug: "sports", weightage: 15 }]},
  { examSlug: "ibps-clerk", subjectSlug: "economics", totalMarks: 20, totalQuestions: 20, topics: [
    { topicSlug: "indian-economy-basics", weightage: 20 }, { topicSlug: "banking-finance", weightage: 55 },
    { topicSlug: "budget-fiscal-policy", weightage: 10 }, { topicSlug: "poverty-unemployment", weightage: 5 }, { topicSlug: "international-economics", weightage: 10, isOptional: true }]},
  { examSlug: "ibps-clerk", subjectSlug: "computer-knowledge", totalMarks: 25, totalQuestions: 25, topics: [
    { topicSlug: "ms-office", weightage: 25 }, { topicSlug: "internet-networking", weightage: 25 },
    { topicSlug: "computer-hardware", weightage: 15 }, { topicSlug: "computer-software", weightage: 20 }, { topicSlug: "cyber-security", weightage: 15 }]},
  { examSlug: "ibps-clerk", subjectSlug: "statistics", totalMarks: 20, totalQuestions: 15, topics: [
    { topicSlug: "data-interpretation", weightage: 70 }, { topicSlug: "mean-median-mode", weightage: 10 },
    { topicSlug: "probability", weightage: 10 }, { topicSlug: "standard-deviation", weightage: 10, isOptional: true }]},

  // ============ 10. SBI PO (Pre 100Q + Mains 135Q/200M + Descriptive 50M) ============
  { examSlug: "sbi-po", subjectSlug: "quantitative-aptitude", totalMarks: 50, totalQuestions: 50, topics: [
    { topicSlug: "percentage", weightage: 15 }, { topicSlug: "profit-and-loss", weightage: 15 },
    { topicSlug: "simple-compound-interest", weightage: 15 }, { topicSlug: "time-and-work", weightage: 25 }, { topicSlug: "ratio-proportion", weightage: 30 }]},
  { examSlug: "sbi-po", subjectSlug: "reasoning", totalMarks: 60, totalQuestions: 55, topics: [
    { topicSlug: "analogies", weightage: 10 }, { topicSlug: "coding-decoding", weightage: 15 },
    { topicSlug: "blood-relations", weightage: 15 }, { topicSlug: "syllogisms", weightage: 20 }, { topicSlug: "seating-arrangements", weightage: 40 }]},
  { examSlug: "sbi-po", subjectSlug: "english-language", totalMarks: 65, totalQuestions: 65, topics: [
    { topicSlug: "reading-comprehension", weightage: 40 }, { topicSlug: "error-spotting", weightage: 15 },
    { topicSlug: "cloze-test", weightage: 15 }, { topicSlug: "vocabulary", weightage: 15 }, { topicSlug: "sentence-correction", weightage: 15 }]},
  { examSlug: "sbi-po", subjectSlug: "general-awareness", totalMarks: 60, totalQuestions: 60, topics: [
    { topicSlug: "current-affairs", weightage: 60 }, { topicSlug: "static-gk", weightage: 15 },
    { topicSlug: "awards-honours", weightage: 5 }, { topicSlug: "books-authors", weightage: 5 }, { topicSlug: "sports", weightage: 15 }]},
  { examSlug: "sbi-po", subjectSlug: "economics", totalMarks: 30, totalQuestions: 30, topics: [
    { topicSlug: "indian-economy-basics", weightage: 20 }, { topicSlug: "banking-finance", weightage: 55 },
    { topicSlug: "budget-fiscal-policy", weightage: 10 }, { topicSlug: "poverty-unemployment", weightage: 5 }, { topicSlug: "international-economics", weightage: 10 }]},
  { examSlug: "sbi-po", subjectSlug: "computer-knowledge", totalMarks: 20, totalQuestions: 20, topics: [
    { topicSlug: "ms-office", weightage: 20 }, { topicSlug: "internet-networking", weightage: 30 },
    { topicSlug: "computer-hardware", weightage: 15 }, { topicSlug: "computer-software", weightage: 20 }, { topicSlug: "cyber-security", weightage: 15 }]},
  { examSlug: "sbi-po", subjectSlug: "statistics", totalMarks: 30, totalQuestions: 20, topics: [
    { topicSlug: "data-interpretation", weightage: 75 }, { topicSlug: "mean-median-mode", weightage: 5 },
    { topicSlug: "probability", weightage: 10 }, { topicSlug: "standard-deviation", weightage: 10, isOptional: true }]},
  { examSlug: "sbi-po", subjectSlug: "descriptive-writing", totalMarks: 50, totalQuestions: 2, topics: [
    { topicSlug: "essay-writing", weightage: 60 }, { topicSlug: "letter-writing", weightage: 30 }, { topicSlug: "precis-writing", weightage: 10 }]},

  // ============ 11. SBI Clerk (Pre 100Q + Mains 190Q/200M) ============
  { examSlug: "sbi-clerk", subjectSlug: "quantitative-aptitude", totalMarks: 50, totalQuestions: 50, topics: [
    { topicSlug: "percentage", weightage: 20 }, { topicSlug: "profit-and-loss", weightage: 20 },
    { topicSlug: "simple-compound-interest", weightage: 20 }, { topicSlug: "time-and-work", weightage: 20 }, { topicSlug: "ratio-proportion", weightage: 20 }]},
  { examSlug: "sbi-clerk", subjectSlug: "reasoning", totalMarks: 50, totalQuestions: 50, topics: [
    { topicSlug: "analogies", weightage: 15 }, { topicSlug: "coding-decoding", weightage: 20 },
    { topicSlug: "blood-relations", weightage: 15 }, { topicSlug: "syllogisms", weightage: 20 }, { topicSlug: "seating-arrangements", weightage: 30 }]},
  { examSlug: "sbi-clerk", subjectSlug: "english-language", totalMarks: 40, totalQuestions: 40, topics: [
    { topicSlug: "reading-comprehension", weightage: 35 }, { topicSlug: "error-spotting", weightage: 20 },
    { topicSlug: "cloze-test", weightage: 15 }, { topicSlug: "vocabulary", weightage: 15 }, { topicSlug: "sentence-correction", weightage: 15 }]},
  { examSlug: "sbi-clerk", subjectSlug: "general-awareness", totalMarks: 50, totalQuestions: 50, topics: [
    { topicSlug: "current-affairs", weightage: 55 }, { topicSlug: "static-gk", weightage: 20 },
    { topicSlug: "awards-honours", weightage: 5 }, { topicSlug: "books-authors", weightage: 5 }, { topicSlug: "sports", weightage: 15 }]},
  { examSlug: "sbi-clerk", subjectSlug: "economics", totalMarks: 20, totalQuestions: 20, topics: [
    { topicSlug: "indian-economy-basics", weightage: 20 }, { topicSlug: "banking-finance", weightage: 55 },
    { topicSlug: "budget-fiscal-policy", weightage: 10 }, { topicSlug: "poverty-unemployment", weightage: 5 }, { topicSlug: "international-economics", weightage: 10, isOptional: true }]},
  { examSlug: "sbi-clerk", subjectSlug: "computer-knowledge", totalMarks: 25, totalQuestions: 25, topics: [
    { topicSlug: "ms-office", weightage: 25 }, { topicSlug: "internet-networking", weightage: 25 },
    { topicSlug: "computer-hardware", weightage: 15 }, { topicSlug: "computer-software", weightage: 20 }, { topicSlug: "cyber-security", weightage: 15 }]},

  // ============ 12. NTA UGC NET (Paper-I 50Q/100M + Paper-II 100Q/200M) ============
  { examSlug: "nta-ugc-net", subjectSlug: "reasoning", totalMarks: 40, totalQuestions: 20, topics: [
    { topicSlug: "analogies", weightage: 20 }, { topicSlug: "coding-decoding", weightage: 20 },
    { topicSlug: "blood-relations", weightage: 15 }, { topicSlug: "syllogisms", weightage: 25 }, { topicSlug: "seating-arrangements", weightage: 20 }]},
  { examSlug: "nta-ugc-net", subjectSlug: "english-language", totalMarks: 30, totalQuestions: 15, topics: [
    { topicSlug: "reading-comprehension", weightage: 50 }, { topicSlug: "error-spotting", weightage: 10 },
    { topicSlug: "cloze-test", weightage: 10 }, { topicSlug: "vocabulary", weightage: 15 }, { topicSlug: "sentence-correction", weightage: 15 }]},
  { examSlug: "nta-ugc-net", subjectSlug: "statistics", totalMarks: 40, totalQuestions: 20, topics: [
    { topicSlug: "data-interpretation", weightage: 50 }, { topicSlug: "mean-median-mode", weightage: 20 },
    { topicSlug: "probability", weightage: 15 }, { topicSlug: "standard-deviation", weightage: 15 }]},
  { examSlug: "nta-ugc-net", subjectSlug: "computer-knowledge", totalMarks: 30, totalQuestions: 15, topics: [
    { topicSlug: "ms-office", weightage: 20 }, { topicSlug: "internet-networking", weightage: 35 },
    { topicSlug: "computer-hardware", weightage: 10 }, { topicSlug: "computer-software", weightage: 20 }, { topicSlug: "cyber-security", weightage: 15 }]},
  { examSlug: "nta-ugc-net", subjectSlug: "general-awareness", totalMarks: 40, totalQuestions: 20, topics: [
    { topicSlug: "current-affairs", weightage: 40 }, { topicSlug: "static-gk", weightage: 30 },
    { topicSlug: "awards-honours", weightage: 10 }, { topicSlug: "books-authors", weightage: 10 }, { topicSlug: "sports", weightage: 10 }]},
  { examSlug: "nta-ugc-net", subjectSlug: "technical-knowledge", totalMarks: 200, totalQuestions: 100, topics: [
    { topicSlug: "cs-fundamentals", weightage: 40 }, { topicSlug: "ec-basics", weightage: 15, isOptional: true },
    { topicSlug: "ee-basics", weightage: 15, isOptional: true }, { topicSlug: "me-basics", weightage: 15, isOptional: true }, { topicSlug: "ce-basics", weightage: 15, isOptional: true }]},
  { examSlug: "nta-ugc-net", subjectSlug: "descriptive-writing", totalMarks: 30, totalQuestions: 10, topics: [
    { topicSlug: "essay-writing", weightage: 40 }, { topicSlug: "letter-writing", weightage: 20 }, { topicSlug: "precis-writing", weightage: 40 }]},

  // ============ 13. CTET (Paper-I/II 150Q/150M) ============
  { examSlug: "ctet", subjectSlug: "reasoning", totalMarks: 30, totalQuestions: 30, topics: [
    { topicSlug: "analogies", weightage: 20 }, { topicSlug: "coding-decoding", weightage: 20 },
    { topicSlug: "blood-relations", weightage: 20 }, { topicSlug: "syllogisms", weightage: 20 }, { topicSlug: "seating-arrangements", weightage: 20 }]},
  { examSlug: "ctet", subjectSlug: "english-language", totalMarks: 30, totalQuestions: 30, topics: [
    { topicSlug: "reading-comprehension", weightage: 50 }, { topicSlug: "error-spotting", weightage: 10 },
    { topicSlug: "cloze-test", weightage: 10 }, { topicSlug: "vocabulary", weightage: 20 }, { topicSlug: "sentence-correction", weightage: 10 }]},
  { examSlug: "ctet", subjectSlug: "hindi-language", totalMarks: 30, totalQuestions: 30, topics: [
    { topicSlug: "hindi-grammar", weightage: 50 }, { topicSlug: "hindi-comprehension", weightage: 30 }, { topicSlug: "hindi-vocabulary", weightage: 20 }]},
  { examSlug: "ctet", subjectSlug: "quantitative-aptitude", totalMarks: 30, totalQuestions: 30, topics: [
    { topicSlug: "percentage", weightage: 25 }, { topicSlug: "profit-and-loss", weightage: 15 },
    { topicSlug: "simple-compound-interest", weightage: 15 }, { topicSlug: "time-and-work", weightage: 20 }, { topicSlug: "ratio-proportion", weightage: 25 }]},
  { examSlug: "ctet", subjectSlug: "general-science", totalMarks: 30, totalQuestions: 30, topics: [
    { topicSlug: "physics", weightage: 20 }, { topicSlug: "chemistry", weightage: 20 }, { topicSlug: "biology", weightage: 30 },
    { topicSlug: "environment", weightage: 20 }, { topicSlug: "space-technology", weightage: 10 }]},
  { examSlug: "ctet", subjectSlug: "general-awareness", totalMarks: 20, totalQuestions: 20, topics: [
    { topicSlug: "current-affairs", weightage: 40 }, { topicSlug: "static-gk", weightage: 30 },
    { topicSlug: "awards-honours", weightage: 10 }, { topicSlug: "books-authors", weightage: 10 }, { topicSlug: "sports", weightage: 10 }]},

  // ============ 14. State PSC (Prelims GS 100-150Q + Mains Descriptive) ============
  { examSlug: "state-psc", subjectSlug: "indian-polity", totalMarks: 40, totalQuestions: 20, topics: [
    { topicSlug: "indian-constitution", weightage: 30 }, { topicSlug: "fundamental-rights", weightage: 20 },
    { topicSlug: "parliament", weightage: 25 }, { topicSlug: "judiciary", weightage: 15 }, { topicSlug: "panchayati-raj", weightage: 10 }]},
  { examSlug: "state-psc", subjectSlug: "history", totalMarks: 40, totalQuestions: 20, topics: [
    { topicSlug: "ancient-india", weightage: 20 }, { topicSlug: "medieval-india", weightage: 20 },
    { topicSlug: "modern-india", weightage: 30 }, { topicSlug: "indian-national-movement", weightage: 20 }, { topicSlug: "world-history", weightage: 10 }]},
  { examSlug: "state-psc", subjectSlug: "geography", totalMarks: 35, totalQuestions: 17, topics: [
    { topicSlug: "indian-geography", weightage: 40 }, { topicSlug: "world-geography", weightage: 15 },
    { topicSlug: "climatology", weightage: 15 }, { topicSlug: "economic-geography", weightage: 20 }, { topicSlug: "map-reading", weightage: 10 }]},
  { examSlug: "state-psc", subjectSlug: "economics", totalMarks: 30, totalQuestions: 15, topics: [
    { topicSlug: "indian-economy-basics", weightage: 30 }, { topicSlug: "banking-finance", weightage: 20 },
    { topicSlug: "budget-fiscal-policy", weightage: 20 }, { topicSlug: "poverty-unemployment", weightage: 15 }, { topicSlug: "international-economics", weightage: 15 }]},
  { examSlug: "state-psc", subjectSlug: "general-science", totalMarks: 25, totalQuestions: 12, topics: [
    { topicSlug: "physics", weightage: 20 }, { topicSlug: "chemistry", weightage: 20 }, { topicSlug: "biology", weightage: 25 },
    { topicSlug: "environment", weightage: 25 }, { topicSlug: "space-technology", weightage: 10 }]},
  { examSlug: "state-psc", subjectSlug: "general-awareness", totalMarks: 30, totalQuestions: 15, topics: [
    { topicSlug: "current-affairs", weightage: 55 }, { topicSlug: "static-gk", weightage: 25 },
    { topicSlug: "awards-honours", weightage: 5 }, { topicSlug: "books-authors", weightage: 5 }, { topicSlug: "sports", weightage: 10 }]},
  { examSlug: "state-psc", subjectSlug: "quantitative-aptitude", totalMarks: 35, totalQuestions: 15, topics: [
    { topicSlug: "percentage", weightage: 20 }, { topicSlug: "profit-and-loss", weightage: 20 },
    { topicSlug: "simple-compound-interest", weightage: 20 }, { topicSlug: "time-and-work", weightage: 20 }, { topicSlug: "ratio-proportion", weightage: 20 }]},
  { examSlug: "state-psc", subjectSlug: "reasoning", totalMarks: 35, totalQuestions: 15, topics: [
    { topicSlug: "analogies", weightage: 20 }, { topicSlug: "coding-decoding", weightage: 25 },
    { topicSlug: "blood-relations", weightage: 20 }, { topicSlug: "syllogisms", weightage: 15 }, { topicSlug: "seating-arrangements", weightage: 20 }]},
  { examSlug: "state-psc", subjectSlug: "hindi-language", totalMarks: 30, totalQuestions: 15, topics: [
    { topicSlug: "hindi-grammar", weightage: 50 }, { topicSlug: "hindi-comprehension", weightage: 30 }, { topicSlug: "hindi-vocabulary", weightage: 20 }]},
  { examSlug: "state-psc", subjectSlug: "descriptive-writing", totalMarks: 300, totalQuestions: 6, topics: [
    { topicSlug: "essay-writing", weightage: 50 }, { topicSlug: "letter-writing", weightage: 20 }, { topicSlug: "precis-writing", weightage: 30 }]},

  // ============ 15. State Police (Constable/SI: QA/Reason/GK/GS/Hindi) ============
  { examSlug: "state-police", subjectSlug: "quantitative-aptitude", totalMarks: 40, totalQuestions: 40, topics: [
    { topicSlug: "percentage", weightage: 25 }, { topicSlug: "profit-and-loss", weightage: 20 },
    { topicSlug: "simple-compound-interest", weightage: 15 }, { topicSlug: "time-and-work", weightage: 20 }, { topicSlug: "ratio-proportion", weightage: 20 }]},
  { examSlug: "state-police", subjectSlug: "reasoning", totalMarks: 40, totalQuestions: 40, topics: [
    { topicSlug: "analogies", weightage: 25 }, { topicSlug: "coding-decoding", weightage: 25 },
    { topicSlug: "blood-relations", weightage: 20 }, { topicSlug: "syllogisms", weightage: 10 }, { topicSlug: "seating-arrangements", weightage: 20 }]},
  { examSlug: "state-police", subjectSlug: "general-awareness", totalMarks: 40, totalQuestions: 40, topics: [
    { topicSlug: "current-affairs", weightage: 35 }, { topicSlug: "static-gk", weightage: 30 },
    { topicSlug: "awards-honours", weightage: 10 }, { topicSlug: "books-authors", weightage: 10 }, { topicSlug: "sports", weightage: 15 }]},
  { examSlug: "state-police", subjectSlug: "general-science", totalMarks: 30, totalQuestions: 30, topics: [
    { topicSlug: "physics", weightage: 25 }, { topicSlug: "chemistry", weightage: 25 }, { topicSlug: "biology", weightage: 30 },
    { topicSlug: "environment", weightage: 10 }, { topicSlug: "space-technology", weightage: 10, isOptional: true }]},
  { examSlug: "state-police", subjectSlug: "hindi-language", totalMarks: 30, totalQuestions: 30, topics: [
    { topicSlug: "hindi-grammar", weightage: 50 }, { topicSlug: "hindi-comprehension", weightage: 30 }, { topicSlug: "hindi-vocabulary", weightage: 20 }]},
  { examSlug: "state-police", subjectSlug: "indian-polity", totalMarks: 20, totalQuestions: 20, topics: [
    { topicSlug: "indian-constitution", weightage: 30 }, { topicSlug: "fundamental-rights", weightage: 25 },
    { topicSlug: "parliament", weightage: 20 }, { topicSlug: "judiciary", weightage: 15 }, { topicSlug: "panchayati-raj", weightage: 10 }]},

  // ============ 16. Indian Army (Agniveer CEE + NDA written) ============
  { examSlug: "indian-army", subjectSlug: "quantitative-aptitude", totalMarks: 25, totalQuestions: 25, topics: [
    { topicSlug: "percentage", weightage: 25 }, { topicSlug: "profit-and-loss", weightage: 20 },
    { topicSlug: "simple-compound-interest", weightage: 15 }, { topicSlug: "time-and-work", weightage: 20 }, { topicSlug: "ratio-proportion", weightage: 20 }]},
  { examSlug: "indian-army", subjectSlug: "reasoning", totalMarks: 25, totalQuestions: 25, topics: [
    { topicSlug: "analogies", weightage: 30 }, { topicSlug: "coding-decoding", weightage: 30 },
    { topicSlug: "blood-relations", weightage: 20 }, { topicSlug: "syllogisms", weightage: 10 }, { topicSlug: "seating-arrangements", weightage: 10, isOptional: true }]},
  { examSlug: "indian-army", subjectSlug: "english-language", totalMarks: 25, totalQuestions: 25, topics: [
    { topicSlug: "reading-comprehension", weightage: 25 }, { topicSlug: "error-spotting", weightage: 20 },
    { topicSlug: "cloze-test", weightage: 15 }, { topicSlug: "vocabulary", weightage: 25 }, { topicSlug: "sentence-correction", weightage: 15 }]},
  { examSlug: "indian-army", subjectSlug: "general-science", totalMarks: 25, totalQuestions: 25, topics: [
    { topicSlug: "physics", weightage: 30 }, { topicSlug: "chemistry", weightage: 30 }, { topicSlug: "biology", weightage: 25 },
    { topicSlug: "environment", weightage: 10 }, { topicSlug: "space-technology", weightage: 5, isOptional: true }]},
  { examSlug: "indian-army", subjectSlug: "general-awareness", totalMarks: 25, totalQuestions: 25, topics: [
    { topicSlug: "current-affairs", weightage: 40 }, { topicSlug: "static-gk", weightage: 30 },
    { topicSlug: "awards-honours", weightage: 5 }, { topicSlug: "books-authors", weightage: 5 }, { topicSlug: "sports", weightage: 20 }]},

  // ============ 17. Indian Navy (SSR/Agniveer + INET) ============
  { examSlug: "indian-navy", subjectSlug: "quantitative-aptitude", totalMarks: 25, totalQuestions: 25, topics: [
    { topicSlug: "percentage", weightage: 25 }, { topicSlug: "profit-and-loss", weightage: 20 },
    { topicSlug: "simple-compound-interest", weightage: 15 }, { topicSlug: "time-and-work", weightage: 20 }, { topicSlug: "ratio-proportion", weightage: 20 }]},
  { examSlug: "indian-navy", subjectSlug: "reasoning", totalMarks: 25, totalQuestions: 25, topics: [
    { topicSlug: "analogies", weightage: 30 }, { topicSlug: "coding-decoding", weightage: 30 },
    { topicSlug: "blood-relations", weightage: 20 }, { topicSlug: "syllogisms", weightage: 10 }, { topicSlug: "seating-arrangements", weightage: 10, isOptional: true }]},
  { examSlug: "indian-navy", subjectSlug: "english-language", totalMarks: 25, totalQuestions: 25, topics: [
    { topicSlug: "reading-comprehension", weightage: 25 }, { topicSlug: "error-spotting", weightage: 20 },
    { topicSlug: "cloze-test", weightage: 15 }, { topicSlug: "vocabulary", weightage: 25 }, { topicSlug: "sentence-correction", weightage: 15 }]},
  { examSlug: "indian-navy", subjectSlug: "general-science", totalMarks: 25, totalQuestions: 25, topics: [
    { topicSlug: "physics", weightage: 35 }, { topicSlug: "chemistry", weightage: 30 }, { topicSlug: "biology", weightage: 20 },
    { topicSlug: "environment", weightage: 10 }, { topicSlug: "space-technology", weightage: 5 }]},
  { examSlug: "indian-navy", subjectSlug: "general-awareness", totalMarks: 25, totalQuestions: 25, topics: [
    { topicSlug: "current-affairs", weightage: 40 }, { topicSlug: "static-gk", weightage: 30 },
    { topicSlug: "awards-honours", weightage: 5 }, { topicSlug: "books-authors", weightage: 5 }, { topicSlug: "sports", weightage: 20 }]},

  // ============ 18. Indian Air Force (Agniveer X/Y + AFCAT) ============
  { examSlug: "indian-air-force", subjectSlug: "quantitative-aptitude", totalMarks: 30, totalQuestions: 30, topics: [
    { topicSlug: "percentage", weightage: 20 }, { topicSlug: "profit-and-loss", weightage: 20 },
    { topicSlug: "simple-compound-interest", weightage: 20 }, { topicSlug: "time-and-work", weightage: 20 }, { topicSlug: "ratio-proportion", weightage: 20 }]},
  { examSlug: "indian-air-force", subjectSlug: "reasoning", totalMarks: 30, totalQuestions: 30, topics: [
    { topicSlug: "analogies", weightage: 25 }, { topicSlug: "coding-decoding", weightage: 25 },
    { topicSlug: "blood-relations", weightage: 15 }, { topicSlug: "syllogisms", weightage: 15 }, { topicSlug: "seating-arrangements", weightage: 20 }]},
  { examSlug: "indian-air-force", subjectSlug: "english-language", totalMarks: 30, totalQuestions: 30, topics: [
    { topicSlug: "reading-comprehension", weightage: 30 }, { topicSlug: "error-spotting", weightage: 20 },
    { topicSlug: "cloze-test", weightage: 15 }, { topicSlug: "vocabulary", weightage: 20 }, { topicSlug: "sentence-correction", weightage: 15 }]},
  { examSlug: "indian-air-force", subjectSlug: "general-science", totalMarks: 30, totalQuestions: 30, topics: [
    { topicSlug: "physics", weightage: 35 }, { topicSlug: "chemistry", weightage: 25 }, { topicSlug: "biology", weightage: 20 },
    { topicSlug: "environment", weightage: 10 }, { topicSlug: "space-technology", weightage: 10 }]},
  { examSlug: "indian-air-force", subjectSlug: "general-awareness", totalMarks: 20, totalQuestions: 20, topics: [
    { topicSlug: "current-affairs", weightage: 45 }, { topicSlug: "static-gk", weightage: 25 },
    { topicSlug: "awards-honours", weightage: 5 }, { topicSlug: "books-authors", weightage: 5 }, { topicSlug: "sports", weightage: 20 }]},

  // ============ 19. DRDO (Scientist B + CEPTAM: Tech 75% + Aptitude 25%) ============
  { examSlug: "drdo", subjectSlug: "technical-knowledge", totalMarks: 120, totalQuestions: 80, topics: [
    { topicSlug: "cs-fundamentals", weightage: 30 }, { topicSlug: "ec-basics", weightage: 25 },
    { topicSlug: "ee-basics", weightage: 15 }, { topicSlug: "me-basics", weightage: 15 }, { topicSlug: "ce-basics", weightage: 15 }]},
  { examSlug: "drdo", subjectSlug: "quantitative-aptitude", totalMarks: 15, totalQuestions: 10, topics: [
    { topicSlug: "percentage", weightage: 20 }, { topicSlug: "profit-and-loss", weightage: 20 },
    { topicSlug: "simple-compound-interest", weightage: 20 }, { topicSlug: "time-and-work", weightage: 20 }, { topicSlug: "ratio-proportion", weightage: 20 }]},
  { examSlug: "drdo", subjectSlug: "reasoning", totalMarks: 15, totalQuestions: 10, topics: [
    { topicSlug: "analogies", weightage: 20 }, { topicSlug: "coding-decoding", weightage: 25 },
    { topicSlug: "blood-relations", weightage: 15 }, { topicSlug: "syllogisms", weightage: 15 }, { topicSlug: "seating-arrangements", weightage: 25 }]},
  { examSlug: "drdo", subjectSlug: "english-language", totalMarks: 15, totalQuestions: 10, topics: [
    { topicSlug: "reading-comprehension", weightage: 30 }, { topicSlug: "error-spotting", weightage: 20 },
    { topicSlug: "cloze-test", weightage: 15 }, { topicSlug: "vocabulary", weightage: 20 }, { topicSlug: "sentence-correction", weightage: 15 }]},
  { examSlug: "drdo", subjectSlug: "general-awareness", totalMarks: 15, totalQuestions: 10, topics: [
    { topicSlug: "current-affairs", weightage: 50 }, { topicSlug: "static-gk", weightage: 25 },
    { topicSlug: "awards-honours", weightage: 5 }, { topicSlug: "books-authors", weightage: 5 }, { topicSlug: "sports", weightage: 15 }]},

  // ============ 20. ISRO (Scientist/Engineer + Assistant: Tech 80Q + Aptitude 20Q) ============
  { examSlug: "isro", subjectSlug: "technical-knowledge", totalMarks: 160, totalQuestions: 80, topics: [
    { topicSlug: "cs-fundamentals", weightage: 30 }, { topicSlug: "ec-basics", weightage: 25 },
    { topicSlug: "ee-basics", weightage: 15 }, { topicSlug: "me-basics", weightage: 15 }, { topicSlug: "ce-basics", weightage: 15 }]},
  { examSlug: "isro", subjectSlug: "quantitative-aptitude", totalMarks: 10, totalQuestions: 5, topics: [
    { topicSlug: "percentage", weightage: 20 }, { topicSlug: "profit-and-loss", weightage: 20 },
    { topicSlug: "simple-compound-interest", weightage: 20 }, { topicSlug: "time-and-work", weightage: 20 }, { topicSlug: "ratio-proportion", weightage: 20 }]},
  { examSlug: "isro", subjectSlug: "reasoning", totalMarks: 10, totalQuestions: 5, topics: [
    { topicSlug: "analogies", weightage: 20 }, { topicSlug: "coding-decoding", weightage: 25 },
    { topicSlug: "blood-relations", weightage: 15 }, { topicSlug: "syllogisms", weightage: 15 }, { topicSlug: "seating-arrangements", weightage: 25 }]},
  { examSlug: "isro", subjectSlug: "english-language", totalMarks: 10, totalQuestions: 5, topics: [
    { topicSlug: "reading-comprehension", weightage: 30 }, { topicSlug: "error-spotting", weightage: 20 },
    { topicSlug: "cloze-test", weightage: 15 }, { topicSlug: "vocabulary", weightage: 20 }, { topicSlug: "sentence-correction", weightage: 15 }]},
  { examSlug: "isro", subjectSlug: "general-awareness", totalMarks: 10, totalQuestions: 5, topics: [
    { topicSlug: "current-affairs", weightage: 50 }, { topicSlug: "static-gk", weightage: 25 },
    { topicSlug: "awards-honours", weightage: 5 }, { topicSlug: "books-authors", weightage: 5 }, { topicSlug: "sports", weightage: 15 }]},

  // ============ 21. Other (Generic Central/State pattern) ============
  { examSlug: "other", subjectSlug: "quantitative-aptitude", totalMarks: 50, totalQuestions: 25, topics: [
    { topicSlug: "percentage", weightage: 20 }, { topicSlug: "profit-and-loss", weightage: 20 },
    { topicSlug: "simple-compound-interest", weightage: 20 }, { topicSlug: "time-and-work", weightage: 20 }, { topicSlug: "ratio-proportion", weightage: 20 }]},
  { examSlug: "other", subjectSlug: "reasoning", totalMarks: 50, totalQuestions: 25, topics: [
    { topicSlug: "analogies", weightage: 20 }, { topicSlug: "coding-decoding", weightage: 25 },
    { topicSlug: "blood-relations", weightage: 15 }, { topicSlug: "syllogisms", weightage: 15 }, { topicSlug: "seating-arrangements", weightage: 25 }]},
  { examSlug: "other", subjectSlug: "english-language", totalMarks: 50, totalQuestions: 25, topics: [
    { topicSlug: "reading-comprehension", weightage: 25 }, { topicSlug: "error-spotting", weightage: 20 },
    { topicSlug: "cloze-test", weightage: 15 }, { topicSlug: "vocabulary", weightage: 20 }, { topicSlug: "sentence-correction", weightage: 20 }]},
  { examSlug: "other", subjectSlug: "general-awareness", totalMarks: 50, totalQuestions: 25, topics: [
    { topicSlug: "current-affairs", weightage: 40 }, { topicSlug: "static-gk", weightage: 30 },
    { topicSlug: "awards-honours", weightage: 10 }, { topicSlug: "books-authors", weightage: 5 }, { topicSlug: "sports", weightage: 15 }]},
  { examSlug: "other", subjectSlug: "general-science", totalMarks: 25, totalQuestions: 12, topics: [
    { topicSlug: "physics", weightage: 25 }, { topicSlug: "chemistry", weightage: 25 }, { topicSlug: "biology", weightage: 30 },
    { topicSlug: "environment", weightage: 10 }, { topicSlug: "space-technology", weightage: 10, isOptional: true }]},
  { examSlug: "other", subjectSlug: "computer-knowledge", totalMarks: 25, totalQuestions: 12, topics: [
    { topicSlug: "ms-office", weightage: 25 }, { topicSlug: "internet-networking", weightage: 25 },
    { topicSlug: "computer-hardware", weightage: 15 }, { topicSlug: "computer-software", weightage: 20 }, { topicSlug: "cyber-security", weightage: 15 }]},
];
