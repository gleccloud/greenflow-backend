/**
 * useAPIKeys Hook
 * Manages API keys state and operations
 */

import { useState, useCallback, useEffect } from 'react';
import { apiKeyService } from '../services/apiKeyService';
import { useConsole } from '../context/ConsoleContext';
import type { APIKey, CreateAPIKeyRequest } from '../types';

export function useAPIKeys() {
  const { showNotification, setIsLoading } = useConsole();
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<APIKey | null>(null);

  // Fetch API keys
  const fetchKeys = useCallback(async (pageNum = 1) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await apiKeyService.listAPIKeys(pageNum, pageSize);
      setKeys(result.keys);
      setTotal(result.total);
      setPage(result.page);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch API keys';
      setError(message);
      showNotification('error', message);
    } finally {
      setIsLoading(false);
    }
  }, [pageSize, setIsLoading, showNotification]);

  // Create API key
  const createKey = useCallback(async (request: CreateAPIKeyRequest) => {
    try {
      setIsLoading(true);
      const result = await apiKeyService.createAPIKey(request);
      showNotification('success', 'API key created successfully');
      await fetchKeys(1);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create API key';
      setError(message);
      showNotification('error', message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchKeys, setIsLoading, showNotification]);

  // Revoke API key
  const revokeKey = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      await apiKeyService.revokeAPIKey(id);
      showNotification('success', 'API key revoked successfully');
      await fetchKeys(page);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to revoke API key';
      setError(message);
      showNotification('error', message);
    } finally {
      setIsLoading(false);
    }
  }, [fetchKeys, page, setIsLoading, showNotification]);

  // Rotate API key
  const rotateKey = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      const result = await apiKeyService.rotateAPIKey(id);
      showNotification('success', 'API key rotated successfully');
      await fetchKeys(page);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rotate API key';
      setError(message);
      showNotification('error', message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchKeys, page, setIsLoading, showNotification]);

  // Delete API key
  const deleteKey = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      await apiKeyService.deleteAPIKey(id);
      showNotification('success', 'API key deleted successfully');
      await fetchKeys(page);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete API key';
      setError(message);
      showNotification('error', message);
    } finally {
      setIsLoading(false);
    }
  }, [fetchKeys, page, setIsLoading, showNotification]);

  // Initial fetch
  useEffect(() => {
    fetchKeys(1);
  }, []);

  return {
    keys,
    total,
    page,
    pageSize,
    error,
    selectedKey,
    setSelectedKey,
    fetchKeys,
    createKey,
    revokeKey,
    rotateKey,
    deleteKey,
    setPageSize,
  };
}
