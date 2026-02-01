import {
  BadgeCheck,
  BarChart3,
  Building2,
  Leaf,
  Route,
  ShieldCheck,
  Truck,
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

function CarrierRightMock() {
  return (
    <div className="rounded-2xl bg-white">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Premium(그린라벨) 수주</div>
            <div className="mt-1 text-lg font-extrabold text-slate-900">이번 달 42건</div>
          </div>
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 ring-1 ring-emerald-100">
            +18% MoM
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <MetricPill label="ISO-14083" value="준수" />
          <MetricPill label="실측 커버" value="62%" />
          <MetricPill label="평균 집약도" value="83" />
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-extrabold text-slate-900">Fleet 성과(개선 기회)</div>
            <div className="text-xs font-semibold text-slate-500">최근 14일</div>
          </div>
          <div className="mt-3 space-y-2">
            {[
              { k: "공차율", v: "14%", tag: "개선" },
              { k: "대기시간", v: "-9%", tag: "개선" },
              { k: "탄소집약도", v: "-4.8%", tag: "우수" },
            ].map((r) => (
              <div
                key={r.k}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <div className="text-sm font-extrabold text-slate-900">{r.k}</div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-100">
                    {r.tag}
                  </div>
                  <div className="text-sm font-black text-slate-900">{r.v}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CarrierLanding() {
  return (
    <>
      <HeroShell
        pill="물류기업/주선: ISO-14083 기반 신뢰를 ‘수주 경쟁력’으로"
        title={
          <>
            투명한 탄소 데이터로
            <br />
            <span className="text-emerald-700">프리미엄 운송</span>을 제안하세요.
          </>
        }
        subtitle={
          <>
            ISO-14083 기반 산정/보고 체계와 (옵션) 실측 기반 데이터를 함께 제시해, 화주에게 신뢰도 높은
            Scope 3 데이터를 제공하고 그린라벨 오더를 선점합니다.
          </>
        }
        bullets={[
          { icon: <BadgeCheck className="h-4 w-4" />, text: "ISO-14083 산정/보고 + 산식/버전/근거 관리" },
          { icon: <Leaf className="h-4 w-4" />, text: "Fleet 탄소집약도 공개로 ‘낮은 탄소 = 높은 점수’" },
          { icon: <Route className="h-4 w-4" />, text: "공차/대기/경로 개선 추천으로 지표 개선" },
          { icon: <ShieldCheck className="h-4 w-4" />, text: "검증/감사 로그로 고객사 컴플라이언스 대응" },
        ]}
        right={<CarrierRightMock />}
      />

      <div className="-mt-6">
        <div className="mx-auto w-full max-w-6xl px-5">
          <div className="grid grid-cols-3 gap-3">
            <MiniBadge icon={<Building2 className="h-4 w-4" />} text="화주별 리포트 공유" />
            <MiniBadge icon={<Truck className="h-4 w-4" />} text="Fleet 성과/커버리지 관리" />
            <MiniBadge icon={<BarChart3 className="h-4 w-4" />} text="그린라벨 파이프라인" />
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
