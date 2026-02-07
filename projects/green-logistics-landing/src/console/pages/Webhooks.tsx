import { useState } from 'react';
import { Plus, Trash2, RotateCw, ExternalLink, ChevronDown, ChevronUp, Copy, Check, Pencil } from 'lucide-react';
import { useWebhooks } from '../hooks/useWebhooks';
import type { WebhookEvent } from '../types/webhook';

/** Fallback events if backend fetch fails */
const FALLBACK_EVENTS: WebhookEvent[] = [
  'bid.created', 'bid.published', 'bid.closed', 'bid.awarded', 'bid.cancelled', 'bid.expired',
  'proposal.submitted', 'proposal.updated', 'proposal.withdrawn', 'proposal.accepted', 'proposal.rejected',
  'order.created', 'order.status_changed', 'order.confirmed', 'order.in_transit', 'order.delivered', 'order.cancelled', 'order.failed',
  'fleet.ei_updated', 'carbon_record.created', 'evaluation.completed',
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  INACTIVE: 'bg-slate-100 text-slate-600',
  DISABLED: 'bg-red-100 text-red-800',
};

function EventPicker({
  events, selected, onToggle,
}: {
  events: WebhookEvent[];
  selected: WebhookEvent[];
  onToggle: (event: WebhookEvent) => void;
}) {
  const groups: Record<string, WebhookEvent[]> = {};
  events.forEach((e) => {
    const cat = e.split('.')[0];
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(e);
  });

  return (
    <div className="space-y-3">
      {Object.entries(groups).map(([cat, evts]) => (
        <div key={cat}>
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">{cat}</p>
          <div className="flex flex-wrap gap-1.5">
            {evts.map((event) => (
              <button
                key={event}
                onClick={() => onToggle(event)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  selected.includes(event)
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                {event}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Webhooks() {
  const {
    webhooks,
    selectedWebhook,
    deliveries,
    eventTypes: backendEventTypes,
    error,
    isLoading,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    rotateSecret,
    fetchDeliveries,
    selectWebhook,
  } = useWebhooks();

  const availableEvents: WebhookEvent[] =
    backendEventTypes.length > 0
      ? (backendEventTypes as WebhookEvent[])
      : FALLBACK_EVENTS;

  const [showCreate, setShowCreate] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([]);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editName, setEditName] = useState('');
  const [editEvents, setEditEvents] = useState<WebhookEvent[]>([]);

  const handleCreate = async () => {
    if (!newUrl || !newName) return;
    const secret = await createWebhook({
      name: newName,
      url: newUrl,
      events: selectedEvents.length > 0 ? selectedEvents : availableEvents,
    });
    if (secret) {
      setCreatedSecret(secret);
      setNewUrl('');
      setNewName('');
      setSelectedEvents([]);
      setShowCreate(false);
    }
  };

  const handleCopySecret = () => {
    if (createdSecret) {
      navigator.clipboard.writeText(createdSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this webhook?')) {
      await deleteWebhook(id);
    }
  };

  const handleRotate = async (id: string) => {
    if (confirm('This will invalidate the current secret. Continue?')) {
      const secret = await rotateSecret(id);
      if (secret) {
        setCreatedSecret(secret);
      }
    }
  };

  const toggleEvent = (event: WebhookEvent, list: WebhookEvent[], setter: (events: WebhookEvent[]) => void) => {
    setter(
      list.includes(event)
        ? list.filter((e) => e !== event)
        : [...list, event],
    );
  };

  const startEdit = (webhook: typeof webhooks[0]) => {
    setEditingId(webhook.id);
    setEditUrl(webhook.url);
    setEditName(webhook.name);
    setEditEvents([...webhook.events]);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editUrl || !editName) return;
    await updateWebhook(editingId, {
      name: editName,
      url: editUrl,
      events: editEvents.length > 0 ? editEvents : availableEvents,
    });
    setEditingId(null);
  };

  if (isLoading && webhooks.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Webhooks</h1>
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 text-center">
          <div className="animate-pulse text-slate-400">Loading webhooks...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Webhooks</h1>
          <p className="text-slate-600 mt-2">
            Manage event subscriptions and webhook deliveries
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
        >
          <Plus size={18} />
          Create Webhook
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Secret reveal banner */}
      {createdSecret && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-amber-800">Webhook Secret</p>
              <p className="text-amber-700 text-sm mt-1">
                Copy this secret now. It won't be shown again.
              </p>
              <code className="block mt-2 p-2 bg-white rounded border text-sm font-mono break-all">
                {createdSecret}
              </code>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={handleCopySecret}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"
              >
                {copiedSecret ? <Check size={14} /> : <Copy size={14} />}
                {copiedSecret ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={() => setCreatedSecret(null)}
                className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">New Webhook</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Webhook"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">URL</label>
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://example.com/webhook"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Events</label>
              <EventPicker
                events={availableEvents}
                selected={selectedEvents}
                onToggle={(e) => toggleEvent(e, selectedEvents, setSelectedEvents)}
              />
              {selectedEvents.length === 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  No events selected &mdash; all events will be subscribed
                </p>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreate}
                disabled={!newUrl || !newName}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {webhooks.length === 0 && !showCreate && (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Webhooks Yet</h2>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            Create webhooks to receive real-time notifications about important events.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            Create Your First Webhook
          </button>
        </div>
      )}

      {/* Webhook list */}
      {webhooks.length > 0 && (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50"
                onClick={() => {
                  if (selectedWebhook?.id === webhook.id) {
                    selectWebhook(null);
                  } else {
                    selectWebhook(webhook);
                    fetchDeliveries(webhook.id);
                  }
                }}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_COLORS[webhook.status] || STATUS_COLORS.INACTIVE
                    }`}
                  >
                    {webhook.status}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{webhook.name}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <ExternalLink size={12} />
                      {webhook.url}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{webhook.events.length} events</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(webhook); }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="Edit webhook"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRotate(webhook.id); }}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                    title="Rotate secret"
                  >
                    <RotateCw size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(webhook.id); }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                  {selectedWebhook?.id === webhook.id ? (
                    <ChevronUp size={16} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-400" />
                  )}
                </div>
              </div>

              {/* Edit form inline */}
              {editingId === webhook.id && (
                <div className="border-t border-slate-200 p-4 bg-blue-50">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Edit Webhook</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">URL</label>
                        <input
                          type="url"
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Events</label>
                      <EventPicker
                        events={availableEvents}
                        selected={editEvents}
                        onToggle={(e) => toggleEvent(e, editEvents, setEditEvents)}
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleSaveEdit}
                        disabled={!editUrl || !editName}
                        className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Expanded detail */}
              {selectedWebhook?.id === webhook.id && editingId !== webhook.id && (
                <div className="border-t border-slate-200 p-4 bg-slate-50">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Created</p>
                      <p className="text-sm text-slate-900">{new Date(webhook.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Last Triggered</p>
                      <p className="text-sm text-slate-900">
                        {webhook.lastTriggeredAt ? new Date(webhook.lastTriggeredAt).toLocaleString() : 'Never'}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-medium text-slate-500 uppercase mb-2">Subscribed Events</p>
                    <div className="flex flex-wrap gap-1.5">
                      {webhook.events.map((event) => (
                        <span key={event} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase mb-2">Recent Deliveries</p>
                    {deliveries.length === 0 ? (
                      <p className="text-sm text-slate-400">No deliveries yet</p>
                    ) : (
                      <div className="space-y-1">
                        {deliveries.slice(0, 5).map((d) => (
                          <div key={d.id} className="flex items-center justify-between py-1.5 px-2 bg-white rounded border text-sm">
                            <span className="text-slate-600">{d.eventType}</span>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-medium ${
                                d.status === 'DELIVERED' ? 'text-emerald-600' :
                                d.status === 'RETRYING' ? 'text-amber-600' : 'text-red-600'
                              }`}>
                                {d.status}
                              </span>
                              <span className="text-xs text-slate-400">{d.responseTime}ms</span>
                              <span className="text-xs text-slate-400">{new Date(d.timestamp).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
