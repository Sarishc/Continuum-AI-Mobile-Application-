import type { HealthEntry, HealthProfile, Insight, DoctorRecommendation } from '../types';

const now = Date.now();

export const MOCK_PROFILE: HealthProfile = {
  userId: 'mock-user',
  conditions: ['Hypertension', 'Type 2 Diabetes'],
  medications: [
    { id: 'm1', name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', startDate: '2024-01-15' },
    { id: 'm2', name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', startDate: '2024-03-01' },
  ],
  allergies: ['Penicillin'],
  updatedAt: new Date().toISOString(),
};

const day = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_TIMELINE: HealthEntry[] = [
  {
    id: 't1',
    userId: 'mock-user',
    type: 'lab_result',
    title: 'HbA1c Blood Panel',
    description: 'Fasting glucose 118 mg/dL, HbA1c 6.8% — above target range.',
    severity: 'high',
    value: 6.8,
    unit: '%',
    tags: ['glucose', 'diabetes'],
    attachments: [],
    structuredData: {
      summary:
        'HbA1c elevated at 6.8%, consistent with pre-diabetic range. Fasting glucose borderline at 118 mg/dL. Recommend dietary review and follow-up in 3 months.',
      conditions: ['Pre-diabetes'],
      lab_values: { HbA1c: '6.8%', 'Fasting Glucose': '118 mg/dL', eGFR: '92 mL/min' },
      risk_flags: ['HbA1c above normal threshold (>6.4%)', 'Fasting glucose borderline elevated'],
      source_file: 'lab_results_panel_q1.pdf',
    },
    recordedAt: day(0),
    createdAt: day(0),
  },
  {
    id: 't2',
    userId: 'mock-user',
    type: 'symptom',
    title: 'Frequent Urination & Thirst',
    description: 'Classic symptoms associated with elevated blood glucose.',
    severity: 'moderate',
    tags: ['urination', 'thirst', 'fatigue'],
    attachments: [],
    structuredData: {
      summary:
        'Patient reports frequent urination, increased thirst, and persistent fatigue over the past 3 days. Symptoms consistent with hyperglycaemia.',
      symptoms: ['Frequent urination', 'Increased thirst', 'Fatigue', 'Blurred vision'],
      risk_flags: [],
    },
    recordedAt: day(1),
    createdAt: day(1),
  },
  {
    id: 't3',
    userId: 'mock-user',
    type: 'lab_result',
    title: 'Annual Physical Report',
    description: 'Annual physical examination. BP 138/88 mmHg.',
    severity: 'moderate',
    value: '138/88',
    unit: 'mmHg',
    tags: ['blood-pressure', 'hypertension', 'annual'],
    attachments: [],
    structuredData: {
      summary:
        'Annual physical examination report. Blood pressure 138/88 mmHg consistent with Stage 1 hypertension. BMI 27.4 (overweight). All other values within normal limits.',
      conditions: ['Hypertension', 'Pre-diabetes'],
      medications: [
        { name: 'Metformin', dosage: '500mg', frequency: 'twice daily' },
        { name: 'Lisinopril', dosage: '10mg', frequency: 'once daily' },
      ],
      lab_values: { 'Blood Pressure': '138/88 mmHg', BMI: '27.4', 'Heart Rate': '74 bpm' },
      risk_flags: ['Stage 1 hypertension', 'BMI in overweight range'],
      source_file: 'annual_physical_2026.pdf',
    },
    recordedAt: day(3),
    createdAt: day(3),
  },
  {
    id: 't4',
    userId: 'mock-user',
    type: 'note',
    title: 'Started Daily Walking Routine',
    description: 'Started new walking routine — 20 minutes daily.',
    severity: 'low',
    tags: ['exercise', 'lifestyle'],
    attachments: [],
    structuredData: {
      summary:
        'Started new walking routine — 20 minutes daily after dinner. Feeling more energetic after first week. Plan to increase to 30 minutes next month.',
      risk_flags: [],
    },
    recordedAt: day(7),
    createdAt: day(7),
  },
  {
    id: 't5',
    userId: 'mock-user',
    type: 'lab_result',
    title: 'Lipid Panel',
    description: 'Total cholesterol 204 mg/dL, LDL borderline high.',
    severity: 'moderate',
    tags: ['cholesterol', 'lipids'],
    attachments: [],
    structuredData: {
      summary:
        'Lipid panel shows borderline high LDL cholesterol at 128 mg/dL. HDL satisfactory at 52 mg/dL. Total cholesterol 204 mg/dL — borderline high. Dietary modifications recommended.',
      lab_values: {
        'Total Cholesterol': '204 mg/dL',
        LDL: '128 mg/dL',
        HDL: '52 mg/dL',
        Triglycerides: '118 mg/dL',
      },
      risk_flags: ['LDL borderline high (>120 mg/dL)', 'Total cholesterol borderline high'],
      source_file: 'lipid_panel_march.pdf',
    },
    recordedAt: day(14),
    createdAt: day(14),
  },
  {
    id: 't6',
    userId: 'mock-user',
    type: 'appointment',
    title: 'Seasonal Allergy Follow-up',
    description: 'Follow-up for seasonal allergies. Symptoms well controlled.',
    severity: 'low',
    tags: ['allergy', 'follow-up'],
    attachments: [],
    structuredData: {
      summary:
        'Follow-up visit for seasonal allergies. Symptoms well controlled on current Cetirizine regimen. No changes required. Next review in 6 months.',
      conditions: ['Seasonal allergies'],
      medications: [{ name: 'Cetirizine', dosage: '10mg', frequency: 'as needed' }],
      risk_flags: [],
    },
    recordedAt: day(35),
    createdAt: day(35),
  },
];

export const MOCK_SCORE = 72;

const days = (n: number) => new Date(now - n * 86_400_000).toISOString();

export const MOCK_INSIGHTS: Insight[] = [
  {
    id: 'i1',
    userId: 'mock-user',
    category: 'risk',
    healthCategory: 'Metabolic',
    title: 'HbA1c Elevation Trend',
    summary:
      'Your HbA1c trend shows consistent elevation over the past 3 entries, suggesting progressive pre-diabetic progression rather than a one-time reading.',
    details:
      'Based on your last three lab results, a progressive upward trend in fasting glucose and HbA1c has been identified (5.7% → 6.1% → 6.8%). Consistent readings above 6.5% may indicate worsening glycaemic control. Consider reviewing dietary carbohydrate intake and consult your endocrinologist for a personalised management plan.',
    severity: 'high',
    confidence: 0.87,
    relatedEntryIds: ['t1'],
    actionable: true,
    dismissed: false,
    is_read: false,
    specialist: {
      type: 'Endocrinologist',
      reason:
        'Worsening glycaemic control with HbA1c trending above target. A specialist review of your diabetes management plan is recommended within the next 4–6 weeks.',
      urgency: 'soon',
    },
    generatedAt: days(0),
  },
  {
    id: 'i2',
    userId: 'mock-user',
    category: 'pattern',
    healthCategory: 'Cardiovascular',
    title: 'Stage 1 Hypertension Pattern',
    summary:
      'Blood pressure readings across two separate visits both show Stage 1 hypertension range. Consistent pattern detected.',
    details:
      'Morning hypertension surge detected across 5 of your last 7 readings (avg 138/88 mmHg). This pattern is associated with increased cardiovascular risk. Discuss timing of antihypertensive medication with your doctor, and consider DASH diet modifications.',
    severity: 'moderate',
    confidence: 0.79,
    relatedEntryIds: ['t3'],
    actionable: true,
    dismissed: false,
    is_read: false,
    specialist: {
      type: 'Cardiologist',
      reason:
        'Consistent Stage 1 hypertension readings warrant cardiovascular evaluation. A routine review with a cardiologist within the next 1–2 months is recommended.',
      urgency: 'routine',
    },
    generatedAt: days(1),
  },
  {
    id: 'i3',
    userId: 'mock-user',
    category: 'milestone',
    healthCategory: 'Lifestyle',
    title: 'Consistent Health Tracking — 5 Days',
    summary:
      'You have been consistently logging health data for 5 days. Regular tracking improves the accuracy of health recommendations by 40%.',
    details:
      'Consistent daily logging enables the AI engine to detect patterns that single readings cannot reveal. Your current logging streak of 5 consecutive days puts you on track for highly personalised insights within the next 2 weeks.',
    severity: 'low',
    confidence: 0.95,
    relatedEntryIds: [],
    actionable: false,
    dismissed: false,
    is_read: true,
    generatedAt: days(3),
  },
  {
    id: 'i4',
    userId: 'mock-user',
    category: 'recommendation',
    healthCategory: 'Medication',
    title: 'Metformin Timing Advisory',
    summary:
      'Metformin 500mg is listed in your profile. Ensure you are taking it with meals to reduce gastrointestinal side effects.',
    details:
      'Metformin is most effective and best tolerated when taken with or immediately after food. Taking it on an empty stomach significantly increases the risk of nausea and GI discomfort. Your current medication log does not include meal-timing data — adding this could improve AI adherence analysis.',
    severity: 'moderate',
    confidence: 0.82,
    relatedEntryIds: ['t4'],
    actionable: true,
    dismissed: false,
    is_read: false,
    generatedAt: days(4),
  },
  {
    id: 'i5',
    userId: 'mock-user',
    category: 'recommendation',
    healthCategory: 'Preventive',
    title: 'Annual Eye Exam Recommended',
    summary:
      'Based on your age and risk profile, an annual eye exam is recommended. Diabetic retinopathy screening is important for pre-diabetic patients.',
    details:
      'Patients with pre-diabetes or HbA1c ≥ 5.7% are advised to undergo annual dilated eye exams. Early detection of diabetic retinopathy significantly reduces the risk of vision loss. Your last recorded eye exam date is not on file.',
    severity: 'low',
    confidence: 0.74,
    relatedEntryIds: [],
    actionable: true,
    dismissed: false,
    is_read: true,
    specialist: {
      type: 'Ophthalmologist',
      reason:
        'Annual dilated eye examination is recommended for pre-diabetic patients to screen for early-stage diabetic retinopathy.',
      urgency: 'routine',
    },
    generatedAt: days(7),
  },
];

export const MOCK_DOCTOR_REC: DoctorRecommendation = {
  id: 'dr1',
  userId: 'mock-user',
  specialty: 'Endocrinologist',
  urgency: 'soon',
  reason:
    'Worsening glycaemic control with HbA1c trending above target. A specialist review of your diabetes management plan is recommended within the next 4–6 weeks.',
  relatedInsightIds: ['i1'],
  generatedAt: days(0),
  dismissed: false,
};
