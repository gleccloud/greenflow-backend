import { Plus } from 'lucide-react';

export function Webhooks() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Webhooks</h1>
          <p className="text-slate-600 mt-2">
            Manage event subscriptions and webhook deliveries
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium">
          <Plus size={18} />
          Create Webhook
        </button>
      </div>

      <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 text-center">
        <div className="text-5xl mb-4">🪝</div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">No Webhooks Yet</h2>
        <p className="text-slate-600 mb-6 max-w-md mx-auto">
          Create webhooks to receive real-time notifications about important events
          in your GreenFlow account.
        </p>
        <button className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium">
          Create Your First Webhook
        </button>
      </div>
    </div>
  );
}
