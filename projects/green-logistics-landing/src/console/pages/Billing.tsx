export function Billing() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Billing</h1>
        <p className="text-slate-600 mt-2">
          Manage your subscription and billing information
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-600 mb-2">Current Plan</p>
          <h3 className="text-2xl font-bold text-slate-900">Professional</h3>
          <p className="text-sm text-slate-600 mt-4">$99/month</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-600 mb-2">Next Billing Date</p>
          <h3 className="text-2xl font-bold text-slate-900">Mar 4, 2026</h3>
          <button className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
            Update payment method
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-600 mb-2">Usage This Month</p>
          <h3 className="text-2xl font-bold text-slate-900">78%</h3>
          <p className="text-xs text-slate-600 mt-4">234,567 of 300,000 requests</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Billing History</h2>
        <div className="space-y-3">
          {[
            { date: 'Feb 4, 2026', amount: '$99.00', status: 'Paid' },
            { date: 'Jan 4, 2026', amount: '$99.00', status: 'Paid' },
            { date: 'Dec 4, 2025', amount: '$99.00', status: 'Paid' },
          ].map((invoice, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-3 border-b border-slate-200 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{invoice.date}</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm font-medium text-slate-900">{invoice.amount}</p>
                <span className="px-3 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
                  {invoice.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
