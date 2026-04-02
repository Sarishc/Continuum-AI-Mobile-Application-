import apiClient from './client';
import type { Insight, DoctorRecommendation, ApiResponse, Conversation, Message } from '../types';

export const insightsApi = {
  getInsights: (params?: { page?: number; limit?: number; dismissed?: boolean }) =>
    apiClient.get<ApiResponse<Insight[]>>('/insights', { params }),

  getInsight: (id: string) => apiClient.get<Insight>(`/insights/${id}`),

  dismissInsight: (id: string) =>
    apiClient.patch<Insight>(`/insights/${id}/dismiss`),

  getDoctorRecommendations: () =>
    apiClient.get<ApiResponse<DoctorRecommendation[]>>('/insights/doctors'),

  dismissRecommendation: (id: string) =>
    apiClient.patch<DoctorRecommendation>(`/insights/doctors/${id}/dismiss`),
};

export const chatApi = {
  getConversations: () =>
    apiClient.get<ApiResponse<Conversation[]>>('/chat/conversations'),

  getConversation: (id: string) =>
    apiClient.get<Conversation>(`/chat/conversations/${id}`),

  createConversation: (title?: string) =>
    apiClient.post<Conversation>('/chat/conversations', { title }),

  sendMessage: (conversationId: string, content: string) =>
    apiClient.post<Message>(`/chat/conversations/${conversationId}/messages`, {
      content,
    }),

  deleteConversation: (id: string) =>
    apiClient.delete(`/chat/conversations/${id}`),
};
