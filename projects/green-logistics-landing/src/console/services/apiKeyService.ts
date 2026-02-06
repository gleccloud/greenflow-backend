/**
 * API Key Service
 * Handles all API key operations (CRUD, rotation, etc.)
 */

import { apiClient } from './apiClient';
import type { APIKey, CreateAPIKeyRequest, APIKeyResponse } from '../types';

export const apiKeyService = {
  /**
   * Get all API keys for the current user
   */
  async listAPIKeys(page = 1, pageSize = 20) {
    const response = await apiClient.get<{
      keys: APIKey[];
      total: number;
      page: number;
      pageSize: number;
    }>('/console/api-keys', { page, pageSize });
    return response.data;
  },

  /**
   * Get a specific API key by ID
   */
  async getAPIKey(id: string) {
    const response = await apiClient.get<APIKey>(`/console/api-keys/${id}`);
    return response.data;
  },

  /**
   * Create a new API key
   */
  async createAPIKey(request: CreateAPIKeyRequest) {
    const response = await apiClient.post<APIKeyResponse>('/console/api-keys', request);
    return response.data;
  },

  /**
   * Update an existing API key
   */
  async updateAPIKey(id: string, updates: Partial<APIKey>) {
    const response = await apiClient.put<APIKey>(`/console/api-keys/${id}`, updates);
    return response.data;
  },

  /**
   * Revoke an API key
   */
  async revokeAPIKey(id: string) {
    const response = await apiClient.post<APIKey>(`/console/api-keys/${id}/revoke`, {});
    return response.data;
  },

  /**
   * Rotate an API key (generate new key, invalidate old one)
   */
  async rotateAPIKey(id: string) {
    const response = await apiClient.post<APIKeyResponse>(`/console/api-keys/${id}/rotate`, {});
    return response.data;
  },

  /**
   * Delete an API key
   */
  async deleteAPIKey(id: string) {
    await apiClient.delete(`/console/api-keys/${id}`);
  },

  /**
   * Test an API key validity
   */
  async testAPIKey(key: string) {
    const response = await apiClient.post<{ valid: boolean; expiresAt?: string }>(
      '/console/api-keys/test',
      { key }
    );
    return response.data;
  },
};
