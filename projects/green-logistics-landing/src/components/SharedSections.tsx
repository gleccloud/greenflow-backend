import React from "react";
import {
  BadgeCheck,
  BarChart3,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Leaf,
  LineChart,
  MessageCircleQuestion,
  Receipt,
  Route,
  ShieldCheck,
  Truck,
  Users,
  Workflow as WorkflowIcon,
} from "lucide-react";
import { Button, Card, Container, SectionHeading, classNames } from "./ui";

export function LogoStrip() {
  const logos = ["ShipperCo", "3PL Works", "CarrierOne", "WarehouseX", "FleetOps", "EcoRoute"];
  return (
    <section className="border-y border-slate-200 bg-white">
      <Container className="py-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-semibold text-slate-600">파일럿부터 엔터프라이즈까지 빠르게 확장</div>
          <div className="flex flex-wrap items-center gap-3">
            {logos.map((l) => (
              <div
                key={l}
                className="rounded-xl bg-slate-50 px-4 py-2 text-xs font-extrabold tracking-wide text-slate-500 ring-1 ring-slate-200"
              >
                {l}
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

export function Product() {
  return (
    <section id="product" className="py-14 md:py-20">
      <Container>
        <div className="grid gap-10 md:grid-cols-2 md:items-start">
          <SectionHeading
            eyebrow="탄소 중심 운영"
            title="탄소집약도(gCO₂e/t·km)를 ‘비교 가능한 지표’로 만드는 플랫폼"
            desc="Fleet(편대) 단위로 운송서비스의 탄소효율을 비교·공개하고, 화주는 이를 기준으로 입찰/오더를 집행해 Scope 3를 줄입니다. 공급자는 ISO-14083 등 표준 기반으로 신뢰를 확보합니다."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoTile
              icon={<Leaf className="h-5 w-5" />}
              title="탄소집약도 공개"
              desc="Fleet/차량 타입/노선별 gCO₂e/t·km 비교 + 산식/근거 데이터"
            />
            <InfoTile
              icon={<Receipt className="h-5 w-5" />}
              title="입찰/오더에 탄소 반영"
              desc="가중치/하한선(Threshold)로 ‘탄소효율 구매’ 자동화"
            />
            <InfoTile
              icon={<BadgeCheck className="h-5 w-5" />}
              title="검증/신뢰"
              desc="ISO-14083 기반 산정 + 감사 로그/증빙 관리"
            />
            <InfoTile
              icon={<LineChart className="h-5 w-5" />}
              title="Scope 3 리포트"
              desc="거점/사업부/노선 단위 리포트 자동 생성 및 추적"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}

function InfoTile({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700 ring-1 ring-emerald-100">
        {icon}
        <div className="text-sm font-extrabold">{title}</div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{desc}</p>
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="bg-slate-50 py-14 md:py-20">
      <Container>
        <div className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="핵심 기능"
            title="투명성(측정/검증) + 구매(입찰/오더) + 운영(배차/정산)까지 연결"
            desc="탄소는 지표로만 존재하면 바뀌지 않습니다. GreenFlow는 ‘구매 의사결정’과 ‘운영 실행’에 탄소를 끼워 넣어 실제 감축으로 이어지게 합니다."
          />

          <div className="grid gap-4 md:grid-cols-3">
            <Card
              icon={<WorkflowIcon className="h-5 w-5" />}
              title="승인·권한 워크플로"
              desc="탄소 기준 미달(고탄소) 오더는 자동 차단 또는 승인 예외 처리로 통제합니다."
            />
            <Card
              icon={<Route className="h-5 w-5" />}
              title="추천/최적화 엔진"
              desc="탄소·비용·리드타임 트레이드오프를 가중치로 설정하고 최적안을 제시합니다."
            />
            <Card
              icon={<ShieldCheck className="h-5 w-5" />}
              title="컴플라이언스/보안"
              desc="RBAC, 데이터 분리, 감사 로그, 내보내기 제어로 엔터프라이즈 요구에 대응합니다."
            />
            <Card
              icon={<Users className="h-5 w-5" />}
              title="화주-3PL-운송사 협업"
              desc="예외 상황(지연/대기/부대비)을 코멘트/첨부/알림으로 투명하게 처리합니다."
            />
            <Card
              icon={<BarChart3 className="h-5 w-5" />}
              title="KPI & 리포팅"
              desc="Scope 3, OTIF, 리드타임, 비용, 클레임을 한 대시보드에서 추적합니다."
            />
            <Card
              icon={<Building2 className="h-5 w-5" />}
              title="ERP/WMS/TMS 연동"
              desc="API/Webhook으로 오더/이벤트/정산 데이터를 연결해 중복 입력을 최소화합니다."
            />
          </div>
        </div>
      </Container>
    </section>
  );
}

export function Workflow() {
  const steps = [
    {
      title: "탄소 데이터 수집/검증",
      desc: "ISO-14083 기반 산정/검증 + (옵션) 카본 타코그래프 실측 데이터를 결합합니다.",
      icon: <BadgeCheck className="h-5 w-5" />,
    },
    {
      title: "입찰/오더 생성",
      desc: "노선/물량/제약조건에 탄소 기준(가중치/하한선)을 포함해 요청을 배포합니다.",
      icon: <Receipt className="h-5 w-5" />,
    },
    {
      title: "낙찰/배차",
      desc: "Fleet 탄소집약도와 운영 KPI를 함께 점수화해 추천안을 제시하고, 클릭으로 확정합니다.",
      icon: <Truck className="h-5 w-5" />,
    },
    {
      title: "정산/Scope 3 보고",
      desc: "증빙/로그를 오더 단위로 저장하고, 리포트를 자동 생성해 감사 대응까지 지원합니다.",
      icon: <LineChart className="h-5 w-5" />,
    },
  ];

  return (
    <section id="workflow" className="py-14 md:py-20">
      <Container>
        <div className="grid gap-10 md:grid-cols-2 md:items-start">
          <SectionHeading
            eyebrow="End-to-end"
            title="데이터가 ‘공개’되는 순간, 구매가 바뀌고 감축이 시작됩니다"
            desc="비교 가능한 탄소집약도 + 구매 정책 + 운영 실행 + 리포팅을 하나로 묶어, ‘보고용’이 아니라 ‘감축용’ 시스템으로 만듭니다."
          />

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              {steps.map((s, idx) => (
                <div key={s.title} className="flex gap-4">
                  <div className="flex-none">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                      {s.icon}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-extrabold text-slate-900">
                        {idx + 1}. {s.title}
                      </div>
                      {idx !== steps.length - 1 ? (
                        <span className="text-xs font-semibold text-slate-400">→</span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-slate-600">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                {[
                  "비교 가능 지표",
                  "구매 정책 반영",
                  "감사 로그",
                  "Scope 3 자동 리포트",
                ].map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200"
                  >
                    <Check className="h-4 w-4 text-emerald-700" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function Impact() {
  return (
    <section id="impact" className="bg-slate-900 py-14 md:py-20">
      <Container>
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/15">
              <Leaf className="h-4 w-4 text-emerald-300" />
              Sustainability + Profit
            </div>
            <h2 className="mt-4 text-balance text-3xl font-black tracking-tight text-white md:text-4xl">
              ‘녹색’은 비용이 아니라 <span className="text-emerald-300">경쟁력</span>입니다.
            </h2>
            <p className="mt-4 text-pretty text-base leading-7 text-slate-300 md:text-lg">
              탄소효율이 높은 운송은 대개 공차·대기·재작업을 줄입니다. GreenFlow는 투명한 지표와 구매
              메커니즘으로 실제 감축을 만들고, 동시에 원가/서비스 품질을 개선합니다.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-4">
              <DarkStat icon={<CircleDollarSign className="h-5 w-5" />} label="총 물류비" value="↓ 3–8%" />
              <DarkStat icon={<Clock3 className="h-5 w-5" />} label="리드타임" value="↓ 10–20%" />
              <DarkStat icon={<Leaf className="h-5 w-5" />} label="Scope 3" value="↓ 5–12%" />
              <DarkStat
                icon={<MessageCircleQuestion className="h-5 w-5" />}
                label="클레임"
                value="↓ 15%+"
              />
            </div>
          </div>

          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-sm font-extrabold text-white">신뢰/검증 체크리스트</div>
            <div className="mt-4 space-y-3">
              <DarkCheck text="ISO-14083 기반 산정/보고" />
              <DarkCheck text="산식/근거 데이터/버전 관리" />
              <DarkCheck text="카본 타코그래프 실측(옵션)" />
              <DarkCheck text="권한·승인·감사 로그" />
              <DarkCheck text="오더 단위 증빙/정산 표준화" />
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button href="#pricing" variant="primary">
                PoC 상담 <ChevronRight className="h-4 w-4" />
              </Button>
              <Button href="#faq" variant="ghost">
                FAQ 보기
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function DarkStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-300">{label}</div>
        <div className="text-emerald-300">{icon}</div>
      </div>
      <div className="mt-1 text-2xl font-black tracking-tight text-white">{value}</div>
    </div>
  );
}

function DarkCheck({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-slate-200">
      <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-300" />
      <span>{text}</span>
    </div>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="py-14 md:py-20">
      <Container>
        <div className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="Pricing"
            title="규모와 성숙도에 맞춰, 단계적으로 도입"
            desc="정확한 견적은 운영 범위(노선/물량/거점)와 연동(ERP/WMS/TMS), 그리고 검증(ISO-14083/실측) 옵션에 따라 달라집니다. 아래는 일반적인 패키지 예시입니다."
          />

          <div className="grid gap-4 md:grid-cols-3">
            <PriceCard
              title="Starter"
              price="월 190만원~"
              highlight={false}
              desc="파일럿 / 1개 사업부 / 기본 공개/리포트"
              features={["탄소집약도 비교(기본)", "입찰/오더 기본", "기본 리포트", "표준 권한 템플릿"]}
            />
            <PriceCard
              title="Growth"
              price="월 490만원~"
              highlight={true}
              desc="구매 정책 적용 / 검증 / 자동화"
              features={["탄소 Threshold/가중치", "승인 워크플로", "KPI 대시보드", "API/Webhook 연동"]}
            />
            <PriceCard
              title="Enterprise"
              price="문의"
              highlight={false}
              desc="그룹사/글로벌 / 보안/감사 / 실측 연동"
              features={["RBAC 고도화", "감사/내보내기 통제", "실측(타코그래프) 옵션", "전담 지원/보안 심사"]}
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-extrabold text-slate-900">데모/견적에 필요한 정보</div>
                <div className="mt-1 text-sm text-slate-600">
                  월 물량 · 노선 수 · Fleet/차량 수 · 검증 옵션(ISO-14083/실측) · 연동 대상 시스템(ERP/WMS/TMS)
                </div>
              </div>
              <a
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                href="#"
              >
                15분 미팅 잡기 <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function PriceCard({
  title,
  price,
  desc,
  features,
  highlight,
}: {
  title: string;
  price: string;
  desc: string;
  features: string[];
  highlight: boolean;
}) {
  return (
    <div
      className={classNames(
        "relative rounded-3xl border bg-white p-6 shadow-sm",
        highlight ? "border-emerald-200 ring-2 ring-emerald-200" : "border-slate-200"
      )}
    >
      {highlight ? (
        <div className="absolute -top-3 left-6 rounded-full bg-emerald-600 px-3 py-1 text-xs font-extrabold text-white shadow-soft">
          추천
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <div className="text-lg font-black text-slate-900">{title}</div>
        <div className="text-xs font-semibold text-slate-500">B2B</div>
      </div>
      <div className="mt-3 text-3xl font-black tracking-tight text-slate-900">{price}</div>
      <div className="mt-2 text-sm text-slate-600">{desc}</div>
      <div className="mt-5 space-y-2">
        {features.map((f) => (
          <div key={f} className="flex items-start gap-2 text-sm text-slate-700">
            <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-700" />
            <span>{f}</span>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <Button href="#" variant={highlight ? "primary" : "ghost"}>
          {title === "Enterprise" ? "상담하기" : "데모 요청"}
        </Button>
      </div>
    </div>
  );
}

export function FAQ() {
  const faqs = [
    {
      q: "탄소집약도는 어떻게 비교 가능하게 만드나요?",
      a: "노선/거리/적재/차량 타입 등 조건을 표준화하고, ISO-14083 기반 산정/보고 체계를 적용합니다. 산식/근거 데이터/버전을 함께 노출해 비교 가능성과 감사 가능성을 확보합니다.",
    },
    {
      q: "실측 기반(카본 타코그래프)도 지원하나요?",
      a: "옵션입니다. 실측 데이터가 있는 Fleet/차량은 ‘실측’ 배지를 통해 신뢰도를 높이고, 그린라벨 오더 등 프리미엄 매칭에 활용할 수 있습니다.",
    },
    {
      q: "기존 TMS/ERP/WMS가 있는데 교체해야 하나요?",
      a: "아니요. GreenFlow는 연동을 전제로 설계합니다. 오더 생성/이벤트/정산 데이터를 API 또는 Webhook으로 연결하고 단계적으로 범위를 확장합니다.",
    },
    {
      q: "도입까지 얼마나 걸리나요?",
      a: "일반적으로 파일럿은 2–4주, 본 구축은 6–12주 범위입니다. 연동 범위와 검증 옵션에 따라 달라집니다.",
    },
  ];

  return (
    <section id="faq" className="bg-slate-50 py-14 md:py-20">
      <Container>
        <div className="grid gap-10 md:grid-cols-2 md:items-start">
          <SectionHeading
            eyebrow="FAQ"
            title="도입 전에 가장 많이 묻는 질문"
            desc="필요하면 귀사의 업무 흐름을 기준으로 데모 시나리오를 만들어 드립니다."
          />

          <div className="space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-slate-200 bg-white p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <div className="text-sm font-extrabold text-slate-900">{f.q}</div>
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-50 text-slate-700 ring-1 ring-slate-200">
                    <ChevronRight className="h-4 w-4 transition group-open:rotate-90" />
                  </div>
                </summary>
                <div className="mt-3 text-sm leading-6 text-slate-600">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-14 md:py-20">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-white" />
      <div className="absolute -bottom-24 right-0 h-[420px] w-[420px] rounded-full bg-emerald-200/40 blur-3xl" />
      <Container className="relative">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft md:p-10">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
                <Leaf className="h-4 w-4" />
                Ready to go green
              </div>
              <h3 className="mt-3 text-balance text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                2주 안에 파일럿을 시작하고, <span className="text-emerald-700">감축 지표</span>를 확인하세요.
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                실제 노선/물량 기준으로 데모를 구성하고, 도입 로드맵(연동/권한/검증 옵션)을 함께 설계합니다.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button href="#" variant="primary">
                데모 요청
              </Button>
              <Button href="#" variant="ghost">
                소개서 요청
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
