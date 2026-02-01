import {
  BadgeCheck,
  CircleDollarSign,
  Leaf,
  ShieldCheck,
  Truck,
  Wrench,
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

function OwnerRightMock() {
  return (
    <div className="rounded-2xl bg-white">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">그린라벨 적격</div>
            <div className="mt-1 text-lg font-extrabold text-slate-900">거의 완료</div>
          </div>
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 ring-1 ring-emerald-100">
            실측 연동 권장
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <MetricPill label="내 집약도" value="79" />
          <MetricPill label="단위" value="g/t·km" />
          <MetricPill label="포인트" value="2,140" />
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-extrabold text-slate-900">운행 개선 체크</div>
            <div className="text-xs font-semibold text-slate-500">최근 7일</div>
          </div>
          <div className="mt-3 space-y-2">
            {[
              { k: "공회전", v: "-12%", tag: "개선" },
              { k: "급가속", v: "-6%", tag: "주의" },
              { k: "정속주행", v: "+9%", tag: "우수" },
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

export default function OwnerLanding() {
  return (
    <>
      <HeroShell
        pill="화물차주: 실측 기반 공개 + 독점 그린라벨 오더"
        title={
          <>
            카본 타코그래프 실측으로
            <br />
            <span className="text-emerald-700">그린라벨 오더</span>를 받으세요.
          </>
        }
        subtitle={
          <>
            운행 데이터(정속/공회전/급가속)와 차량 정보를 기반으로 탄소집약도를 개선하고, 실측 기반 신뢰도
            배지로 프리미엄/독점 오더를 확보할 수 있게 합니다.
          </>
        }
        bullets={[
          { icon: <Truck className="h-4 w-4" />, text: "그린라벨 적격 조건/진행률을 한 눈에" },
          { icon: <BadgeCheck className="h-4 w-4" />, text: "실측 배지로 신뢰도 상승 → 우선 배정" },
          { icon: <Wrench className="h-4 w-4" />, text: "운행 습관 기반 탄소 개선 미션/가이드" },
          { icon: <ShieldCheck className="h-4 w-4" />, text: "오더 단위 정산/증빙 근거 투명화" },
        ]}
        right={<OwnerRightMock />}
      />

      <div className="-mt-6">
        <div className="mx-auto w-full max-w-6xl px-5">
          <div className="grid grid-cols-3 gap-3">
            <MiniBadge icon={<Leaf className="h-4 w-4" />} text="그린라벨 우선 오더" />
            <MiniBadge icon={<CircleDollarSign className="h-4 w-4" />} text="정산 투명/빠른 지급" />
            <MiniBadge icon={<BadgeCheck className="h-4 w-4" />} text="실측 배지/포인트" />
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
