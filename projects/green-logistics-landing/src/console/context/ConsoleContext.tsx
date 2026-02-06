import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { ConsoleUser, ConsoleSettings } from '../types';

interface ConsoleContextType {
  // User
  user: ConsoleUser | null;
  setUser: (user: ConsoleUser | null) => void;

  // Settings
  settings: ConsoleSettings;
  updateSettings: (settings: Partial<ConsoleSettings>) => void;

  // UI State
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Notifications
  notification: {
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null;
  showNotification: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  clearNotification: () => void;
}

const ConsoleContext = createContext<ConsoleContextType | undefined>(undefined);

const DEFAULT_SETTINGS: ConsoleSettings = {
  theme: 'light',
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
  notificationsEnabled: true,
  emailDigestFrequency: 'WEEKLY',
};

interface ConsoleProviderProps {
  children: ReactNode;
}

export function ConsoleProvider({ children }: ConsoleProviderProps) {
  const [user, setUser] = useState<ConsoleUser | null>(null);
  const [settings, setSettings] = useState<ConsoleSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<ConsoleContextType['notification']>(null);

  const updateSettings = (newSettings: Partial<ConsoleSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    setNotification({ type, message });
    // Auto-clear after 5 seconds
    setTimeout(() => setNotification(null), 5000);
  };

  const clearNotification = () => {
    setNotification(null);
  };

  return (
    <ConsoleContext.Provider
      value={{
        user,
        setUser,
        settings,
        updateSettings,
        isLoading,
        setIsLoading,
        notification,
        showNotification,
        clearNotification,
      }}
    >
      {children}
    </ConsoleContext.Provider>
  );
}

export function useConsole() {
  const context = useContext(ConsoleContext);
  if (!context) {
    throw new Error('useConsole must be used within ConsoleProvider');
  }
  return context;
}
