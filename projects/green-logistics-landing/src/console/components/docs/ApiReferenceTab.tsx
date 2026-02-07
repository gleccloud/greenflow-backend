/**
 * API Reference Tab - Swagger UI + endpoint category cards + auth info
 */

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v2';

interface EndpointInfo {
  method: string;
  path: string;
}

interface EndpointCategory {
  name: string;
  description: string;
  endpoints: EndpointInfo[];
}

const ENDPOINT_CATEGORIES: EndpointCategory[] = [
  {
    name: 'Fleet & EI',
    description: 'Fleet carbon intensity data and management',
    endpoints: [
      { method: 'GET', path: '/fleet/ei/{fleetId}' },
      { method: 'GET', path: '/fleet/ei-history/{fleetId}' },
      { method: 'GET', path: '/fleet/eco-friendly' },
      { method: 'GET', path: '/fleet/public' },
    ],
  },
  {
    name: 'EI Calculation',
    description: 'GLEC Framework v3.0 emission intensity engine',
    endpoints: [
      { method: 'POST', path: '/ei/calculate' },
      { method: 'POST', path: '/ei/calculate-multimodal' },
      { method: 'POST', path: '/ei/calculate-fleet' },
      { method: 'GET', path: '/ei/fuel-factors' },
      { method: 'GET', path: '/ei/defaults' },
    ],
  },
  {
    name: 'Transport Products',
    description: 'Transport product catalog & lifecycle',
    endpoints: [
      { method: 'POST', path: '/transport-products' },
      { method: 'GET', path: '/transport-products' },
      { method: 'GET', path: '/transport-products/{id}' },
      { method: 'POST', path: '/transport-products/{id}/publish' },
      { method: 'POST', path: '/transport-products/{id}/suspend' },
    ],
  },
  {
    name: 'Bids',
    description: 'Bid lifecycle management',
    endpoints: [
      { method: 'POST', path: '/bids' },
      { method: 'GET', path: '/bids' },
      { method: 'GET', path: '/bids/{id}' },
      { method: 'PUT', path: '/bids/{id}' },
      { method: 'POST', path: '/bids/{id}/publish' },
      { method: 'POST', path: '/bids/{id}/close' },
      { method: 'POST', path: '/bids/{id}/award' },
    ],
  },
  {
    name: 'Proposals',
    description: 'Carrier proposal submission & management',
    endpoints: [
      { method: 'POST', path: '/proposals' },
      { method: 'GET', path: '/proposals' },
      { method: 'GET', path: '/proposals/{id}' },
      { method: 'PUT', path: '/proposals/{id}' },
      { method: 'POST', path: '/proposals/{id}/withdraw' },
    ],
  },
  {
    name: 'Bid Evaluation',
    description: 'Multi-factor scoring (Price + Leadtime + EI)',
    endpoints: [
      { method: 'POST', path: '/order/bid-evaluation' },
      { method: 'POST', path: '/order/bid-evaluation-async/{bidId}' },
      { method: 'GET', path: '/order/bid-evaluation/{bidId}' },
      { method: 'GET', path: '/order/bid-evaluation/{bidId}/rankings' },
    ],
  },
  {
    name: 'Orders',
    description: 'Order lifecycle & tracking',
    endpoints: [
      { method: 'POST', path: '/orders' },
      { method: 'GET', path: '/orders' },
      { method: 'GET', path: '/orders/{id}' },
      { method: 'PUT', path: '/orders/{id}/status' },
      { method: 'PUT', path: '/orders/{id}/tracking' },
    ],
  },
  {
    name: 'Data Integrity',
    description: 'Carbon record signing, verification, anomaly detection',
    endpoints: [
      { method: 'POST', path: '/integrity/carbon-records' },
      { method: 'POST', path: '/integrity/keys' },
      { method: 'POST', path: '/integrity/carbon-records/{id}/sign' },
      { method: 'GET', path: '/integrity/verify/{id}' },
      { method: 'GET', path: '/integrity/verify-chain/{carrierId}' },
      { method: 'GET', path: '/integrity/anomaly/{id}' },
    ],
  },
  {
    name: 'Export',
    description: 'ESG report data export',
    endpoints: [
      { method: 'GET', path: '/export/json' },
      { method: 'GET', path: '/export/csv' },
      { method: 'GET', path: '/export/summary' },
    ],
  },
  {
    name: 'Real-time',
    description: 'SSE streaming & polling for live updates',
    endpoints: [
      { method: 'SSE', path: '/realtime/orders/{id}/stream' },
      { method: 'SSE', path: '/realtime/bids/{id}/stream' },
      { method: 'SSE', path: '/realtime/fleet/{carrierId}/stream' },
      { method: 'GET', path: '/realtime/orders/{id}/latest' },
    ],
  },
  {
    name: 'Console & Admin',
    description: 'API keys, logs, metrics, audit',
    endpoints: [
      { method: 'GET', path: '/console/metrics/summary' },
      { method: 'GET', path: '/console/logs' },
      { method: 'GET', path: '/console/api-keys' },
      { method: 'POST', path: '/console/api-keys' },
      { method: 'GET', path: '/audit/logs' },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-green-100 text-green-700',
  PUT: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
  PATCH: 'bg-orange-100 text-orange-700',
  SSE: 'bg-purple-100 text-purple-700',
};

export function ApiReferenceTab() {
  const [showSwagger, setShowSwagger] = useState(false);

  return (
    <div className="space-y-6">
      {/* Swagger UI Toggle */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Interactive API Explorer</h3>
            <p className="text-sm text-slate-600 mt-1">
              OpenAPI 3.0 specification with Try It Out functionality
            </p>
          </div>
          <button
            onClick={() => setShowSwagger(!showSwagger)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
          >
            {showSwagger ? 'Hide' : 'Open'} Swagger UI
            <ChevronDown className={`w-4 h-4 transition-transform ${showSwagger ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Swagger UI */}
      {showSwagger && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <SwaggerUI
            url={`${API_BASE_URL}/docs-json`}
            defaultModelsExpandDepth={1}
            defaultModelExpandDepth={1}
            displayOperationId={false}
            filter={true}
            showExtensions={false}
            showCommonExtensions={false}
          />
        </div>
      )}

      {/* Authentication */}
      <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200">
        <h3 className="text-lg font-semibold text-emerald-900 mb-3">Authentication</h3>
        <p className="text-emerald-800 mb-4">
          All API endpoints require the{' '}
          <code className="font-mono bg-white px-1.5 py-0.5 rounded text-sm">X-API-Key</code>{' '}
          header. Generate keys from the{' '}
          <Link to="/console/api-keys" className="underline font-medium">
            API Keys page
          </Link>.
        </p>
        <div className="bg-white rounded-lg p-4 font-mono text-sm text-slate-700 border border-emerald-200">
          <span className="text-emerald-600"># Every request must include:</span>
          <br />
          X-API-Key: your-api-key-here
        </div>
      </div>

      {/* Endpoint Categories Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">
            API Endpoints ({ENDPOINT_CATEGORIES.reduce((sum, c) => sum + c.endpoints.length, 0)}+)
          </h3>
          <span className="text-sm text-slate-500">Base URL: {API_BASE_URL}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ENDPOINT_CATEGORIES.map((category) => (
            <div
              key={category.name}
              className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
            >
              <h4 className="text-base font-semibold text-slate-900 mb-1">{category.name}</h4>
              <p className="text-xs text-slate-500 mb-3">{category.description}</p>
              <div className="space-y-1.5">
                {category.endpoints.map((ep, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={`px-1.5 py-0.5 rounded font-medium ${METHOD_COLORS[ep.method] || 'bg-slate-100 text-slate-700'}`}>
                      {ep.method}
                    </span>
                    <span className="text-slate-600 font-mono truncate">{ep.path}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Base URL Info */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-3">Base URLs</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium text-slate-700">Development</p>
            <code className="text-xs text-slate-600">http://localhost:3000/api/v2</code>
          </div>
          <div>
            <p className="font-medium text-slate-700">Staging</p>
            <code className="text-xs text-slate-600">https://staging-api.glec.kr/api/v2</code>
          </div>
          <div>
            <p className="font-medium text-slate-700">Production</p>
            <code className="text-xs text-slate-600">https://api.glec.kr/api/v2</code>
          </div>
        </div>
      </div>
    </div>
  );
}
