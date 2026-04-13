import type { FirestoreHealthProfile, FirestoreHealthEntry, FirestoreInsight } from '../services/firestoreService';

const now = Date.now();
const day = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000).toISOString();

export const DEMO_HEALTH_PROFILE: FirestoreHealthProfile = {
  userId: 'demo-user',
  conditions: ['Hypertension', 'Type 2 Diabetes'],
  medications: [
    { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
    { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily' },
  ],
  allergies: ['Penicillin'],
  age: 47,
  sex: 'Male',
};

export const DEMO_ENTRIES: FirestoreHealthEntry[] = [
  {
    id: 'demo-t1',
    userId: 'demo-user',
    entryType: 'lab',
    title: 'HbA1c Blood Panel',
    rawText: 'HbA1c 6.8%, Fasting glucose 118 mg/dL, eGFR 92 mL/min',
    structuredData: {
      conditions: ['Pre-diabetes'],
      medications: [],
      symptoms: [],
      labValues: { HbA1c: '6.8%', 'Fasting Glucose': '118 mg/dL', eGFR: '92 mL/min' },
      summary:
        'HbA1c elevated at 6.8%, consistent with pre-diabetic range. Fasting glucose borderline at 118 mg/dL.',
      riskFlags: ['HbA1c above normal threshold (>6.4%)', 'Fasting glucose borderline elevated'],
    },
    sourceFile: 'lab_results_panel_q1.pdf',
    createdAt: day(0),
  },
  {
    id: 'demo-t2',
    userId: 'demo-user',
    entryType: 'symptom',
    title: 'Frequent Urination & Thirst',
    rawText: 'Frequent urination, increased thirst, fatigue over past 3 days.',
    structuredData: {
      conditions: [],
      medications: [],
      symptoms: ['Frequent urination', 'Increased thirst', 'Fatigue', 'Blurred vision'],
      labValues: {},
      summary: 'Classic symptoms associated with elevated blood glucose.',
      riskFlags: [],
    },
    sourceFile: null,
    createdAt: day(1),
  },
  {
    id: 'demo-t3',
    userId: 'demo-user',
    entryType: 'report',
    title: 'Annual Physical Report',
    rawText: 'BP 138/88 mmHg, BMI 27.4, Heart Rate 74 bpm.',
    structuredData: {
      conditions: ['Hypertension', 'Pre-diabetes'],
      medications: ['Metformin 500mg', 'Lisinopril 10mg'],
      symptoms: [],
      labValues: { 'Blood Pressure': '138/88 mmHg', BMI: '27.4', 'Heart Rate': '74 bpm' },
      summary:
        'Annual physical examination. Blood pressure 138/88 mmHg — Stage 1 hypertension. BMI 27.4 (overweight).',
      riskFlags: ['Stage 1 hypertension', 'BMI in overweight range'],
    },
    sourceFile: 'annual_physical_2026.pdf',
    createdAt: day(3),
  },
  {
    id: 'demo-t4',
    userId: 'demo-user',
    entryType: 'note',
    title: 'Started Daily Walking Routine',
    rawText: '20 minutes daily after dinner. Feeling more energetic.',
    structuredData: {
      conditions: [],
      medications: [],
      symptoms: [],
      labValues: {},
      summary: 'Started new walking routine — 20 minutes daily after dinner.',
      riskFlags: [],
    },
    sourceFile: null,
    createdAt: day(7),
  },
  {
    id: 'demo-t5',
    userId: 'demo-user',
    entryType: 'lab',
    title: 'Lipid Panel',
    rawText: 'Total Cholesterol 204 mg/dL, LDL 128 mg/dL, HDL 52 mg/dL.',
    structuredData: {
      conditions: [],
      medications: [],
      symptoms: [],
      labValues: {
        'Total Cholesterol': '204 mg/dL',
        LDL: '128 mg/dL',
        HDL: '52 mg/dL',
        Triglycerides: '118 mg/dL',
      },
      summary: 'Borderline high LDL cholesterol at 128 mg/dL. Dietary modifications recommended.',
      riskFlags: ['LDL borderline high (>120 mg/dL)', 'Total cholesterol borderline high'],
    },
    sourceFile: 'lipid_panel_march.pdf',
    createdAt: day(14),
  },
];

export const DEMO_INSIGHTS: FirestoreInsight[] = [
  {
    id: 'demo-i1',
    userId: 'demo-user',
    insightText:
      'Your HbA1c of 6.8% is above the normal threshold. Combined with fasting glucose of 118 mg/dL, this suggests pre-diabetic progression. Consider scheduling a follow-up with your endocrinologist.',
    severity: 'high',
    category: 'Diabetes Management',
    isRead: false,
    confidenceScore: 0.92,
    specialist: {
      type: 'Endocrinologist',
      urgency: 'Within 4 weeks',
      reason: 'HbA1c trending upward — medication review needed',
    },
    createdAt: day(0),
  },
  {
    id: 'demo-i2',
    userId: 'demo-user',
    insightText:
      'Blood pressure at 138/88 mmHg is Stage 1 hypertension. Your Lisinopril dosage may need adjustment. Reduce sodium intake to under 2,300mg/day and aim for 150 min of moderate exercise weekly.',
    severity: 'medium',
    category: 'Cardiovascular',
    isRead: false,
    confidenceScore: 0.88,
    specialist: {
      type: 'Cardiologist',
      urgency: 'Within 8 weeks',
      reason: 'BP not at target despite current medication',
    },
    createdAt: day(1),
  },
  {
    id: 'demo-i3',
    userId: 'demo-user',
    insightText:
      'LDL cholesterol of 128 mg/dL is borderline high. Your walking routine is a great start — aim to increase to 30 minutes daily to support lipid management.',
    severity: 'low',
    category: 'Cholesterol',
    isRead: true,
    confidenceScore: 0.78,
    specialist: null,
    createdAt: day(3),
  },
  {
    id: 'demo-i4',
    userId: 'demo-user',
    insightText:
      "Your symptoms of frequent urination and increased thirst are consistent with hyperglycaemia. These should improve as your HbA1c comes down. Log your daily glucose readings to track progress.",
    severity: 'medium',
    category: 'Symptom Tracking',
    isRead: true,
    confidenceScore: 0.85,
    specialist: null,
    createdAt: day(5),
  },
];

export const DEMO_HEALTH_SCORE = 72;

// ─── Demo Consultation ────────────────────────────────────────────────────────

import type { Consultation } from '../services/firestoreService';

export const DEMO_CONSULTATION: Consultation = {
  id: 'demo-consultation-1',
  userId: 'demo-user',
  status: 'completed',
  insightId: 'demo-i1',
  insightText:
    'Your HbA1c of 6.8% is above the normal threshold. Combined with fasting glucose of 118 mg/dL, this suggests pre-diabetic progression. Consider scheduling a follow-up with your endocrinologist.',
  healthProfile: DEMO_HEALTH_PROFILE,
  recentEntries: DEMO_ENTRIES,
  paymentStatus: 'paid',
  paymentAmount: 2900,
  createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  doctorResponse: {
    doctorName: 'Dr. Sarah Chen, MD',
    credentials: 'Board Certified Internist • Endocrinology Fellowship • 15 Years Experience',
    response:
      "I've reviewed your complete health profile and I'm genuinely impressed with the progress you've made over the past 6 weeks. Your HbA1c improvement from 6.9% to an estimated 6.3% represents a clinically meaningful reduction that places you firmly back in the pre-diabetic range rather than the diabetic threshold.\n\nThe lifestyle modifications you've implemented — particularly the post-dinner walks and dietary changes — are clearly having a measurable metabolic effect. This level of improvement in 6 weeks is faster than we typically see and suggests your body is responding very well to the interventions.\n\nI do want to flag your blood pressure (132/84 mmHg), which remains in Stage 1 hypertension territory. While this is an improvement from 138/88, it would benefit from continued monitoring. Your Lisinopril appears to be working — please ensure you're taking it consistently, preferably at the same time each day.\n\nThe morning headaches you've noted are worth discussing with your prescribing physician. This symptom can sometimes indicate orthostatic hypotension (blood pressure dropping when you stand), which is a known side effect of ACE inhibitors like Lisinopril.",
    recommendations: [
      'Schedule an HbA1c recheck with your endocrinologist in 6-8 weeks to confirm the trend',
      'Continue post-dinner 30-minute walks — the data strongly supports their effectiveness for you',
      'Discuss Lisinopril timing with your doctor to address the morning headache pattern',
      'Consider a home blood pressure monitor for daily morning readings',
    ],
    urgencyLevel: 'follow_up',
    followUpIn: '6-8 weeks',
    respondedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
};
