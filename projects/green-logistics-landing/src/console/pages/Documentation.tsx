import { Code2, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export function Documentation() {
  const [showSwagger, setShowSwagger] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">API Documentation</h1>
        <p className="text-slate-600 mt-2">
          Comprehensive API reference with interactive examples and Swagger/OpenAPI specification
        </p>
      </div>

      {/* Quick Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-4 mb-6">
              <Code2 className="w-12 h-12 text-emerald-600" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900">GreenFlow API v2.0</h2>
                <p className="text-slate-600">
                  Interactive API explorer with OpenAPI 3.0 specification
                </p>
              </div>
            </div>
            <p className="text-slate-700 mb-6">
              Full API documentation for the GreenFlow green logistics platform.
              Explore endpoints for API key management, request logging, metrics, bids, proposals, and fleet management.
            </p>

            {/* Toggle Swagger Button */}
            <button
              onClick={() => setShowSwagger(!showSwagger)}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              <span>{showSwagger ? 'Hide' : 'View'} Swagger API Documentation</span>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${showSwagger ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Swagger UI */}
      {showSwagger && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="swagger-ui-wrapper">
            <SwaggerUI
              url="/api-spec.json"
              defaultModelsExpandDepth={1}
              defaultModelExpandDepth={1}
              displayOperationId={false}
              filter={true}
              showExtensions={false}
              showCommonExtensions={false}
            />
          </div>
        </div>
      )}

      {/* API Endpoints Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">API Keys</h3>
          <p className="text-sm text-slate-600 mb-4">
            Manage your API keys, scopes, and rate limits
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">GET</span>
              <span className="text-slate-600">/console/api-keys</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded">POST</span>
              <span className="text-slate-600">/console/api-keys</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded">DELETE</span>
              <span className="text-slate-600">/console/api-keys/:id</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Logs</h3>
          <p className="text-sm text-slate-600 mb-4">
            Monitor API requests and performance metrics
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">GET</span>
              <span className="text-slate-600">/console/logs</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">SSE</span>
              <span className="text-slate-600">/console/logs/stream</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">GET</span>
              <span className="text-slate-600">/console/logs/export</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Metrics</h3>
          <p className="text-sm text-slate-600 mb-4">
            Real-time performance and usage statistics
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">GET</span>
              <span className="text-slate-600">/console/metrics/summary</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">GET</span>
              <span className="text-slate-600">/console/metrics/endpoints</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">SSE</span>
              <span className="text-slate-600">/console/metrics/stream</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Bids</h3>
          <p className="text-sm text-slate-600 mb-4">
            Manage logistics bids and procurement
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">GET</span>
              <span className="text-slate-600">/bids</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded">POST</span>
              <span className="text-slate-600">/bids</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">GET</span>
              <span className="text-slate-600">/bids/:id</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Fleets</h3>
          <p className="text-sm text-slate-600 mb-4">
            Carbon intensity tracking with GLEC Framework
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">GET</span>
              <span className="text-slate-600">/fleets</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">GET</span>
              <span className="text-slate-600">/fleets/:id</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded">GRADE</span>
              <span className="text-slate-600">1/2/3 Certification</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Proposals</h3>
          <p className="text-sm text-slate-600 mb-4">
            Fleet proposals and reverse procurement
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">GET</span>
              <span className="text-slate-600">/proposals</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded">POST</span>
              <span className="text-slate-600">/proposals</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">GET</span>
              <span className="text-slate-600">/proposals/:id</span>
            </div>
          </div>
        </div>
      </div>

      {/* Authentication Info */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Authentication</h3>
        <p className="text-blue-800 mb-4">
          All API endpoints require Bearer token authentication using JWT tokens.
        </p>
        <div className="bg-white rounded p-4 font-mono text-sm text-slate-700 border border-blue-200">
          <div className="text-blue-600 mb-2"># Example Authorization Header</div>
          Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
        </div>
      </div>
    </div>
  );
}
