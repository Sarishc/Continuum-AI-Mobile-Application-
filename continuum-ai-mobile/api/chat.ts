import apiClient from './client';
import type { AIAskResponse, EngineMode } from '../types';

export interface AskPayload {
  question: string;
  mode: EngineMode;
  conversation_id?: string;
  entry_id?: string;
}

export const healthAskApi = {
  ask: (payload: AskPayload) =>
    apiClient.post<AIAskResponse>('/health/ask', payload),
};

// ─── Mock response engine ─────────────────────────────────────────────────────

const DISCLAIMER =
  'This is not medical advice. Always consult a healthcare professional.';

export function mockAIResponse(question: string): AIAskResponse {
  const q = question.toLowerCase();

  if (/blood|glucose|hba1c|sugar|diabet/.test(q)) {
    return {
      answer:
        'Your recent HbA1c of 6.8% places you in the pre-diabetic range. This warrants attention but is very manageable with targeted lifestyle changes — reducing refined carbohydrates, increasing physical activity, and consistent monitoring.',
      reasoning:
        'HbA1c between 5.7–6.4% is considered pre-diabetic by ADA guidelines. Your recorded value of 6.8% exceeds this threshold, indicating early insulin resistance. The upward trend over the past 3 months is the primary driver of this assessment.',
      confidence: 'high',
      confidence_score: 0.87,
      disclaimer: DISCLAIMER,
      specialist_recommendation: {
        specialist_type: 'Endocrinologist',
        reason:
          'Worsening glycaemic control with HbA1c trending above 6.5% warrants a specialist review of your diabetes management plan.',
        urgency: 'soon',
      },
    };
  }

  if (/pressure|heart|cardio|chest|bp|hypertension/.test(q)) {
    return {
      answer:
        'Based on your logged readings, your blood pressure shows a pattern consistent with Stage 1 hypertension (consistently above 130/80 mmHg). This should be monitored closely and may require medication adjustment.',
      reasoning:
        'The AHA defines Stage 1 hypertension as systolic 130–139 mmHg or diastolic 80–89 mmHg. Your recorded readings of 142/88 mmHg exceed this threshold. The morning surge pattern detected in your data is an additional cardiovascular risk factor.',
      confidence: 'medium',
      confidence_score: 0.78,
      disclaimer: DISCLAIMER,
      specialist_recommendation: {
        specialist_type: 'Cardiologist',
        reason:
          'Persistent Stage 1 hypertension with a morning surge pattern warrants a cardiovascular risk assessment.',
        urgency: 'routine',
      },
    };
  }

  if (/medication|drug|dose|metformin|lisinopril|pill/.test(q)) {
    return {
      answer:
        'Reviewing your current medications: Metformin 500mg (twice daily) and Lisinopril 10mg (once daily). Both are appropriate for your diagnosed conditions. Metformin is first-line therapy for Type 2 Diabetes, and Lisinopril provides both blood pressure control and renal protection.',
      reasoning:
        'Cross-referencing your medication list with your diagnosed conditions (Hypertension, Type 2 Diabetes), both medications are guideline-concordant. No significant drug interactions detected between Metformin and Lisinopril.',
      confidence: 'high',
      confidence_score: 0.91,
      disclaimer: DISCLAIMER,
      specialist_recommendation: undefined,
    };
  }

  if (/symptom|feel|fatigue|tired|headache|pain/.test(q)) {
    return {
      answer:
        'Your logged symptoms — fatigue and mild headache — appear alongside elevated blood glucose readings in your timeline. Uncontrolled blood sugar commonly causes fatigue and headaches. Ensuring adequate hydration and glucose control may help.',
      reasoning:
        'Temporal correlation analysis between your symptom logs and lab results shows that fatigue episodes occur within 24 hours of elevated glucose readings in 4 out of 5 instances.',
      confidence: 'medium',
      confidence_score: 0.71,
      disclaimer: DISCLAIMER,
      specialist_recommendation: undefined,
    };
  }

  // Default
  return {
    answer:
      "Based on your current health profile, I don't see any immediate red flags related to this concern. However, given your existing conditions, I'd recommend discussing this with your primary care physician at your next visit to get a personalised assessment.",
    reasoning:
      'No critical values detected in your current health data that directly correlate to this query. The recommendation is precautionary, based on general health guidelines and your existing diagnoses.',
    confidence: 'medium',
    confidence_score: 0.65,
    disclaimer: DISCLAIMER,
    specialist_recommendation: undefined,
  };
}

export function mockRuleResponse(question: string): AIAskResponse {
  const q = question.toLowerCase();

  if (/blood|glucose|hba1c/.test(q)) {
    return {
      answer: 'RULE MATCH: HbA1c > 6.5% → Flag: Pre-diabetic range. Action: Schedule endocrinology review within 6 weeks.',
      reasoning: 'Rule R-042: IF HbA1c >= 6.5 THEN severity = HIGH AND recommend Endocrinologist.',
      confidence: 'high',
      confidence_score: 1.0,
      disclaimer: DISCLAIMER,
      specialist_recommendation: {
        specialist_type: 'Endocrinologist',
        reason: 'Triggered by rule R-042: HbA1c threshold exceeded.',
        urgency: 'soon',
      },
    };
  }

  if (/pressure|heart|bp/.test(q)) {
    return {
      answer: 'RULE MATCH: BP > 130/80 → Flag: Stage 1 Hypertension. Action: Review antihypertensive medication timing.',
      reasoning: 'Rule R-017: IF systolic >= 130 OR diastolic >= 80 THEN severity = MODERATE AND recommend Cardiologist.',
      confidence: 'high',
      confidence_score: 1.0,
      disclaimer: DISCLAIMER,
      specialist_recommendation: {
        specialist_type: 'Cardiologist',
        reason: 'Triggered by rule R-017: Blood pressure threshold exceeded.',
        urgency: 'routine',
      },
    };
  }

  return {
    answer: 'RULE ENGINE: No matching rules found for this query. Escalating to AI Mode is recommended for nuanced analysis.',
    reasoning: 'Pattern matching against 847 clinical rules returned no confident match (threshold: 0.7). Query may require contextual reasoning.',
    confidence: 'low',
    confidence_score: 0.3,
    disclaimer: DISCLAIMER,
    specialist_recommendation: undefined,
  };
}
