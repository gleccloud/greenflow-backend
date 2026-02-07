/**
 * API Keys Management Page
 */

import React, { useState, useCallback } from 'react';
import { Copy, Trash2, RotateCw, Eye, EyeOff, Plus, Key, Check, Pencil } from 'lucide-react';
import { useAPIKeys } from '../hooks/useAPIKeys';
import { useConsole } from '../context/ConsoleContext';

/** Available scopes from backend SCOPE_REGISTRY */
const AVAILABLE_SCOPES = [
  { value: 'read:fleet', label: 'Read Fleet' },
  { value: 'read:ei', label: 'Read EI' },
  { value: 'write:fleet', label: 'Write Fleet' },
  { value: 'read:bids', label: 'Read Bids' },
  { value: 'write:bids', label: 'Write Bids' },
  { value: 'read:orders', label: 'Read Orders' },
  { value: 'write:orders', label: 'Write Orders' },
  { value: 'read:integrity', label: 'Read Integrity' },
  { value: 'write:integrity', label: 'Write Integrity' },
  { value: 'read:console', label: 'Read Console' },
];

export function APIKeys() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedKeyToReveal, setSelectedKeyToReveal] = useState<string | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['read:fleet', 'read:ei']);
  const [expirationDate, setExpirationDate] = useState<string>('');
  // Store full keys from create/rotate responses (only available in current session)
  const [fullKeys, setFullKeys] = useState<Record<string, string>>({});
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  // Banner for newly created/rotated key
  const [newKeyBanner, setNewKeyBanner] = useState<{ key: string; name: string } | null>(null);

  // Edit state
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editKeyName, setEditKeyName] = useState('');
  const [editKeyScopes, setEditKeyScopes] = useState<string[]>([]);

  const { keys, total, page, error, createKey, updateKey, revokeKey, rotateKey, fetchKeys } = useAPIKeys();
  const { showNotification } = useConsole();

  const copyToClipboard = useCallback(async (keyId: string, text: string, isFullKey: boolean) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKeyId(keyId);
      setTimeout(() => setCopiedKeyId(null), 2000);
      showNotification('success', isFullKey ? 'Full API key copied' : 'Key prefix copied (full key only available at creation)');
    } catch {
      showNotification('error', 'Failed to copy to clipboard');
    }
  }, [showNotification]);

  const getStatusColor = (status: string) => {
    return status === 'ACTIVE'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-slate-100 text-slate-700';
  };

  const startEditKey = (key: typeof keys[0]) => {
    setEditingKeyId(key.id);
    setEditKeyName(key.name);
    setEditKeyScopes(key.scopes?.map(s => s.name) || []);
  };

  const handleSaveKeyEdit = async () => {
    if (!editingKeyId || !editKeyName.trim()) return;
    await updateKey(editingKeyId, { name: editKeyName, scopes: editKeyScopes });
    setEditingKeyId(null);
  };

  return (
    <div className="space-y-8">
      {/* Error Notice */}
      {error && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm text-orange-800">
            {error}
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
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_SCOPES.map((scope) => (
                  <label key={scope.value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(scope.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedScopes([...selectedScopes, scope.value]);
                        } else {
                          setSelectedScopes(selectedScopes.filter(s => s !== scope.value));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-700">{scope.label}</span>
                    <code className="text-xs text-slate-400">{scope.value}</code>
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
                    try {
                      const result = await createKey({
                        name: newKeyName,
                        scopes: selectedScopes,
                        ...(expirationDate && { expiresAt: new Date(expirationDate).toISOString() })
                      });
                      // Store full key for this session and show banner
                      if (result?.key && result?.apiKey?.id) {
                        setFullKeys(prev => ({ ...prev, [result.apiKey.id]: result.key }));
                        setSelectedKeyToReveal(result.apiKey.id);
                        setNewKeyBanner({ key: result.key, name: result.apiKey.name });
                      }
                      setShowCreateForm(false);
                      setNewKeyName('');
                      setSelectedScopes(['read:fleet', 'read:ei']);
                      setExpirationDate('');
                    } catch {
                      // error already handled in hook
                    }
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

      {/* Newly Created Key Banner */}
      {newKeyBanner && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-900 mb-1">
                API Key Created: {newKeyBanner.name}
              </p>
              <p className="text-xs text-emerald-700 mb-2">
                Copy this key now — it won't be shown again after you leave this page.
              </p>
              <div className="flex items-center gap-2">
                <code className="text-xs text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded font-mono break-all">
                  {newKeyBanner.key}
                </code>
                <button
                  onClick={() => copyToClipboard('banner', newKeyBanner.key, true)}
                  className="shrink-0 p-1.5 text-emerald-600 hover:text-emerald-800 bg-emerald-100 rounded transition-colors"
                  title="Copy full key"
                >
                  {copiedKeyId === 'banner' ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <button
              onClick={() => setNewKeyBanner(null)}
              className="shrink-0 text-emerald-400 hover:text-emerald-600 transition-colors text-lg leading-none"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {keys.length === 0 && !error && (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
          <Key className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No API Keys</h2>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Create your first API key to start integrating with the GreenFlow API.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            Create Your First Key
          </button>
        </div>
      )}

      {/* Keys Table */}
      {keys.length > 0 && (
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
                    Rate Limit / Day
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
                {keys.map((key) => (
                  <React.Fragment key={key.id}>
                  <tr className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{key.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      {fullKeys[key.id] ? (
                        /* Key with full value available (just created/rotated in this session) */
                        <div>
                          <div className="flex items-center gap-2">
                            <code className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded font-mono max-w-[420px] break-all">
                              {selectedKeyToReveal === key.id
                                ? fullKeys[key.id]
                                : `${key.keyPrefix}********************************`}
                            </code>
                            <button
                              onClick={() =>
                                setSelectedKeyToReveal(
                                  selectedKeyToReveal === key.id ? null : key.id
                                )
                              }
                              className="p-1 text-slate-500 hover:text-slate-700 transition-colors"
                              title="Show/hide full key"
                            >
                              {selectedKeyToReveal === key.id ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => copyToClipboard(key.id, fullKeys[key.id], true)}
                              className="p-1 text-slate-500 hover:text-slate-700 transition-colors"
                              title="Copy full key"
                            >
                              {copiedKeyId === key.id ? (
                                <Check size={16} className="text-emerald-500" />
                              ) : (
                                <Copy size={16} />
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Key without full value (loaded from server, full key not recoverable) */
                        <div>
                          <div className="flex items-center gap-2">
                            <code className="text-sm text-slate-400 bg-slate-50 px-2 py-1 rounded font-mono">
                              {key.keyPrefix}••••••••
                            </code>
                            <span className="text-xs text-slate-400">prefix only</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : '\u2014'}
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
                              onClick={() => startEditKey(key)}
                              className="p-1 text-slate-500 hover:text-blue-600 transition-colors"
                              title="Edit API Key"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const result = await rotateKey(key.id);
                                  if (result?.key && result?.apiKey?.id) {
                                    setFullKeys(prev => ({ ...prev, [result.apiKey.id]: result.key }));
                                    setSelectedKeyToReveal(result.apiKey.id);
                                    setNewKeyBanner({ key: result.key, name: result.apiKey.name });
                                  }
                                } catch {
                                  // error handled in hook
                                }
                              }}
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
                  {/* Inline edit row */}
                  {editingKeyId === key.id && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 bg-blue-50 border-b border-slate-200">
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-slate-900">Edit API Key</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                              <input
                                type="text"
                                value={editKeyName}
                                onChange={(e) => setEditKeyName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Scopes</label>
                              <div className="flex flex-wrap gap-1.5">
                                {AVAILABLE_SCOPES.map((scope) => (
                                  <button
                                    key={scope.value}
                                    onClick={() => {
                                      setEditKeyScopes(prev =>
                                        prev.includes(scope.value)
                                          ? prev.filter(s => s !== scope.value)
                                          : [...prev, scope.value]
                                      );
                                    }}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                      editKeyScopes.includes(scope.value)
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}
                                  >
                                    {scope.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveKeyEdit}
                              disabled={!editKeyName.trim()}
                              className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Save Changes
                            </button>
                            <button
                              onClick={() => setEditingKeyId(null)}
                              className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > keys.length && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50">
              <p className="text-sm text-slate-600">
                Page {page} ({total} total keys)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchKeys(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchKeys(page + 1)}
                  disabled={keys.length < 20}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
