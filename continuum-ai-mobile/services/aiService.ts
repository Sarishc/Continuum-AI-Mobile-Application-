import { ENV } from '../constants/env';

const WORKER_URL = ENV.workerUrl;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatResponse {
  answer: string;
  reasoning: string;
  confidence: 'low' | 'medium' | 'high';
  confidenceScore: number;
  disclaimer: string;
  specialist: {
    type: string;
    urgency: string;
    reason: string;
  } | null;
  riskLevel: string;
}

export interface StructuredHealthData {
  conditions: string[];
  medications: Array<{ name: string; dosage: string; frequency: string }>;
  symptoms: string[];
  labValues: Record<string, string>;
  summary: string;
  riskFlags: string[];
  suggestedTitle: string;
}

export interface GeneratedInsight {
  insightText: string;
  severity: string;
  category: string;
  confidenceScore: number;
  specialist: object | null;
}

// ─── Analyze: extract structured data from health text ───────────────────────

export async function analyzeHealthText(
  text: string,
  healthProfile?: object
): Promise<StructuredHealthData | null> {
  try {
    const response = await fetch(`${WORKER_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'analyze', text, healthProfile }),
    });

    if (!response.ok) throw new Error(`Analyze failed: ${response.status}`);

    const data = await response.json() as { success: boolean; structured: StructuredHealthData };
    return data.structured ?? null;
  } catch (error) {
    console.error('[aiService] analyzeHealthText error:', error);
    return null;
  }
}

// ─── Chat: personalized health Q&A ───────────────────────────────────────────

export async function askHealthQuestion(
  question: string,
  healthProfile: object,
  recentEntries: any[],
  mode: 'rule' | 'ai' = 'ai',
  conversationHistory?: any[]
): Promise<ChatResponse> {
  if (mode === 'rule') {
    return getRuleEngineResponse(question, healthProfile as any);
  }

  try {
    const [response] = await Promise.all([
      fetch(`${WORKER_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat',
          question,
          healthProfile,
          recentEntries,
          messages: conversationHistory ?? [],
        }),
      }),
      new Promise((r) => setTimeout(r, 400)),
    ]);

    if (!(response as Response).ok) throw new Error(`Chat failed: ${(response as Response).status}`);

    const data = await (response as Response).json() as ChatResponse & { success?: boolean };
    return data;
  } catch (error) {
    console.error('[aiService] askHealthQuestion error:', error);
    return getRuleEngineResponse(question, healthProfile as any);
  }
}

// ─── Insights: generate proactive insights from health data ──────────────────

export async function generateInsights(
  healthProfile: object,
  recentEntries: any[]
): Promise<GeneratedInsight[]> {
  try {
    const response = await fetch(`${WORKER_URL}/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'insights', healthProfile, recentEntries }),
    });

    if (!response.ok) throw new Error(`Insights failed: ${response.status}`);

    const data = await response.json() as { success: boolean; insights: GeneratedInsight[] };
    return Array.isArray(data.insights) ? data.insights : [];
  } catch (error) {
    console.error('[aiService] generateInsights error:', error);
    return [];
  }
}

// ─── Rule engine — instant, offline-capable fallback ────────────────────────

function getRuleEngineResponse(question: string, healthProfile: any): ChatResponse {
  const q = question.toLowerCase();
  const conditions: string[] = healthProfile?.conditions ?? [];
  const medications: any[] = healthProfile?.medications ?? [];

  if (q.includes('blood pressure') || q.includes('hypertension') || q.includes('bp')) {
    const hasHypertension = conditions.some((c) =>
      c.toLowerCase().includes('hypertension') || c.toLowerCase().includes('blood pressure')
    );
    return {
      answer: hasHypertension
        ? 'Your profile shows hypertension. Key targets: systolic < 130 mmHg, diastolic < 80 mmHg. Continue your prescribed medications and monitor daily.'
        : 'Normal blood pressure is below 120/80 mmHg. Stage 1 hypertension is 130–139/80–89 mmHg. Regular monitoring is recommended.',
      reasoning: 'Based on AHA 2023 guidelines for blood pressure classification.',
      confidence: 'high',
      confidenceScore: 0.92,
      disclaimer: 'Not medical advice. Consult a healthcare professional.',
      specialist: hasHypertension
        ? { type: 'Cardiologist', urgency: 'routine', reason: 'Ongoing hypertension management' }
        : null,
      riskLevel: hasHypertension ? 'medium' : 'low',
    };
  }

  if (
    q.includes('hba1c') || q.includes('glucose') ||
    q.includes('diabetes') || q.includes('blood sugar') ||
    q.includes('a1c')
  ) {
    const hasDiabetes = conditions.some(
      (c) => c.toLowerCase().includes('diabetes') || c.toLowerCase().includes('pre-diabet')
    );
    return {
      answer: hasDiabetes
        ? 'For pre-diabetes/diabetes management: target HbA1c below 6.5% (diabetic) or 5.7% (normal). Metformin, diet, and regular exercise are first-line treatments.'
        : 'Normal HbA1c is below 5.7%. Pre-diabetic range is 5.7–6.4%. Diabetic is 6.5% or above. Annual testing is recommended.',
      reasoning: 'Based on ADA 2024 Standards of Medical Care in Diabetes.',
      confidence: 'high',
      confidenceScore: 0.94,
      disclaimer: 'Not medical advice. Consult a healthcare professional.',
      specialist: hasDiabetes
        ? { type: 'Endocrinologist', urgency: 'soon', reason: 'Blood glucose management review' }
        : null,
      riskLevel: hasDiabetes ? 'medium' : 'low',
    };
  }

  if (
    q.includes('medication') || q.includes('medicine') ||
    q.includes('drug') || q.includes('pill') || q.includes('prescription')
  ) {
    const medList = medications
      .map((m) => (typeof m === 'string' ? m : `${m.name}${m.dosage ? ` ${m.dosage}` : ''}`))
      .join(', ');
    return {
      answer:
        medications.length > 0
          ? `Your current medications: ${medList}. Always take medications as prescribed and report any side effects to your doctor.`
          : 'No medications are currently listed in your profile. You can add them via the Edit Profile option.',
      reasoning: 'Medication information retrieved from your health profile.',
      confidence: 'high',
      confidenceScore: 0.98,
      disclaimer: 'Not medical advice. Consult a healthcare professional.',
      specialist: null,
      riskLevel: 'low',
    };
  }

  if (q.includes('cholesterol') || q.includes('ldl') || q.includes('hdl') || q.includes('lipid')) {
    return {
      answer:
        'Optimal LDL cholesterol is below 100 mg/dL. HDL should be above 60 mg/dL (protective). Total cholesterol below 200 mg/dL is desirable. Diet, exercise, and statins are primary interventions.',
      reasoning: 'Based on ACC/AHA 2023 cholesterol management guidelines.',
      confidence: 'high',
      confidenceScore: 0.89,
      disclaimer: 'Not medical advice. Consult a healthcare professional.',
      specialist: null,
      riskLevel: 'low',
    };
  }

  return {
    answer:
      'Based on your health profile, I recommend discussing this with your healthcare provider for personalised guidance. Keep tracking your health data for more accurate insights.',
    reasoning: 'General health guidance based on your profile data.',
    confidence: 'medium',
    confidenceScore: 0.65,
    disclaimer: 'Not medical advice. Always consult a healthcare professional.',
    specialist: null,
    riskLevel: 'low',
  };
}
