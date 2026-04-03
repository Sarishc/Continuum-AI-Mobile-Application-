import apiClient from './client';
import type { HealthProfile, HealthEntry, ApiResponse } from '../types';

export const healthApi = {
  getProfile: () =>
    apiClient.get<HealthProfile>('/health/profile'),

  updateProfile: (data: Partial<HealthProfile>) =>
    apiClient.patch<HealthProfile>('/health/profile', data),

  getTimeline: (params?: { page?: number; limit?: number; type?: string }) =>
    apiClient.get<ApiResponse<HealthEntry[]>>('/health/timeline', { params }),

  getEntry: (id: string) =>
    apiClient.get<HealthEntry>(`/health/entries/${id}`),

  createEntry: (data: Omit<HealthEntry, 'id' | 'userId' | 'createdAt'>) =>
    apiClient.post<HealthEntry>('/health/entries', data),

  /**
   * Upload a health document (PDF or image) as multipart/form-data.
   * The backend extracts text, runs AI analysis, and returns a structured entry.
   */
  uploadEntry: (formData: FormData) =>
    apiClient.post<HealthEntry>('/health/entries', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updateEntry: (id: string, data: Partial<HealthEntry>) =>
    apiClient.patch<HealthEntry>(`/health/entries/${id}`, data),

  deleteEntry: (id: string) =>
    apiClient.delete(`/health/entries/${id}`),

  getHealthScore: () =>
    apiClient.get<{ score: number; breakdown: Record<string, number> }>(
      '/health/score'
    ),
};
