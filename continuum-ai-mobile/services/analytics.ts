import apiClient from '../api/client';
import { firebaseLogEvent } from './firebase';

// ─── Event types ──────────────────────────────────────────────────────────────

export type AnalyticsEvent =
  | 'app_opened'
  | 'signup_completed'
  | 'login_completed'
  | 'onboarding_completed'
  | 'entry_uploaded'
  | 'ai_message_sent'
  | 'insight_viewed'
  | 'insight_expanded'
  | 'specialist_viewed'
  | 'report_card_shared'
  | 'report_card_saved'
  | 'weekly_brief_viewed'
  | 'pro_paywall_viewed'
  | 'pro_purchase_started'
  | 'pro_purchase_completed'
  | 'demo_entered'
  | 'demo_converted'
  // Referral events
  | 'referral_page_viewed'
  | 'referral_code_copied'
  | 'referral_shared'
  | 'referral_applied'
  | 'referral_rewarded';

// ─── Track ────────────────────────────────────────────────────────────────────

// Fire-and-forget — never block the UI
export async function track(
  event: AnalyticsEvent,
  properties?: Record<string, string | number | boolean>
): Promise<void> {
  // Mirror every event to Firebase Analytics (best-effort)
  firebaseLogEvent(event, properties);

  try {
    await apiClient.post('/analytics/track', {
      event,
      properties: properties ?? {},
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Fail silently — analytics must never crash the app
  }
}

// ─── Session ──────────────────────────────────────────────────────────────────

export const session = {
  startTime: Date.now(),
  screenViews: 0,

  getSessionDuration(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  },
};
