// Cross-implementation parity: the title quality gate exists twice — once in
// the aggregator (applied before storing, aggregator/src/quality.js) and once
// here (final line of defense on import, isRecruitmentTitle above). The two
// live in separate npm packages built into separate Docker images, so they
// cannot share one runtime module; instead this test feeds the SAME corpus
// through both and fails the moment they disagree. See quality.js header
// ("keep both in sync") — this is what keeps them in sync.
import { describe, it, expect } from 'vitest';
import { isRecruitmentTitle as serverGate } from './aggregatorImport.service.js';
import { isRecruitmentTitle as aggregatorGate, rejectReason } from '../../../aggregator/src/quality.js';

// Representative corpus: junk chrome, exam logistics, real recruitments,
// official-language titles, edge cases. Both gates must return one verdict.
const CORPUS = [
  // junk chrome
  'Click Here', 'View', 'Read More', 'English version', 'RTI', 'FAQ',
  'Check Here', '(View)', '(APPLY ONLINE)', 'Form - A', 'Bonafide Certificate',
  // non-recruitment notices
  'MHA IB MTS 2025 Final Result',
  'CORRIGENDUM REGARDING THE RECRUITMENT TO 11 POSTS OF LEGAL ASSISTANT',
  'Odisha Civil Service Examination -2025 - Revised Programme of the Main Examination',
  'Information regarding the city of examination and Admission Certificate for the candidates',
  'ISRO - ESA - GEOGLAM Joint Workshop on Agriculture Monitoring',
  'Direct Recruitment OTPR User Manual',
  'Annual Report 2024-25',
  // empty / too short / no signal
  '', null, 'Permanent District Code', 'Authorised Signatory',
  'KAISERBAGH TO DUDHWA', 'Department of Posts', 'World of opportunities',
  // official-language chrome
  'हिंदी दिवस के उपलक्ष्‍य में माननीय रेल मंत्री जी का संदेश',
  'ಮುಖ್ಯ ಜಾಗೃತ ಅಧಿಕಾರಿಯ ವಿವರ',
  // real recruitment notices
  'RRB 3,548 NTPC Graduate 06/2026 Online Form',
  'DSSSB 641 Peon, PA and More Posts Online Form 2026',
  'SSC Constable (GD) in Central Armed Police Forces (CAPFs) and SSF, and Rifleman (GD) in Assam Rifles',
  'Staff Nurse Gr-II - Medical Education Dept. (Cat.No:469/2024)',
  'SAMIKSHA ADHIKARI/ SAHAYAK SAMIKSHA ADHIKARI — Advt A-4/E-1/2026 — Last date 26/11/2026',
  'IMPORTANT ANNOUNCEMENT FOR RECRUITMENT TO THE POST OF FISHERY FIELD ASSISTANT',
  'IRCON Manager/Electrical Walk-in 2026',
  'एनआईसी में वैज्ञानिक/तकनीकी सहायक-ए, ग्रुप-बी (वैज्ञानिक और तकनीकी) पदों के लिए विस्तृत विज्ञापन',
  // aggregator exports seen in the wild
  'UPPSC Combined State/Upper Subordinate Services Examination 2026',
  'OPSC Odisha Education Service Corps Recruitment 2026',
];

describe('quality gate parity (server mapper vs aggregator gate)', () => {
  it('returns the same verdict for every corpus title', () => {
    for (const title of CORPUS) {
      const serverVerdict = serverGate(title);
      const aggregatorVerdict = aggregatorGate(title);
      expect(serverVerdict, `disagreement on: ${String(title)}`).toBe(aggregatorVerdict);
    }
  });

  it('the corpus exercises both accept and reject paths', () => {
    expect(CORPUS.some((t) => serverGate(t))).toBe(true);
    expect(CORPUS.some((t) => !serverGate(t))).toBe(true);
  });

  it('aggregator rejectReason stays consistent with its own boolean gate', () => {
    for (const title of CORPUS) {
      expect(aggregatorGate(title), String(title)).toBe(rejectReason(title) === null);
    }
  });
});
