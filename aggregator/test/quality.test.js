// Quality gate: junk chrome/non-recruitment titles must be rejected, real
// government recruitment notices must pass — across English and
// official-language (Devanagari/Tamil/Kannada) titles.
import { describe, it, expect } from 'vitest';
import { isRecruitmentTitle, rejectReason } from '../src/quality.js';

describe('quality gate — rejects junk', () => {
  it('rejects navigation/CTA chrome labels', () => {
    for (const t of ['Click Here', 'View', 'Read More', 'English version', 'தமிழ் வடிவம்', 'RTI', 'FAQ', 'Check Here', '(View)', '(APPLY ONLINE)', 'Form - A', 'Bonafide Certificate']) {
      expect(isRecruitmentTitle(t), t).toBe(false);
    }
  });

  it('rejects non-recruitment notices (results, corrigenda, exam logistics)', () => {
    for (const t of [
      'MHA IB MTS 2025 Final Result',
      'Recruitment Calendar',
      'Advertisement Calendar',
      'IN Calendar - 2026',
      'Result of Walk in Interview for recruitment of the post of full time Specialists',
      'CORRIGENDUM REGARDING THE RECRUITMENT TO 11 POSTS OF LEGAL ASSISTANT',
      'Odisha Civil Service Examination -2025 - Revised Programme of the Main Examination',
      'Important Notice - Revised dates for Junior Engineer Examination, 2026',
      'Information regarding the city of examination and Admission Certificate for the candidates',
      'ISRO - ESA - GEOGLAM Joint Workshop on Agriculture Monitoring',
      'Direct Recruitment OTPR User Manual',
      'Annual Report 2024-25',
      'Unclaimed Assets - Booklet',
      'Observing October as National Cybersecurity Awareness Month 2026',
    ]) {
      expect(isRecruitmentTitle(t), t).toBe(false);
    }
  });

  it('rejects semantically empty and short titles', () => {
    for (const t of ['', null, 'Permanent District Code', 'Authorised Signatory', 'KAISERBAGH TO DUDHWA', 'Department of Posts', 'World of opportunities']) {
      expect(isRecruitmentTitle(t), String(t)).toBe(false);
    }
  });

  it('rejects official-language chrome that tiers 1-3 cannot see', () => {
    for (const t of [
      'हिंदी दिवस के उपलक्ष्‍य में माननीय रेल मंत्री जी का संदेश',
      'बृहन्मुंबई महानगरपालिकेतील स्थगित केलेल्या जन्म नोंद दुरुस्ती नोंदींचा नोंदणी',
      'ಮುಖ್ಯ ಜಾಗೃತ ಅಧಿಕಾರಿಯ ವಿವರ',
      'ಸಾರ್ವಜನಿಕ ಮಾಹಿತಿ ಅಧಿಕಾರಿ',
    ]) {
      expect(isRecruitmentTitle(t), t).toBe(false);
    }
  });
});

describe('quality gate — passes real government job notices', () => {
  it('passes English recruitment titles with the usual signals', () => {
    for (const t of [
      'RRB 3,548 NTPC Graduate 06/2026 Online Form',
      'DSSSB 641 Peon, PA and More Posts Online Form 2026',
      'SSC Constable (GD) in Central Armed Police Forces (CAPFs) and SSF, and Rifleman (GD) in Assam Rifles',
      'Staff Nurse Gr-II - Medical Education Dept. (Cat.No:469/2024)',
      'SAMIKSHA ADHIKARI/ SAHAYAK SAMIKSHA ADHIKARI — Advt A-4/E-1/2026 — Last date 26/11/2026',
      'IMPORTANT ANNOUNCEMENT FOR RECRUITMENT TO THE POST OF FISHERY FIELD ASSISTANT',
      'RECRUITMENT NOTICE (Sr. Resident, SMO, Jr./Sr. Demonstrator) - Recruitment of tenure posts',
      'Notification for Recruitment Test (Objective Type) for the post of FAO/TO and STO',
      'IRCON Manager/Electrical Walk-in 2026',
    ]) {
      expect(isRecruitmentTitle(t), t).toBe(true);
    }
  });

  it('passes official-language (Devanagari) recruitment notices', () => {
    for (const t of [
      'एनआईसी में वैज्ञानिक/तकनीकी सहायक-ए, ग्रुप-बी (वैज्ञानिक और तकनीकी) पदों के लिए विस्तृत विज्ञापन',
    ]) {
      expect(isRecruitmentTitle(t), t).toBe(true);
    }
  });
});

describe('rejectReason', () => {
  it('names the tier that fired, null when passing', () => {
    expect(rejectReason('Click Here')).toBe('junk-title');
    expect(rejectReason('Recruitment Calendar')).toBe('non-job');
    expect(rejectReason('(View)')).toBe('chrome-parens');
    expect(rejectReason('Permanent District Code')).toBe('no-recruit-signal');
    expect(rejectReason('RRB 3,548 NTPC Graduate 06/2026 Online Form')).toBeNull();
  });
});
