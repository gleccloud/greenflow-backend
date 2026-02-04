import { MetricGrid } from '../../components/dashboard/MetricCard';
import { FleetComparisonTable } from '../../components/dashboard/FleetComparisonTable';
import { FilterBar } from '../../components/dashboard/FilterBar';
import { TrendChartEnhanced } from '../../components/dashboard/TrendChartEnhanced';
import { carrierDashboardData } from '../../data/mockDashboard';

export default function CarrierDashboard() {
  const { metrics, fleets, revenue, premiumOrders } = carrierDashboardData;

  const getOrderStatusBadge = (status: string) => {
    const colors = {
      PENDING: 'bg-amber-100 text-amber-700',
      CONFIRMED: 'bg-blue-100 text-blue-700',
      COMPLETED: 'bg-emerald-100 text-emerald-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    const labels = {
      PENDING: '대기 중',
      CONFIRMED: '확정',
      COMPLETED: '완료',
      CANCELLED: '취소',
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
          colors[status as keyof typeof colors]
        }`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          물류사 대시보드
        </h1>
        <p className="mt-2 text-slate-600">
          ISO-14083 기반 신뢰도를 높여 프리미엄 오더를 수주하세요.
        </p>
      </div>

      {/* Metrics Grid */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-900">주요 지표</h2>
        <MetricGrid metrics={metrics} />
      </div>

      {/* Filter Bar */}
      <FilterBar
        onDatePreset={() => {}}
        filterOptions={[
          {
            name: 'customer',
            label: '고객',
            options: [
              { value: 'cust1', label: '고객 A' },
              { value: 'cust2', label: '고객 B' },
              { value: 'cust3', label: '고객 C' },
            ],
          },
          {
            name: 'fleet',
            label: '차량',
            options: [
              { value: 'flt1', label: 'FLT-001' },
              { value: 'flt2', label: 'FLT-002' },
              { value: 'flt5', label: 'FLT-005' },
            ],
          },
        ]}
      />

      {/* Fleet Performance */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          차량 성과 ({fleets.length}개)
        </h2>
        <FleetComparisonTable fleets={fleets} showCoverage />
      </div>

      {/* Two Column Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue Trend */}
        <TrendChartEnhanced
          title="수익 추이"
          subtitle="주간 매출액"
          data={revenue}
          chartType="line"
          color="#10b981"
        />

        {/* Premium Orders Pipeline */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h3 className="text-lg font-bold tracking-tight text-slate-900">
            🏆 프리미염 오더
          </h3>
          <p className="mt-1 text-xs text-slate-500">Grade 1 차량으로 수주한 오더</p>
          <div className="mt-4 space-y-3">
            {premiumOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-lg border border-slate-100 p-3 transition hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {order.id}
                      </p>
                      {getOrderStatusBadge(order.status)}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      수익: ₩{order.revenue.toLocaleString()} •
                      {order.carbonSaved && (
                        <>
                          {' '}
                          탄소 절감: {order.carbonSaved}kg CO₂e
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="rounded-2xl bg-blue-50 border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900">📈 프리미엄 전략</h3>
        <p className="mt-2 text-sm text-blue-800">
          차량의 탄소집약도가 낮을수록(Grade 1) 더 높은 프리미엄 오더를 수주할 수 있습니다.
          <br />
          ISO-14083 인증을 통해 신뢰도를 높이고 고객 신뢰를 획득하세요.
        </p>
      </div>
    </div>
  );
}
