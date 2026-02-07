/**
 * Quick Start Tab - SDK installation, initialization, and first API call
 */

import { useState } from 'react';
import { Copy, Check, Terminal, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

function CopyButton({ text, id, copiedId, onCopy }: { text: string; id: string; copiedId: string | null; onCopy: (text: string, id: string) => void }) {
  return (
    <button
      onClick={() => onCopy(text, id)}
      className="p-1.5 text-slate-400 hover:text-white transition-colors"
      title="Copy to clipboard"
    >
      {copiedId === id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
    </button>
  );
}

function CodeBlock({ code, id, language, copiedId, onCopy }: { code: string; id: string; language: string; copiedId: string | null; onCopy: (text: string, id: string) => void }) {
  return (
    <div className="bg-slate-900 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-xs text-slate-400">{language}</span>
        <CopyButton text={code} id={id} copiedId={copiedId} onCopy={onCopy} />
      </div>
      <pre className="p-4 text-sm text-slate-300 overflow-x-auto"><code>{code}</code></pre>
    </div>
  );
}

export function QuickStartTab() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Step 1: Install */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
          <h3 className="text-lg font-semibold text-slate-900">Install the SDK</h3>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 text-green-400 rounded-lg p-4 font-mono text-sm">
          <Terminal className="w-4 h-4 text-slate-500 shrink-0" />
          <code className="flex-1">npm install @glec/sdk</code>
          <CopyButton text="npm install @glec/sdk" id="install" copiedId={copiedId} onCopy={copyToClipboard} />
        </div>
        <p className="text-sm text-slate-500 mt-2">Requires Node.js 18+. Zero external dependencies.</p>
      </div>

      {/* Step 2: Initialize */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
          <h3 className="text-lg font-semibold text-slate-900">Initialize the Client</h3>
        </div>
        <CodeBlock
          language="TypeScript"
          id="init"
          copiedId={copiedId}
          onCopy={copyToClipboard}
          code={`import { GlecClient } from '@glec/sdk';

const client = new GlecClient({
  baseUrl: 'https://api.glec.kr',  // or http://localhost:3000
  apiKey: 'your-api-key-here',     // from API Keys page
  timeout: 30000,                   // optional, default 30s
  retries: 3,                       // optional, default 3
});`}
        />
        <p className="text-sm text-slate-500 mt-2">
          Get your API key from the{' '}
          <Link to="/console/api-keys" className="text-emerald-600 hover:underline font-medium">
            API Keys page
          </Link>.
        </p>
      </div>

      {/* Step 3: First API Call */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
          <h3 className="text-lg font-semibold text-slate-900">Make Your First API Call</h3>
        </div>
        <CodeBlock
          language="TypeScript"
          id="first-call"
          copiedId={copiedId}
          onCopy={copyToClipboard}
          code={`// Query fleet carbon intensity (EI)
const ei = await client.fleet.getFleetEI('fleet-uuid');

console.log(\`EI: \${ei.eiCurrent} gCO\u2082e/t\u00b7km\`);
console.log(\`Grade: \${ei.eiGrade}\`);      // GRADE_1, GRADE_2, or GRADE_3
console.log(\`Trend: \${ei.trendDirection}\`); // improving, stable, or worsening`}
        />
      </div>

      {/* Step 4: cURL Alternative */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            <Terminal size={14} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Or Use cURL Directly</h3>
        </div>
        <CodeBlock
          language="bash"
          id="curl"
          copiedId={copiedId}
          onCopy={copyToClipboard}
          code={`# Get fleet EI data
curl -X GET 'http://localhost:3000/api/v2/fleet/ei/FLT-A01' \\
  -H 'X-API-Key: your-api-key-here'

# Create a bid
curl -X POST 'http://localhost:3000/api/v2/bids' \\
  -H 'X-API-Key: your-api-key-here' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "title": "Seoul to Busan 11t Truck",
    "cargoType": "General",
    "cargoWeightTonnes": 11,
    "originLocation": "Seoul",
    "destinationLocation": "Busan",
    "distanceKm": 400
  }'`}
        />
      </div>

      {/* Authentication Info */}
      <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200">
        <h3 className="text-lg font-semibold text-emerald-900 mb-3">Authentication</h3>
        <p className="text-emerald-800 mb-4">
          All API endpoints require the <code className="font-mono bg-white px-1.5 py-0.5 rounded text-sm">X-API-Key</code> header.
        </p>
        <div className="bg-white rounded-lg p-4 font-mono text-sm text-slate-700 border border-emerald-200">
          <span className="text-emerald-600"># Request Header</span>
          <br />
          X-API-Key: glk_live_xxxxxxxxxxxxxxxxxxxx
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="bg-white rounded-lg p-3 border border-emerald-200">
            <p className="font-medium text-slate-900">Default Rate Limit</p>
            <p className="text-slate-600">60 requests/min, 10,000/day</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-emerald-200">
            <p className="font-medium text-slate-900">Premium Rate Limit</p>
            <p className="text-slate-600">300 requests/min, 100,000/day</p>
          </div>
        </div>
      </div>

      {/* Error Handling */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Error Handling</h3>
        <CodeBlock
          language="TypeScript"
          id="errors"
          copiedId={copiedId}
          onCopy={copyToClipboard}
          code={`import { GlecApiError } from '@glec/sdk';

try {
  const result = await client.fleet.getFleetEI('invalid-id');
} catch (error) {
  if (error instanceof GlecApiError) {
    console.error(\`[\${error.statusCode}] \${error.message}\`);
    // 401 = Invalid API key
    // 404 = Fleet not found
    // 429 = Rate limit exceeded (retry after backoff)
  }
}

// SDK automatically retries on 5xx errors (3 times with exponential backoff)
// 4xx errors are NOT retried (they indicate client errors)`}
        />
      </div>

      {/* Next Steps */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Next Steps</h3>
        <div className="space-y-3">
          <Link
            to="/console/documentation?tab=examples"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
          >
            <ChevronRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
            <div>
              <p className="font-medium text-slate-900">Code Examples</p>
              <p className="text-sm text-slate-500">Complete workflow recipes for shipper, carrier, and ESG reporting</p>
            </div>
          </Link>
          <Link
            to="/console/api-keys"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
          >
            <ChevronRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
            <div>
              <p className="font-medium text-slate-900">Create an API Key</p>
              <p className="text-sm text-slate-500">Generate your first key with specific scopes</p>
            </div>
          </Link>
          <Link
            to="/console/webhooks"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
          >
            <ChevronRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
            <div>
              <p className="font-medium text-slate-900">Set Up Webhooks</p>
              <p className="text-sm text-slate-500">Receive real-time event notifications</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
