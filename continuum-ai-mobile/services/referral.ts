import apiClient from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReferralData {
  code: string;
  referralUrl: string;
  totalReferrals: number;
  pendingReferrals: number;
  rewardedReferrals: number;
}

export interface ReferralHistoryItem {
  name: string;
  date: string;
  status: 'rewarded' | 'pending';
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function getMyReferralCode(): Promise<ReferralData | null> {
  try {
    const response = await apiClient.get('/referrals/my-code');
    return response.data as ReferralData;
  } catch {
    return getMockReferralData();
  }
}

export async function validateCode(
  code: string
): Promise<{ valid: boolean; referrerName: string | null }> {
  try {
    const response = await apiClient.get(`/referrals/validate?code=${code}`);
    return response.data;
  } catch {
    // Mock: any NAME-XXXX pattern is "valid" in dev
    const isValidFormat = /^[A-Z]+-[A-Z0-9]{4}$/.test(code);
    return {
      valid: isValidFormat,
      referrerName: isValidFormat ? 'a friend' : null,
    };
  }
}

export async function applyReferralCode(code: string): Promise<boolean> {
  try {
    await apiClient.post('/referrals/apply', { code });
    return true;
  } catch {
    return false;
  }
}

export async function getReferralHistory(): Promise<ReferralHistoryItem[]> {
  try {
    const response = await apiClient.get('/referrals/history');
    return response.data as ReferralHistoryItem[];
  } catch {
    return [
      { name: 'Sarah K.', date: '2 days ago', status: 'rewarded' },
      { name: 'Marcus T.', date: '1 week ago', status: 'rewarded' },
      { name: 'Priya M.', date: '3 days ago', status: 'pending' },
    ];
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function generateShareMessage(code: string): string {
  return `I've been using Continuum AI to understand my health data — it's incredible. Use my code ${code} when you sign up and we both get 7 days Pro free!

Download: https://continuum-health.app/invite/${code}`;
}

// ─── Mock ─────────────────────────────────────────────────────────────────────

function getMockReferralData(): ReferralData {
  return {
    code: 'ALEX-K9M2',
    referralUrl: 'https://continuum-health.app/invite/ALEX-K9M2',
    totalReferrals: 3,
    pendingReferrals: 1,
    rewardedReferrals: 2,
  };
}
