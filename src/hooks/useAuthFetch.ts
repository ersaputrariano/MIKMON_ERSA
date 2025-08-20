import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook for making authenticated fetch requests.
 * It automatically adds the Authorization header and handles session expiration.
 * @returns {Function} An authenticated fetch function.
 */
export const useAuthFetch = () => {
  const { token, logout } = useAuth();

  const authFetch = useCallback(async (url: string, options?: RequestInit): Promise<Response> => {
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const combinedHeaders: HeadersInit = {
      ...defaultHeaders,
      ...(options?.headers as Record<string, string>),
      'Authorization': `Bearer ${token}`,
    };

    const response = await fetch(url, { ...options, headers: combinedHeaders });

    if (response.status === 401 || response.status === 403) {
      logout();
      throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
    }

    return response;
  }, [token, logout]);

  return authFetch;
};