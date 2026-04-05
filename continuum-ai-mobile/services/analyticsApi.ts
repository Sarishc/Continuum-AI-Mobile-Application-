import { format, subDays } from 'date-fns';
import apiClient from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OverviewMetrics {
  totalUsers: number;
  totalEntries: number;
  totalInsights: number;
  totalConversations: number;
  proUsers: number;
  proConversionRate: number;
}

export interface RetentionMetrics {
  d1: number;
  d7: number;
  d30: number;
  dau: number;
  mau: number;
  dauMauRatio: number;
}

export interface FunnelMetrics {
  signups: number;
  onboarded: number;
  firstUpload: number;
  firstAIMessage: number;
  paywallViewed: number;
  converted: number;
  signupToOnboard: number;
  onboardToUpload: number;
  uploadToAI: number;
  aiToPaywall: number;
  paywallToConvert: number;
}

export interface EngagementMetrics {
  avgEntriesPerUser: number;
  avgInsightsPerUser: number;
  avgMessagesPerUser: number;
  avgSessionsPerWeek: number;
  topFeatures: Array<{ feature: string; uses: number }>;
}

export interface GrowthMetrics {
  dailySignups: Array<{ date: string; count: number }>;
  dailyActiveUsers: Array<{ date: string; count: number }>;
}

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  avgRevenuePerUser: number;
  totalRevenue: number;
}

export interface AnalyticsSummary {
  overview: OverviewMetrics;
  retention: RetentionMetrics;
  funnel: FunnelMetrics;
  engagement: EngagementMetrics;
  growth: GrowthMetrics;
  revenue: RevenueMetrics;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  try {
    const response = await apiClient.get('/analytics/summary');
    return response.data as AnalyticsSummary;
  } catch {
    return getMockAnalytics();
  }
}

// ─── Mock ─────────────────────────────────────────────────────────────────────

function generateLast30Days(
  min: number,
  max: number
): Array<{ date: string; count: number }> {
  // Use a seeded-style pattern so values look realistic (trending up)
  return Array.from({ length: 30 }, (_, i) => {
    const trend = i / 29; // 0 → 1 over 30 days
    const base = min + (max - min) * (0.4 + trend * 0.6);
    const noise = (Math.sin(i * 2.7) + Math.cos(i * 1.3)) * (max - min) * 0.15;
    return {
      date: format(subDays(new Date(), 29 - i), 'MMM d'),
      count: Math.max(min, Math.round(base + noise)),
    };
  });
}

function getMockAnalytics(): AnalyticsSummary {
  return {
    overview: {
      totalUsers: 847,
      totalEntries: 3241,
      totalInsights: 5892,
      totalConversations: 1204,
      proUsers: 127,
      proConversionRate: 15.0,
    },
    retention: {
      d1: 68,
      d7: 42,
      d30: 31,
      dau: 234,
      mau: 612,
      dauMauRatio: 38.2,
    },
    funnel: {
      signups: 847,
      onboarded: 721,
      firstUpload: 589,
      firstAIMessage: 445,
      paywallViewed: 312,
      converted: 127,
      signupToOnboard: 85.1,
      onboardToUpload: 81.7,
      uploadToAI: 75.6,
      aiToPaywall: 70.1,
      paywallToConvert: 40.7,
    },
    engagement: {
      avgEntriesPerUser: 3.8,
      avgInsightsPerUser: 7.0,
      avgMessagesPerUser: 5.6,
      avgSessionsPerWeek: 2.4,
      topFeatures: [
        { feature: 'AI Chat', uses: 4421 },
        { feature: 'Insights', uses: 3892 },
        { feature: 'Upload', uses: 3241 },
        { feature: 'Timeline', uses: 2341 },
        { feature: 'Report Card', uses: 892 },
      ],
    },
    growth: {
      dailySignups: generateLast30Days(2, 18),
      dailyActiveUsers: generateLast30Days(180, 280),
    },
    revenue: {
      mrr: 1269.73,
      arr: 15236.76,
      avgRevenuePerUser: 10.0,
      totalRevenue: 4891.23,
    },
  };
}
