/**
 * Billing Page
 * Displays real billing metrics and quota from the API
 */

import { useEffect } from 'react';
import { RefreshCw, CreditCard, BarChart3, AlertCircle } from 'lucide-react';
import { useMetrics } from '../hooks/useMetrics';

export function Billing() {
  const {
    billing,
    quota,
    error,
    fetchBilling,
    fetchQuota,
  } = useMetrics();

  useEffect(() => {
    fetchBilling();
    fetchQuota();
  }, []);

  if (error && !billing && !quota) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Billing</h1>
          <p className="text-slate-600 mt-2">
            Manage your subscription and billing information
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-red-900">Connection Error</h2>
          </div>
          <p className="text-sm text-red-800 mb-4">{error}</p>
          <button
            onClick={() => { fetchBilling(); fetchQuota(); }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!billing && !quota) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Billing</h1>
          <p className="text-slate-600 mt-2">
            Manage your subscription and billing information
          </p>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading billing data...</p>
          </div>
        </div>
      </div>
    );
  }

  const usagePercent = quota ? Math.round(quota.percentUsed) : 0;
  const usageColor = usagePercent >= 90 ? 'text-red-600' : usagePercent >= 70 ? 'text-amber-600' : 'text-emerald-600';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Billing</h1>
          <p className="text-slate-600 mt-2">
            Manage your subscription and billing information
          </p>
        </div>
        <button
          onClick={() => { fetchBilling(); fetchQuota(); }}
          className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Billing Period */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            <p className="text-sm text-slate-600">Billing Period</p>
          </div>
          {billing ? (
            <>
              <h3 className="text-lg font-bold text-slate-900">
                {new Date(billing.billingPeriodStart).toLocaleDateString()} &ndash; {new Date(billing.billingPeriodEnd).toLocaleDateString()}
              </h3>
              <p className="text-sm text-slate-600 mt-2">
                Estimated next bill: <span className="font-semibold">${billing.estimatedNextBill.toFixed(2)}</span>
              </p>
            </>
          ) : (
            <p className="text-slate-400">No billing data</p>
          )}
        </div>

        {/* Current Cost */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <p className="text-sm text-slate-600">Current Period Cost</p>
          </div>
          {billing ? (
            <>
              <h3 className="text-2xl font-bold text-slate-900">
                ${billing.totalCost.toFixed(2)}
              </h3>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <p>{billing.requestCount.toLocaleString()} requests @ ${billing.costPerRequest}/req</p>
                {billing.overageCharges > 0 && (
                  <p className="text-amber-600">Overage: +${billing.overageCharges.toFixed(2)}</p>
                )}
                {billing.discountApplied > 0 && (
                  <p className="text-emerald-600">Discount: -${billing.discountApplied.toFixed(2)}</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-slate-400">No billing data</p>
          )}
        </div>

        {/* Usage Quota */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-600 mb-3">Usage This Month</p>
          {quota ? (
            <>
              <h3 className={`text-2xl font-bold ${usageColor}`}>{usagePercent}%</h3>
              <p className="text-xs text-slate-600 mt-2">
                {quota.used.toLocaleString()} of {quota.limit.toLocaleString()} requests
              </p>
              <div className="mt-3 w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Resets: {new Date(quota.resetDate).toLocaleDateString()}
              </p>
              {usagePercent >= quota.warningThreshold && (
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  Warning: Approaching quota limit
                </p>
              )}
            </>
          ) : (
            <p className="text-slate-400">No quota data</p>
          )}
        </div>
      </div>
    </div>
  );
}
