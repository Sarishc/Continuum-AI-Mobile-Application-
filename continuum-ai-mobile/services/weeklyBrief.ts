import apiClient from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BriefImprovement {
  title: string;
  detail: string;
}

export interface BriefAttentionItem {
  title: string;
  detail: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
}

export interface WeeklyBriefData {
  weekLabel: string;
  previousScore: number;
  currentScore: number;
  scoreDelta: number;
  entriesThisWeek: number;
  newInsightsCount: number;
  worstSeverity: string;
  currentStreak: number;
  improvements: BriefImprovement[];
  attentionItems: BriefAttentionItem[];
  aiInsight: string;
  actionableTip: string;
  nextSteps: string[];
  generatedAt: string;
}

// ─── Fetch from backend ───────────────────────────────────────────────────────

export async function fetchWeeklyBrief(): Promise<WeeklyBriefData> {
  try {
    const response = await apiClient.post('/health/weekly-brief');
    return response.data as WeeklyBriefData;
  } catch {
    return getMockWeeklyBrief();
  }
}

// ─── Share text ───────────────────────────────────────────────────────────────

export function generateShareText(brief: WeeklyBriefData): string {
  const sign = brief.scoreDelta > 0 ? '+' : '';
  return [
    'My Continuum AI Weekly Health Brief',
    '',
    `Health Score: ${brief.previousScore} → ${brief.currentScore} (${sign}${brief.scoreDelta} pts)`,
    `Entries logged: ${brief.entriesThisWeek}`,
    `Day streak: ${brief.currentStreak} 🔥`,
    '',
    `This week's tip: ${brief.actionableTip}`,
    '',
    'Track your health with Continuum AI — continuum-health.app',
  ].join('\n');
}

// ─── Mock fallback ────────────────────────────────────────────────────────────

export function getMockWeeklyBrief(): WeeklyBriefData {
  return {
    weekLabel: 'March 31 – April 6, 2026',
    previousScore: 64,
    currentScore: 68,
    scoreDelta: 4,
    entriesThisWeek: 3,
    newInsightsCount: 2,
    worstSeverity: 'high',
    currentStreak: 5,
    improvements: [
      {
        title: 'HbA1c trending down',
        detail: '3.8% improvement — now estimated at 6.6%',
      },
      {
        title: 'Blood pressure stabilizing',
        detail: '132/84 vs 138/88 four weeks ago',
      },
    ],
    attentionItems: [
      {
        title: 'Morning headaches continuing',
        detail: 'May be Lisinopril-related. Discuss timing with doctor.',
        severity: 'moderate',
      },
    ],
    aiInsight:
      'Your metabolic markers are responding well to lifestyle changes. The combination of dietary modification and daily walks has produced measurable improvements in glucose regulation over 6 weeks — faster than average. Maintaining this momentum through the next 8 weeks is critical for reaching normal HbA1c range. This is not medical advice.',
    actionableTip:
      'Take Metformin with your largest meal rather than breakfast — this reduces GI side effects and improves absorption timing with peak glucose.',
    nextSteps: [
      'Log blood pressure readings every morning this week',
      'Schedule follow-up with Endocrinologist for HbA1c recheck',
      "Continue 30-minute post-dinner walks — they're working",
    ],
    generatedAt: new Date().toISOString(),
  };
}
