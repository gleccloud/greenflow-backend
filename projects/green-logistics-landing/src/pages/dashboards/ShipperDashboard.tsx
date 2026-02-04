import { MetricGrid } from '../../components/dashboard/MetricCard';
import { FleetComparisonTable } from '../../components/dashboard/FleetComparisonTable';
import { FilterBar } from '../../components/dashboard/FilterBar';
import { TrendChart } from '../../components/dashboard/TrendChart';
import { shipperDashboardData } from '../../data/mockDashboard';

export default function ShipperDashboard() {
  const { metrics, fleets, recentBids, scope3Trend } = shipperDashboardData;

  const getBidStatusBadge = (status: string) => {
    const colors = {
      OPEN: 'bg-blue-100 text-blue-700',
      CLOSED: 'bg-slate-100 text-slate-700',
      AWARDED: 'bg-emerald-100 text-emerald-700',
    };
    const labels = {
      OPEN: '진행 중',
      CLOSED: '마감',
      AWARDED: '낙찰',
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
          화주사 대시보드
        </h1>
        <p className="mt-2 text-slate-600">
          입찰 관리, 물류사 비교, Scope 3 감축 현황을 한눈에 확인하세요.
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
            name: 'route',
            label: '노선',
            options: [
              { value: 'seoul-busan', label: '서울-부산' },
              { value: 'incheon-daegu', label: '인천-대구' },
              { value: 'gyeonggi-gwangju', label: '경기-광주' },
            ],
          },
          {
            name: 'status',
            label: '상태',
            options: [
              { value: 'open', label: '진행 중' },
              { value: 'closed', label: '마감' },
              { value: 'awarded', label: '낙찰' },
            ],
          },
        ]}
      />

      {/* Fleet Comparison */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          물류사 비교 ({fleets.length}개)
        </h2>
        <FleetComparisonTable fleets={fleets} showPrice />
      </div>

      {/* Two Column Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Scope 3 Trend */}
        <TrendChart
          title="Scope 3 추이"
          subtitle="월별 총 탄소배출량"
          data={scope3Trend}
        />

        {/* Recent Bids */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h3 className="text-lg font-bold tracking-tight text-slate-900">
            최근 입찰
          </h3>
          <div className="mt-4 space-y-3">
            {recentBids.map((bid) => (
              <div
                key={bid.id}
                className="rounded-lg border border-slate-100 p-3 transition hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {bid.origin} → {bid.destination}
                      </p>
                      {getBidStatusBadge(bid.status)}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      생성일: {bid.createdAt} • 화물: {bid.cargoWeight}톤 •
                      제안: {bid.proposalCount}개
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6">
        <h3 className="font-semibold text-emerald-900">💡 Tip</h3>
        <p className="mt-2 text-sm text-emerald-800">
          탄소집약도가 낮은 물류사를 선택하여 Scope 3 배출량을 감축하고,
          <br />
          ESG 리포트에 검증된 탄소 데이터를 추가하세요. 1등급 데이터는
          ISO-14083 기반 실측 데이터입니다.
        </p>
      </div>
    </div>
  );
}
