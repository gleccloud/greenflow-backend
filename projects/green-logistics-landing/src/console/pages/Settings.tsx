/**
 * Settings Page
 * API connection, security info, notifications, display preferences, danger zone
 */

import { useState } from 'react';
import { Bell, Lock, User, Monitor, AlertTriangle } from 'lucide-react';
import { useConsole } from '../context/ConsoleContext';

const DEMO_API_KEY = import.meta.env.VITE_API_KEY || '550e8400e29b41d4a716446655440000';

const DEFAULT_SETTINGS = {
  theme: 'light' as const,
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
  notificationsEnabled: true,
  emailDigestFrequency: 'WEEKLY' as const,
};

export function Settings() {
  const { settings, updateSettings, showNotification } = useConsole();
  const currentApiKey = localStorage.getItem('api_key') || DEMO_API_KEY;
  const [apiKeyInput, setApiKeyInput] = useState(currentApiKey);
  const [saved, setSaved] = useState(false);

  const [notifications, setNotifications] = useState({
    highErrorRate: settings.notificationsEnabled,
    quotaWarnings: settings.notificationsEnabled,
    apiKeyExpiration: settings.notificationsEnabled,
  });

  const handleSaveApiKey = () => {
    localStorage.setItem('api_key', apiKeyInput);
    setSaved(true);
    showNotification('success', 'API key saved successfully');
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetApiKey = () => {
    setApiKeyInput(DEMO_API_KEY);
    localStorage.setItem('api_key', DEMO_API_KEY);
    showNotification('info', 'API key reset to default');
  };

  const handleNotificationChange = (key: keyof typeof notifications, value: boolean) => {
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);
    updateSettings({
      notificationsEnabled: Object.values(updated).some((v) => v),
    });
  };

  const handleResetConsole = () => {
    if (window.confirm('This will clear all local settings and cached data. Continue?')) {
      localStorage.clear();
      updateSettings(DEFAULT_SETTINGS);
      setApiKeyInput(DEMO_API_KEY);
      setNotifications({ highErrorRate: true, quotaWarnings: true, apiKeyExpiration: true });
      showNotification('info', 'Console data reset successfully');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-2">Manage your account and preferences</p>
        <p className="text-xs text-slate-400 mt-1">
          All settings are stored locally in your browser. Changes apply only to this device.
        </p>
      </div>

      {/* API Connection */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-6 h-6 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-900">API Connection</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">API Key</label>
            <input
              type="text"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Enter your API key"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              This key is used for all API requests from this console.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">API Base URL</label>
            <input
              type="text"
              value={import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v2'}
              readOnly
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              Set via VITE_API_BASE_URL environment variable.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSaveApiKey}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              {saved ? 'Saved!' : 'Save API Key'}
            </button>
            <button
              onClick={handleResetApiKey}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Reset to Default
            </button>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-6 h-6 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-900">Security</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-900">Authentication Method</p>
              <p className="text-xs text-slate-600">API Key via X-API-Key header</p>
            </div>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
              Active
            </span>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-900">Password Authentication</p>
              <p className="text-xs text-slate-600">Email + password login for console access</p>
            </div>
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">
              Planned
            </span>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Two-Factor Authentication</p>
              <p className="text-xs text-slate-600">TOTP-based second factor for enhanced security</p>
            </div>
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">
              Planned
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-6 h-6 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
        </div>

        <div className="space-y-4">
          {[
            {
              key: 'highErrorRate' as const,
              name: 'High Error Rate Alerts',
              description: 'Get notified when error rate exceeds threshold',
            },
            {
              key: 'quotaWarnings' as const,
              name: 'Quota Warnings',
              description: 'Alerts when approaching request limits',
            },
            {
              key: 'apiKeyExpiration' as const,
              name: 'API Key Expiration',
              description: 'Reminders for expiring API keys',
            },
          ].map((notification) => (
            <label
              key={notification.key}
              className="flex items-center gap-3 py-3 border-b border-slate-200 last:border-0 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={notifications[notification.key]}
                onChange={(e) => handleNotificationChange(notification.key, e.target.checked)}
                className="rounded w-4 h-4 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{notification.name}</p>
                <p className="text-xs text-slate-600">{notification.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Display Preferences */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <Monitor className="w-6 h-6 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-900">Display Preferences</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Timezone</label>
            <select
              value={settings.timezone}
              onChange={(e) => updateSettings({ timezone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="UTC">UTC</option>
              <option value="Asia/Seoul">Asia/Seoul (KST, UTC+9)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST, UTC+9)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Date Format</label>
            <select
              value={settings.dateFormat}
              onChange={(e) => updateSettings({ dateFormat: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="YYYY-MM-DD">2026-02-07 (ISO)</option>
              <option value="DD/MM/YYYY">07/02/2026</option>
              <option value="MM/DD/YYYY">02/07/2026</option>
            </select>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-red-200">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-slate-900">Reset Console Data</p>
            <p className="text-xs text-slate-600">Clear all local settings, cached data, and API key</p>
          </div>
          <button
            onClick={handleResetConsole}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium text-sm"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
