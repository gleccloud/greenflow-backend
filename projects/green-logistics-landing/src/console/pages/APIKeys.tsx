/**
 * API Keys Management Page
 */

import { useState } from 'react';
import { Copy, Trash2, RotateCw, Eye, EyeOff, Plus } from 'lucide-react';
import { useAPIKeys } from '../hooks/useAPIKeys';
import { mockAPIKeys } from '../data/mockConsoleData';

export function APIKeys() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedKeyToReveal, setSelectedKeyToReveal] = useState<string | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['bids.read', 'fleets.read']);
  const [expirationDate, setExpirationDate] = useState<string>('');

  // Phase 3: Use useAPIKeys hook - falls back to mock data if API unavailable
  const { keys, error, createKey, revokeKey, rotateKey } = useAPIKeys();

  // Fallback to mock data if no keys loaded (API not available)
  const displayKeys = keys.length > 0 ? keys : mockAPIKeys;

  const getStatusColor = (status: string) => {
    return status === 'ACTIVE'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-8">
      {/* Error Notice */}
      {error && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm text-orange-800">
            ⚠️ {error} - Using cached data. Please check your connection.
          </p>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">API Keys</h1>
          <p className="text-slate-600 mt-2">Manage and secure your API keys</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
        >
          <Plus size={18} />
          Create New Key
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Create New API Key</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Key Name</label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Production API Key"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Scopes</label>
              <div className="space-y-2">
                {['bids.read', 'bids.write', 'fleets.read', 'proposals.read'].map((scope) => (
                  <label key={scope} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(scope)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedScopes([...selectedScopes, scope]);
                        } else {
                          setSelectedScopes(selectedScopes.filter(s => s !== scope));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-700">{scope}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Expiration (optional)
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={async () => {
                  if (newKeyName.trim()) {
                    await createKey({
                      name: newKeyName,
                      scopes: selectedScopes,
                      ...(expirationDate && { expiresAt: new Date(expirationDate).toISOString() })
                    });
                    setShowCreateForm(false);
                    setNewKeyName('');
                    setSelectedScopes(['bids.read', 'fleets.read']);
                    setExpirationDate('');
                  }
                }}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                Create Key
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keys Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  Key
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  Created
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  Last Used
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  Requests
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {displayKeys.map((key) => (
                <tr key={key.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-900">{key.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded font-mono">
                        {key.keyPrefix}...
                      </code>
                      <button
                        onClick={() =>
                          setSelectedKeyToReveal(
                            selectedKeyToReveal === key.id ? null : key.id
                          )
                        }
                        className="p-1 text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        {selectedKeyToReveal === key.id ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(key.keyPrefix);
                        }}
                        className="p-1 text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {key.rateLimit.requestsPerDay.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(key.status)}`}>
                      {key.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {key.status === 'ACTIVE' && (
                        <>
                          <button
                            onClick={() => rotateKey(key.id)}
                            className="p-1 text-slate-500 hover:text-slate-700 transition-colors"
                            title="Rotate API Key"
                          >
                            <RotateCw size={16} />
                          </button>
                          <button
                            onClick={() => revokeKey(key.id)}
                            className="p-1 text-red-500 hover:text-red-700 transition-colors"
                            title="Revoke API Key"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Management Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Security Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Store API keys securely and never commit them to version control</li>
          <li>Rotate keys regularly for enhanced security</li>
          <li>Use IP whitelisting to restrict access</li>
          <li>Monitor unused keys and revoke them promptly</li>
        </ul>
      </div>
    </div>
  );
}
