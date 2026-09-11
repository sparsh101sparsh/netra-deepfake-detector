import { ForensicResult } from './types';

export const FORENSIC_PRESETS: Record<string, ForensicResult> = {
  'preset_deepfake_speech': {
    jobId: 'JOB-DF-9081',
    filename: 'official_video_statement_keyframe_44.jpg',
    mediaType: 'video_frame',
    sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    analyzedAt: new Date().toISOString(),
    branch: 'BRANCH_A_FACE',
    riskScore: 94,
    verdict: 'CRITICAL_THREAT',
    faceAnalysis: {
      facesDetected: 1,
      fakeProbability: 0.94,
      spatialSBIModelScore: 0.962,
      anomalies: [
        {
          region: 'Left & Right Ocular Specular Reflection',
          confidence: 0.92,
          bbox: [142, 98, 120, 48],
          description: 'Non-Lambertian corneal specular discontinuity detected. Light sources between left and right iris differ by >42 degrees.',
          severity: 'CRITICAL',
        },
        {
          region: 'Perioral Lip-Sync Seam',
          confidence: 0.89,
          bbox: [160, 185, 95, 45],
          description: 'Blending boundary artifacts and temporal frequency mismatches consistent with Wav2Lip generative synthesis.',
          severity: 'CRITICAL',
        },
        {
          region: 'Facial Boundary Gradient',
          confidence: 0.84,
          bbox: [110, 60, 200, 210],
          description: 'Gaussian smoothing artifacts detected along jawline boundary from face-swap mask blending.',
          severity: 'WARNING',
        }
      ]
    },
    legalClausesApplicable: [
      'IT Act 2000 Section 66D (Cheating by personation by using computer resource)',
      'BNS Section 318(4) (Cheating and dishonestly inducing delivery of property)',
      'BNS Section 336(3) (Forgery of electronic records for harm)'
    ]
  },

  'preset_digital_arrest_fir': {
    jobId: 'JOB-DOC-8122',
    filename: 'CBI_CyberCrime_Notice_Arrest_Warrant.png',
    mediaType: 'document',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    analyzedAt: new Date().toISOString(),
    branch: 'BRANCH_B_DOCUMENT',
    riskScore: 98,
    verdict: 'CRITICAL_THREAT',
    ocrAnalysis: {
      extractedText: 'CENTRAL BUREAU OF INVESTIGATION - CYBER WING. IMMEDIATE NOTICE OF DIGITAL ARREST. Your Aadhaar and Bank accounts have been linked to money laundering case #891/2026. Deposit Rs. 1,85,000 security fee to verify account via UPI: cbi.cybercell.mumbai@okaxis to cancel non-bailable warrant within 2 hours.',
      iocs: {
        upiIds: ['cbi.cybercell.mumbai@okaxis', 'police.dep.settle@ybl'],
        phoneNumbers: ['+91 98710 20905', '+91 88261 99104'],
        fakeBadges: ['CBI Emblem Forgery', 'Supreme Court Stamp Discontinuity', 'Unauthorized Government Seal']
      },
      scamRisk: 0.98,
      indicators: [
        'Extortion threat using coercive "Digital Arrest" keywords',
        'Unauthorized personal UPI address used for purported official fine/settlement',
        'Forged header emblem with high digital JPEG compression noise surrounding seal',
        'Grammatical anomalies and artificial urgency tactics (<2 hours deadline)'
      ]
    },
    legalClausesApplicable: [
      'BNS Section 204 (Impersonating a public servant)',
      'BNS Section 308(2) (Extortion by threat of false accusation)',
      'IT Act 2000 Section 66C & 66D (Identity theft and cheating)'
    ]
  },

  'preset_kbc_lottery_scam': {
    jobId: 'JOB-DOC-6411',
    filename: 'KBC_All_India_Sim_Card_Lucky_Draw_25Lakh.jpg',
    mediaType: 'document',
    sha256: 'c245c754b2382cf89634e565fa8a385f0e34c9f137e3d1bb6d93b3f68a571999',
    analyzedAt: new Date().toISOString(),
    branch: 'BRANCH_B_DOCUMENT',
    riskScore: 88,
    verdict: 'CRITICAL_THREAT',
    ocrAnalysis: {
      extractedText: 'DEAR WINNER CONGRATULATIONS! KBC ALL INDIA SIM CARD LUCKY DRAW 2026. You have won 25,00,000 INR. To claim your lottery contact KBC manager Rana Pratap Singh on WhatsApp +91 70560 20905. GST fee 12,500 must be paid first.',
      iocs: {
        upiIds: ['kbc.lottery.tax@paytm'],
        phoneNumbers: ['+91 70560 20905'],
        fakeBadges: ['Fake KBC Logo', 'Forged Bank of India Guarantee Seal']
      },
      scamRisk: 0.88,
      indicators: [
        'Classic Advance Fee Fraud (419 lottery scheme)',
        'Personal WhatsApp number given for official lottery claim',
        'Upfront "GST / processing fee" demand before prize disbursal'
      ]
    },
    legalClausesApplicable: [
      'BNS Section 318(4) (Cheating and dishonestly inducing delivery of property)',
      'IT Act 2000 Section 66D (Cheating by personation)'
    ]
  },

  'preset_authentic_speech': {
    jobId: 'JOB-AUT-1029',
    filename: 'press_briefing_authentic_statement.mp4',
    mediaType: 'video_frame',
    sha256: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    analyzedAt: new Date().toISOString(),
    branch: 'BRANCH_A_FACE',
    riskScore: 8,
    verdict: 'AUTHENTIC_VERIFIED',
    faceAnalysis: {
      facesDetected: 1,
      fakeProbability: 0.08,
      spatialSBIModelScore: 0.071,
      anomalies: []
    },
    legalClausesApplicable: []
  }
};
