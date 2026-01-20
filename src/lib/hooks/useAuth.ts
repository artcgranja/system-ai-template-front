import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { authApi } from '@/lib/api/auth';
import { ROUTES, STORAGE_KEYS } from '@/config/constants';
import type { LoginCredentials } from '@/types/auth';
import type { ApiError } from '@/types/api';

/**
 * Safely extract error information from various error types
 */
function extractErrorInfo(error: unknown): {
  message: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
} {
  // Handle ApiError type
  if (error && typeof error === 'object' && 'message' in error) {
    const apiError = error as ApiError;
    return {
      message: apiError.message || 'Unknown error occurred',
      code: apiError.code,
      statusCode: apiError.statusCode,
      details: apiError.details,
    };
  }

  // Handle Error instances
  if (error instanceof Error) {
    return {
      message: error.message || 'Unknown error occurred',
      code: (error as { code?: string }).code,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
    };
  }

  // Fallback for unknown error types
  return {
    message: 'Unknown error occurred',
    details: { rawError: String(error) },
  };
}

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, login: storeLogin, logout: storeLogout, setLoading } = useAuthStore();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      storeLogin(data.user, data.tokens.accessToken);

      // Store refresh token in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.refreshToken, data.tokens.refreshToken);
      }

      router.push(ROUTES.chat);
    },
    onError: (error: unknown) => {
      // Extract error information properly
      const errorInfo = extractErrorInfo(error);
      
      // Safely get error type for debugging
      const errorType = error && typeof error === 'object' && 'constructor' in error
        ? (error as { constructor?: { name?: string } }).constructor?.name
        : typeof error;
      
      console.error('[useAuth] Login error:', {
        ...errorInfo,
        errorType,
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.clear(); // Clear all React Query cache
      storeLogout();
      router.push(ROUTES.login);
    },
    onError: () => {
      // Even if API call fails, logout locally
      queryClient.clear(); // Clear cache even on error
      storeLogout();
      router.push(ROUTES.login);
    },
  });

  // Get current user query
  const { refetch: refetchUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authApi.getCurrentUser(),
    enabled: isAuthenticated && !user,
    retry: false,
  });

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setLoading(true);
      try {
        await loginMutation.mutateAsync(credentials);
      } catch (error) {
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [loginMutation, setLoading]
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await logoutMutation.mutateAsync();
    } finally {
      setLoading(false);
    }
  }, [logoutMutation, setLoading]);

  return {
    user,
    isAuthenticated,
    isLoading: loginMutation.isPending || logoutMutation.isPending,
    login,
    logout,
    loginError: loginMutation.error,
    refetchUser,
  };
}
