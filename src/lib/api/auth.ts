import apiClient, { handleApiResponse } from './client';
import type {
  LoginCredentials,
  LoginResponse,
  User,
  BackendLoginResponse
} from '@/types/auth';
import type { ApiResponse } from '@/types/api';

/**
 * Transform backend login response (snake_case) to frontend format (camelCase)
 */
function transformBackendLoginResponse(backendResponse: BackendLoginResponse): LoginResponse {
  const { access_token, refresh_token, user } = backendResponse;

  // Transform user object
  const transformedUser: User = {
    id: user.id,
    email: user.email,
    name: user.full_name || user.email.split('@')[0], // Use email prefix if full_name is empty
    role: user.role,
    createdAt: new Date(user.created_at),
  };

  return {
    user: transformedUser,
    tokens: {
      accessToken: access_token,
      refreshToken: refresh_token,
    },
  };
}

export const authApi = {
  /**
   * Login with email and password
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await apiClient.post<BackendLoginResponse>('/api/auth/login', credentials);
    return transformBackendLoginResponse(response.data);
  },

  /**
   * Logout current user
   */
  logout: async (): Promise<void> => {
    return handleApiResponse<void>(
      apiClient.post<ApiResponse<void>>('/api/auth/logout')
    );
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async (): Promise<User> => {
    return handleApiResponse<User>(
      apiClient.get<ApiResponse<User>>('/api/auth/me')
    );
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<LoginResponse> => {
    // Backend expects snake_case: refresh_token
    const response = await apiClient.post<BackendLoginResponse>('/api/auth/refresh', {
      refresh_token: refreshToken,
    });
    return transformBackendLoginResponse(response.data);
  },
};
