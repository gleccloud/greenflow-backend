import {
  BadgeCheck,
  BarChart3,
  CircleDollarSign,
  Leaf,
  LineChart,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { HeroShell, MetricPill, MiniBadge } from "../components/Layout";
import {
  FAQ,
  Features,
  FinalCTA,
  Impact,
  LogoStrip,
  Pricing,
  Product,
  Workflow,
} from "../components/SharedSections";

function ShipperRightMock() {
  return (
    <div className="rounded-2xl bg-white">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Scope 3 운송(이번 달)</div>
            <div className="mt-1 text-lg font-extrabold text-slate-900">3,420 tCO₂e</div>
          </div>
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 ring-1 ring-emerald-100">
            목표 대비 -6.2%
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <MetricPill label="평균 집약도" value="86" />
          <MetricPill label="단위" value="g/t·km" />
          <MetricPill label="검증" value="ISO" />
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-extrabold text-slate-900">Fleet 비교(동일 조건)</div>
            <div className="text-xs font-semibold text-slate-500">노선: 인천→대전</div>
          </div>
          <div className="mt-3 space-y-2">
            {[
              { name: "Fleet A", ci: 78, price: "₩ 118k", badge: "실측" },
              { name: "Fleet B", ci: 84, price: "₩ 112k", badge: "ISO" },
              { name: "Fleet C", ci: 96, price: "₩ 105k", badge: "추정" },
            ].map((r) => (
              <div
                key={r.name}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-extrabold text-slate-900">{r.name}</div>
                  <div className="mt-0.5 text-xs font-semibold text-slate-500">탄소집약도(낮을수록 우수)</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-100">
                    {r.badge}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900">{r.ci}</div>
                    <div className="text-xs font-semibold text-slate-500">{r.price}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShipperLanding() {
  return (
    <>
      <HeroShell
        pill="화주기업: Scope 3 감축을 ‘탄소효율 구매’로"
        title={
          <>
            Fleet별 <span className="text-emerald-700">탄소집약도</span>를 비교하고,
            <br />
            더 친환경적인 운송을 구매하세요.
          </>
        }
        subtitle={
          <>
            동일 조건에서 비교 가능한 gCO₂e/t·km 지표와 신뢰도(ISO-14083/실측/커버리지)를 함께
            제공해, 입찰/오더에서 ‘탄소 기준’을 바로 집행할 수 있게 합니다.
          </>
        }
        bullets={[
          { icon: <Leaf className="h-4 w-4" />, text: "노선/물량/차량조건 표준화로 비교 가능" },
          { icon: <BadgeCheck className="h-4 w-4" />, text: "산식/근거 데이터/검증 상태를 1클릭 확인" },
          { icon: <Receipt className="h-4 w-4" />, text: "탄소 Threshold/가중치로 입찰·오더 자동 통제" },
          { icon: <ShieldCheck className="h-4 w-4" />, text: "승인/로그/증빙으로 감사 대응" },
        ]}
        right={<ShipperRightMock />}
      />

      <div className="-mt-6">
        <div className="mx-auto w-full max-w-6xl px-5">
          <div className="grid grid-cols-3 gap-3">
            <MiniBadge icon={<CircleDollarSign className="h-4 w-4" />} text="비용/탄소 동시 최적화" />
            <MiniBadge icon={<BarChart3 className="h-4 w-4" />} text="Scope 3 자동 리포트" />
            <MiniBadge icon={<LineChart className="h-4 w-4" />} text="정책 시뮬레이터(Threshold)" />
          </div>
        </div>
      </div>

      <LogoStrip />
      <Product />
      <Features />
      <Workflow />
      <Impact />
      <Pricing />
      <FAQ />
      <FinalCTA />
    </>
  );
}
