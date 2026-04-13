import { ENV } from '@/constants/env';
import {
  createConsultation,
  updateConsultationResponse,
  DoctorResponse,
} from './firestoreService';

const WORKER_URL = ENV.workerUrl;

export async function requestConsultation(params: {
  insightId: string;
  insightText: string;
  healthProfile: object;
  recentEntries: any[];
}): Promise<{
  consultationId: string;
  doctorResponse: DoctorResponse;
} | null> {
  try {
    // 1. Create pending consultation record in Firestore
    const consultationId = await createConsultation(params);

    // 2. Call the worker /consult endpoint for AI-generated doctor response
    const resp = await fetch(`${WORKER_URL}/consult`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consultationId,
        insightText: params.insightText,
        healthProfile: params.healthProfile,
        recentEntries: params.recentEntries,
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      throw new Error((errBody as any)?.error ?? `Worker responded ${resp.status}`);
    }

    const data = await resp.json() as { success: boolean; consultationId: string; doctorResponse: DoctorResponse };

    if (!data.success || !data.doctorResponse) {
      throw new Error('Invalid consultation response from worker');
    }

    // 3. Persist the doctor response back to Firestore
    await updateConsultationResponse(consultationId, data.doctorResponse);

    return { consultationId, doctorResponse: data.doctorResponse };
  } catch (error) {
    console.error('[consultationService] requestConsultation failed:', error);
    return null;
  }
}
