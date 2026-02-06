export function Integrations() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Integrations</h1>
        <p className="text-slate-600 mt-2">
          Connect with third-party services and tools
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { name: 'Slack', icon: '💬', status: 'Coming Soon' },
          { name: 'Zapier', icon: '⚡', status: 'Coming Soon' },
          { name: 'GitHub', icon: '🐙', status: 'Coming Soon' },
        ].map((integration) => (
          <div
            key={integration.name}
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
          >
            <div className="text-4xl mb-4">{integration.icon}</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{integration.name}</h3>
            <p className="text-sm text-slate-600 mb-4">
              Connect {integration.name} to GreenFlow for enhanced workflow
            </p>
            <button
              disabled
              className="w-full px-4 py-2 bg-slate-100 text-slate-600 rounded-lg cursor-not-allowed font-medium text-sm"
            >
              {integration.status}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
