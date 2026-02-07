/**
 * SDK & Integrations Page
 * SDK setup guide, active integrations, and coming soon cards
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, Terminal, Package, ExternalLink, Webhook, Globe } from 'lucide-react';

export function Integrations() {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const sdkClients = [
    { name: 'Fleet', methods: 9, description: 'EI data, eco-friendly fleets, transport products' },
    { name: 'Bids', methods: 15, description: 'Bid CRUD, proposals, evaluation' },
    { name: 'Orders', methods: 5, description: 'Order lifecycle, tracking' },
    { name: 'Integrity', methods: 16, description: 'Records, signing, verification, export' },
  ];

  const initCode = `import { GlecClient } from '@glec/sdk';

const client = new GlecClient({
  baseUrl: 'https://api.glec.kr',
  apiKey: 'your-api-key-here',
});

// Query fleet carbon intensity
const ei = await client.fleet.getFleetEI('fleet-id');
console.log(\`EI: \${ei.eiCurrent} gCO\u2082e/t\u00b7km\`);`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">SDK & Integrations</h1>
        <p className="text-slate-600 mt-2">
          Connect your applications to GreenFlow using our SDK or direct API integration
        </p>
      </div>

      {/* SDK Section */}
      <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Package className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">TypeScript / JavaScript SDK</h2>
            <p className="text-sm text-slate-500">@glec/sdk v0.1.0 &mdash; 45 methods, full type safety, zero dependencies</p>
          </div>
        </div>

        {/* Install */}
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-700 mb-2">Installation</p>
          <div className="flex items-center gap-2 bg-slate-900 text-green-400 rounded-lg p-4 font-mono text-sm">
            <Terminal className="w-4 h-4 text-slate-500 shrink-0" />
            <code className="flex-1">npm install @glec/sdk</code>
            <button onClick={() => copyToClipboard('npm install @glec/sdk', 'npm')}>
              {copiedItem === 'npm' ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-slate-400 hover:text-white" />}
            </button>
          </div>
        </div>

        {/* Quick Code */}
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-700 mb-2">Quick Start</p>
          <div className="bg-slate-900 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
              <span className="text-xs text-slate-400">TypeScript</span>
              <button onClick={() => copyToClipboard(initCode, 'init')}>
                {copiedItem === 'init' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-slate-400 hover:text-white" />}
              </button>
            </div>
            <pre className="p-4 text-sm text-slate-300 overflow-x-auto"><code>{initCode}</code></pre>
          </div>
        </div>

        {/* Client Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {sdkClients.map((client) => (
            <div key={client.name} className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900">{client.name}</h4>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">{client.methods} methods</p>
              <p className="text-xs text-slate-500 mt-1">{client.description}</p>
            </div>
          ))}
        </div>

        <Link
          to="/console/documentation"
          className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm"
        >
          View full API documentation & examples
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {/* Active Integrations */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Active Integrations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/console/webhooks"
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex items-start gap-4"
          >
            <div className="p-2 bg-emerald-50 rounded-lg shrink-0">
              <Webhook className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Webhooks</h3>
              <p className="text-sm text-slate-600 mt-1">
                Receive real-time event notifications for bids, proposals, orders, and fleet updates
              </p>
              <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                Active
              </span>
            </div>
          </Link>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex items-start gap-4">
            <div className="p-2 bg-blue-50 rounded-lg shrink-0">
              <Globe className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">REST API</h3>
              <p className="text-sm text-slate-600 mt-1">
                85+ endpoints with X-API-Key authentication, SSE streaming, batch operations
              </p>
              <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Coming Soon</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'Slack', description: 'Get bid and fleet alerts directly in Slack channels' },
            { name: 'Zapier', description: 'Connect GreenFlow to 6,000+ apps via automated workflows' },
            { name: 'GitHub', description: 'CI/CD integration for EI compliance checks in pipelines' },
          ].map((integration) => (
            <div
              key={integration.name}
              className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 opacity-60"
            >
              <h3 className="font-semibold text-slate-900 mb-1">{integration.name}</h3>
              <p className="text-sm text-slate-600 mb-3">{integration.description}</p>
              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-medium">
                Coming Soon
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
