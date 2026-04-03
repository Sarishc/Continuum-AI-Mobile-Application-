// ─── User & Auth ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// ─── Health Profile ───────────────────────────────────────────────────────────

export interface HealthProfile {
  userId: string;
  dateOfBirth?: string;
  biologicalSex?: 'male' | 'female' | 'other';
  heightCm?: number;
  weightKg?: number;
  bloodType?: string;
  allergies: string[];
  medications: Medication[];
  conditions: string[];
  updatedAt: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate?: string;
}

// ─── Health Entry ─────────────────────────────────────────────────────────────

export type HealthEntryType =
  | 'symptom'
  | 'vital'
  | 'lab_result'
  | 'medication'
  | 'appointment'
  | 'note';

export type SeverityLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface HealthEntry {
  id: string;
  userId: string;
  type: HealthEntryType;
  title: string;
  description?: string;
  severity?: SeverityLevel;
  value?: number | string;
  unit?: string;
  tags: string[];
  attachments: Attachment[];
  recordedAt: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'pdf' | 'audio';
  url: string;
  name: string;
  sizeBytes: number;
}

// ─── Insights ────────────────────────────────────────────────────────────────

export type InsightCategory =
  | 'pattern'
  | 'risk'
  | 'recommendation'
  | 'correlation'
  | 'milestone';

export interface Insight {
  id: string;
  userId: string;
  category: InsightCategory;
  title: string;
  summary: string;
  details: string;
  severity: SeverityLevel;
  confidence: number; // 0–1
  relatedEntryIds: string[];
  actionable: boolean;
  dismissed: boolean;
  generatedAt: string;
}

// ─── Chat Messages ────────────────────────────────────────────────────────────

export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type EngineMode = 'rule' | 'ai';

export interface ChatAttachment {
  name: string;
  type: string; // mime type
  uri: string;
}

export interface SpecialistRecommendation {
  type: string;
  reason: string;
  urgency: 'routine' | 'soon' | 'urgent' | 'emergency';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string; // ISO string
  // AI-response extras
  confidence?: ConfidenceLevel;
  confidenceScore?: number;
  reasoning?: string;
  disclaimer?: string;
  specialist?: SpecialistRecommendation;
  // User-message extras
  attachment?: ChatAttachment;
  // UI state (not persisted to API)
  reasoningExpanded?: boolean;
}

export interface AIAskResponse {
  answer: string;
  reasoning: string;
  confidence: ConfidenceLevel;
  confidence_score: number;
  disclaimer: string;
  specialist_recommendation?: {
    specialist_type: string;
    reason: string;
    urgency: 'routine' | 'soon' | 'urgent';
  };
}

// ─── Conversations ────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';

/** Legacy Message type kept for API layer compatibility */
export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  attachments?: Attachment[];
  createdAt: string;
}

// ─── Doctor Recommendation ────────────────────────────────────────────────────

export interface DoctorRecommendation {
  id: string;
  userId: string;
  specialty: string;
  urgency: 'routine' | 'soon' | 'urgent' | 'emergency';
  reason: string;
  relatedInsightIds: string[];
  generatedAt: string;
  dismissed: boolean;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export type AnalyticsEventName =
  | 'screen_view'
  | 'entry_created'
  | 'insight_viewed'
  | 'insight_dismissed'
  | 'chat_message_sent'
  | 'onboarding_step_completed'
  | 'export_initiated';

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  properties?: Record<string, string | number | boolean>;
  timestamp: string;
  sessionId: string;
  userId?: string;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
}
