/**
 * Authentication Service
 * Handles JWT tokens, login, logout, and user session management
 */

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'SHIPPER' | 'CARRIER' | 'FLEET_OWNER' | 'BROKER' | 'ADMIN';
  companyName?: string;
  avatar?: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  companyName: string;
  role: string;
}

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

const TOKEN_STORAGE_KEY = 'auth_access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'auth_refresh_token';
const USER_STORAGE_KEY = 'auth_user';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';

export const tokenService = {
  /**
   * Store tokens in localStorage
   */
  setTokens(tokens: AuthTokens): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refreshToken);

    // Calculate expiry time
    const expiryTime = new Date().getTime() + tokens.expiresIn * 1000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  },

  /**
   * Get access token from localStorage
   */
  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  },

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  },

  /**
   * Check if access token is expired
   */
  isTokenExpired(): boolean {
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiryStr) return true;

    const expiryTime = parseInt(expiryStr, 10);
    const now = new Date().getTime();

    // Consider expired if less than 5 minutes remaining
    return now >= expiryTime - 5 * 60 * 1000;
  },

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  },

  /**
   * Get Authorization header value
   */
  getAuthorizationHeader(): string {
    const token = this.getAccessToken();
    return token ? `Bearer ${token}` : '';
  },
};

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export const userService = {
  /**
   * Store user in localStorage
   */
  setUser(user: User): void {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  },

  /**
   * Get stored user
   */
  getUser(): User | null {
    const userStr = localStorage.getItem(USER_STORAGE_KEY);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch (err) {
      console.error('Failed to parse stored user:', err);
      return null;
    }
  },

  /**
   * Clear stored user
   */
  clearUser(): void {
    localStorage.removeItem(USER_STORAGE_KEY);
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getUser() && !tokenService.isTokenExpired();
  },
};

// ============================================================================
// AUTH API CALLS (to be implemented on backend)
// ============================================================================

export const authAPI = {
  /**
   * Login with email and password
   * TODO: Implement on backend
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    // Mock implementation for now
    // eslint-disable-next-line no-console
    console.log('Login request:', credentials);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock response
    return {
      user: {
        id: 'user-123',
        email: credentials.email,
        displayName: credentials.email.split('@')[0],
        role: 'SHIPPER',
        companyName: 'Test Company',
        createdAt: new Date().toISOString(),
      },
      tokens: {
        accessToken: 'mock-jwt-token-' + Date.now(),
        refreshToken: 'mock-refresh-token-' + Date.now(),
        expiresIn: 86400, // 24 hours
      },
    };

    // Real implementation would be:
    /*
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    return response.json();
    */
  },

  /**
   * Register new user
   * TODO: Implement on backend
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    // Mock implementation for now
    // eslint-disable-next-line no-console
    console.log('Register request:', data);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      user: {
        id: 'user-' + Date.now(),
        email: data.email,
        displayName: data.companyName,
        role: (data.role as any) || 'SHIPPER',
        companyName: data.companyName,
        createdAt: new Date().toISOString(),
      },
      tokens: {
        accessToken: 'mock-jwt-token-' + Date.now(),
        refreshToken: 'mock-refresh-token-' + Date.now(),
        expiresIn: 86400,
      },
    };
  },

  /**
   * Logout (backend-side token revocation)
   * TODO: Implement on backend
   */
  async logout(): Promise<void> {
    // Mock implementation
    console.log('Logout request');

    // Real implementation would call backend to revoke token
    /*
    const token = tokenService.getAccessToken();
    if (!token) return;

    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    */
  },

  /**
   * Refresh access token
   * TODO: Implement on backend
   */
  async refreshToken(): Promise<AuthTokens> {
    // Mock implementation
    console.log('Refresh token request');

    return {
      accessToken: 'mock-jwt-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
      expiresIn: 86400,
    };

    /*
    const refreshToken = tokenService.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    return response.json();
    */
  },

  /**
   * Get current user profile
   * TODO: Implement on backend
   */
  async getCurrentUser(): Promise<User> {
    const token = tokenService.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    // Mock implementation
    const user = userService.getUser();
    if (!user) {
      throw new Error('User not found');
    }

    return user;

    /*
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': tokenService.getAuthorizationHeader(),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }

    return response.json();
    */
  },

  /**
   * Update user profile
   * TODO: Implement on backend
   */
  async updateProfile(data: Partial<User>): Promise<User> {
    // Mock implementation
    console.log('Update profile request:', data);

    const currentUser = userService.getUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const updatedUser = { ...currentUser, ...data };
    userService.setUser(updatedUser);
    return updatedUser;
  },
};

// ============================================================================
// AUTH CONTEXT (to be used with React Context API)
// ============================================================================

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// Auth context factory function
export const createAuthContext = (): AuthContextType => {
  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    login: async () => {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    register: async () => {},
    logout: async () => {},
    clearError: () => {},
  };
};
