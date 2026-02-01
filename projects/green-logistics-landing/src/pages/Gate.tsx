import { BadgeCheck, ChevronRight, Leaf, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { Container, classNames } from "../components/ui";

function GateCard({
  to,
  icon,
  title,
  desc,
  bullets,
  badge,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  bullets: string[];
  badge: string;
}) {
  return (
    <Link
      to={to}
      className={classNames(
        "group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition",
        "hover:-translate-y-0.5 hover:shadow-soft"
      )}
    >
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-200/40 blur-2xl" />
      <div className="absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800 ring-1 ring-emerald-100">
            <span className="text-emerald-700">{icon}</span>
            {badge}
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-200 transition group-hover:bg-white">
            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </div>
        </div>

        <div className="mt-4 text-xl font-black tracking-tight text-slate-900">{title}</div>
        <div className="mt-2 text-sm leading-6 text-slate-600">{desc}</div>

        <div className="mt-4 space-y-2">
          {bullets.map((b) => (
            <div key={b} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{b}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-emerald-700">
          맞춤 페이지로 이동 <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

export default function Gate() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-white" />
      <div className="absolute inset-0 bg-grid opacity-[0.35]" />
      <div className="absolute -top-28 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-300/20 blur-3xl" />

      <Container className="relative py-12 md:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            <Leaf className="h-3.5 w-3.5" />
            ISO-14083 기반 탄소 인프라 + Fleet 비교
          </div>
          <h1 className="mt-5 text-balance text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
            누구의 관점에서
            <span className="bg-gradient-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent"> 시작</span>
            할까요?
          </h1>
          <p className="mt-5 text-pretty text-base leading-7 text-slate-600 md:text-lg">
            GreenFlow는 ‘비교 가능한 탄소집약도(gCO₂e/t·km)’를 중심으로, 화주기업의 구매(입찰/오더),
            물류/주선의 신뢰 기반 프리미엄 제공, 화물차주의 실측 데이터 공개를 각각의 UX로 최적화합니다.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <GateCard
            to="/shipper"
            icon={<Leaf className="h-4 w-4" />}
            badge="화주기업"
            title="Scope 3를 ‘구매’로 감축"
            desc="탄소효율이 높은 운송 서비스를 입찰/오더로 구매해, 감축을 ‘결정’으로 만듭니다."
            bullets={["Fleet 탄소집약도 비교", "탄소 Threshold/가중치 구매 정책", "감사/리포트 자동화"]}
          />
          <GateCard
            to="/carrier"
            icon={<BadgeCheck className="h-4 w-4" />}
            badge="물류/주선"
            title="ISO-14083 신뢰로 프리미엄 수주"
            desc="검증 가능한 투명한 탄소 데이터를 대시보드/API로 제공해, 화주에게 프리미엄을 제안합니다."
            bullets={["ISO-14083 기반 산정/보고", "데이터 출처 등급(1/2) 표시", "그린라벨 파이프라인"]}
          />
          <GateCard
            to="/owner"
            icon={<Truck className="h-4 w-4" />}
            badge="화물차주"
            title="실측 공개로 그린라벨 오더"
            desc="ISO-14083 기술 탑재 카본 타코그래프 등 실측 데이터는 1등급으로, 모델링은 2등급으로 표시됩니다."
            bullets={["실측(1등급) 배지", "운행 개선 미션/포인트", "정산/증빙 투명화"]}
          />
        </div>

        <div className="mx-auto mt-10 max-w-5xl rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="grid gap-4 md:grid-cols-3">
            <Info
              title="데이터 출처 등급"
              desc="보고서/공개 화면에 출처를 표시합니다: 1등급=실측(ISO-14083 기술 기반), 2등급=모델링."
            />
            <Info
              title="활용 범위"
              desc="대시보드/리포트뿐 아니라 입찰/오더/공개 페이지에서 탄소 지표를 함께 노출합니다."
            />
            <Info
              title="연동"
              desc="물류기업 전산시스템 및 탄소 인프라 기술과 API/Webhook으로 연결해 데이터 중복 입력을 줄입니다."
            />
          </div>
        </div>
      </Container>
    </section>
  );
}

function Info({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
      <div className="text-sm font-extrabold text-slate-900">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{desc}</div>
    </div>
  );
}
