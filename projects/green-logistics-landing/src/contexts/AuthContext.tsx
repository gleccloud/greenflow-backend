/**
 * Auth Context Provider
 * Manages authentication state globally
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import {
  authAPI,
  tokenService,
  userService,
  type User,
  type LoginRequest,
  type RegisterRequest,
  type AuthContextType,
} from '../services/auth';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedUser = userService.getUser();
        if (storedUser && !tokenService.isTokenExpired()) {
          setUser(storedUser);
        } else {
          tokenService.clearTokens();
          userService.clearUser();
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authAPI.login(credentials);

      tokenService.setTokens(response.tokens);
      userService.setUser(response.user);

      setUser(response.user);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '로그인에 실패했습니다';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authAPI.register(data);

      tokenService.setTokens(response.tokens);
      userService.setUser(response.user);

      setUser(response.user);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '회원가입에 실패했습니다';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await authAPI.logout();

      tokenService.clearTokens();
      userService.clearUser();
      setUser(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '로그아웃에 실패했습니다';
      setError(message);
      // eslint-disable-next-line no-console
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user && !tokenService.isTokenExpired(),
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook
 * Access authentication state and methods
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

/**
 * useIsAdmin Hook
 * Check if user is admin
 */
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return user?.role === 'ADMIN';
}

/**
 * useHasRole Hook
 * Check if user has specific role
 */
export function useHasRole(role: string): boolean {
  const { user } = useAuth();
  return user?.role === role;
}

export default AuthContext;
