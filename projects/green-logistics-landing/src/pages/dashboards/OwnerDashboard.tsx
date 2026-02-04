import { MetricGrid } from '../../components/dashboard/MetricCard';
import { FilterBar } from '../../components/dashboard/FilterBar';
import { TrendChartEnhanced } from '../../components/dashboard/TrendChartEnhanced';
import { ownerDashboardData } from '../../data/mockDashboard';
import { Zap, AlertCircle } from 'lucide-react';

export default function OwnerDashboard() {
  const { metrics, sessions, earnings, behaviors, greenLabelProgress } =
    ownerDashboardData;

  const getSessionBadge = (eligible: boolean) => {
    return eligible ? (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        ✓ 그린라벨 적격
      </span>
    ) : (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
        운전 개선 필요
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          차주 대시보드
        </h1>
        <p className="mt-2 text-slate-600">
          실측 탄소 데이터로 그린라벨 오더를 획득하세요.
        </p>
      </div>

      {/* Metrics Grid */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-900">주요 지표</h2>
        <MetricGrid metrics={metrics} />
      </div>

      {/* Green Label Progress */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-emerald-900">
              🏆 그린라벨 진행률
            </h3>
            <p className="mt-1 text-sm text-emerald-700">
              실측 1등급 데이터 비율: {greenLabelProgress}%
            </p>
          </div>
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white ring-4 ring-emerald-300">
            <div className="text-center">
              <p className="text-3xl font-black text-emerald-600">
                {greenLabelProgress}%
              </p>
              <p className="text-xs text-emerald-600">달성</p>
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-emerald-100">
          <div
            className="h-2 rounded-full bg-emerald-500 transition-all"
            style={{ width: `${greenLabelProgress}%` }}
          />
        </div>
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
            ],
          },
        ]}
      />

      {/* Driving Behavior Metrics */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          운전 행동 지표
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {behaviors.map((behavior) => {
            const Icon = (() => {
              switch (behavior.icon) {
                case 'Gauge':
                  return Zap;
                case 'Wind':
                  return AlertCircle;
                case 'Circle':
                  return Zap;
                default:
                  return Zap;
              }
            })();

            return (
              <div
                key={behavior.label}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      {behavior.label}
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-slate-900">
                      {behavior.score}
                      <span className="text-lg text-slate-500">/100</span>
                    </p>
                  </div>
                  <Icon className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {behavior.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Earnings Trend */}
        <TrendChartEnhanced
          title="주간 수익"
          subtitle="일별 수익액"
          data={earnings}
          chartType="bar"
          color="#10b981"
        />

        {/* Recent Sessions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h3 className="text-lg font-bold tracking-tight text-slate-900">
            최근 운행 기록
          </h3>
          <div className="mt-4 space-y-3">
            {sessions.slice(0, 4).map((session) => (
              <div
                key={session.id}
                className="rounded-lg border border-slate-100 p-3 transition hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {session.date}
                      </p>
                      {getSessionBadge(session.greenLabelEligible)}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      거리: {session.distance}km • 탄소: {session.carbonIntensity.toFixed(1)}
                      gCO₂e/t·km
                    </p>
                    <p className="mt-1 text-sm font-semibold text-emerald-600">
                      ₩{session.earnings.toLocaleString()}
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
        <h3 className="font-semibold text-blue-900">📱 카본 타코그래프</h3>
        <p className="mt-2 text-sm text-blue-800">
          ISO-14083 기반 카본 타코그래프를 연결하여 실측 운행 데이터를 기록하세요.
          <br />
          그린라벨 비율을 높일수록 더 많은 프리미엄 오더를 획득할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
