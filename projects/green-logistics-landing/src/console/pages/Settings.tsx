import { Bell, Lock, User } from 'lucide-react';

export function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-2">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Settings */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-6 h-6 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value="developer@greenflow.io"
              readOnly
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Organization
            </label>
            <input
              type="text"
              value="Acme Corp"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium">
            Save Changes
          </button>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-6 h-6 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-900">Security</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-900">Password</p>
              <p className="text-xs text-slate-600">Change your password regularly</p>
            </div>
            <button className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm">
              Change
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Two-Factor Authentication</p>
              <p className="text-xs text-slate-600">Add extra security to your account</p>
            </div>
            <button className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm">
              Enable
            </button>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-6 h-6 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
        </div>

        <div className="space-y-4">
          {[
            {
              name: 'High Error Rate Alerts',
              description: 'Get notified when error rate exceeds threshold',
            },
            {
              name: 'Quota Warnings',
              description: 'Alerts when approaching request limits',
            },
            {
              name: 'API Key Expiration',
              description: 'Reminders for expiring API keys',
            },
          ].map((notification) => (
            <label
              key={notification.name}
              className="flex items-center gap-3 py-3 border-b border-slate-200 last:border-0 cursor-pointer"
            >
              <input type="checkbox" defaultChecked className="rounded w-4 h-4" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{notification.name}</p>
                <p className="text-xs text-slate-600">{notification.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
