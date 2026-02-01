import { Link, Outlet } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Clock3,
  Leaf,
  ShieldCheck,
} from "lucide-react";
import { Button, Container } from "./ui";
import type { NavItem } from "./ui";
import { PersonaNav } from "./PersonaNav";

const nav: NavItem[] = [
  { label: "제품", href: "#product" },
  { label: "기능", href: "#features" },
  { label: "프로세스", href: "#workflow" },
  { label: "효과", href: "#impact" },
  { label: "요금", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function Layout() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <div className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link to="/shipper" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-400 text-white shadow-soft">
            <Leaf className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-extrabold tracking-tight text-slate-900">GreenFlow</div>
            <div className="text-xs font-medium text-slate-500">탄소집약도 기반 물류 구매</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button href="#pricing" variant="ghost">
            데모 요청
          </Button>
          <Button href="#pricing" variant="primary">
            시작하기 <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Container>
    </div>
  );
}

export function HeroShell({
  pill,
  title,
  subtitle,
  bullets,
  right,
}: {
  pill: string;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  bullets: Array<{ icon: React.ReactNode; text: string }>;
  right: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-white" />
      <div className="absolute inset-0 bg-grid opacity-[0.35]" />
      <div className="absolute -top-28 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-300/20 blur-3xl" />

      <Container className="relative py-10 md:py-14">
        <div className="mb-5">
          <PersonaNav compact />
        </div>

        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {pill}
            </div>
            <h1 className="mt-5 text-balance text-4xl font-black tracking-tight text-slate-900 md:text-5xl">{title}</h1>
            <div className="mt-5 max-w-xl text-pretty text-base leading-7 text-slate-600 md:text-lg">{subtitle}</div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button href="#pricing" variant="primary">
                데모 요청하기 <ArrowRight className="h-4 w-4" />
              </Button>
              <Button href="#features" variant="ghost">
                기능 살펴보기
              </Button>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  엔터프라이즈 보안
                </span>
              </div>
            </div>

            <div className="mt-7 space-y-2">
              {bullets.map((b) => (
                <div key={b.text} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-0.5 text-emerald-700">{b.icon}</span>
                  <span className="leading-6">{b.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-emerald-200/60 via-white to-white blur-xl" />
            <div className="relative rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-soft backdrop-blur">
              {right}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <Container className="py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-400 text-white shadow-soft">
                <Leaf className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-900">GreenFlow</div>
                <div className="text-xs font-medium text-slate-500">탄소집약도 기반 물류 구매 플랫폼</div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Fleet 단위 탄소집약도 공개로 Scope 3 감축을 ‘구매 의사결정’으로 연결합니다.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 md:col-span-2 md:grid-cols-3">
            <FooterCol title="제품" items={["입찰", "오더", "배차", "정산"]} icon={<BarChart3 className="h-4 w-4" />} />
            <FooterCol title="대상" items={["화주기업", "물류/주선", "화물차주"]} icon={<Building2 className="h-4 w-4" />} />
            <FooterCol title="리소스" items={["보안", "표준(ISO-14083)", "API", "문의"]} icon={<ShieldCheck className="h-4 w-4" />} />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-6 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} GreenFlow. All rights reserved.</div>
          <div className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-4 w-4" /> Asia/Seoul
            </span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1">
              <BarChart3 className="h-4 w-4" /> v1 Landing
            </span>
          </div>
        </div>
      </Container>
    </footer>
  );
}

function FooterCol({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 inline-flex items-center gap-2 text-xs font-extrabold text-slate-900">
        <span className="text-emerald-700">{icon}</span>
        {title}
      </div>
      <div className="space-y-2">
        {items.map((i) => (
          <a key={i} href="#" className="block text-sm font-semibold text-slate-600 hover:text-slate-900">
            {i}
          </a>
        ))}
      </div>
    </div>
  );
}

export function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">{value}</div>
    </div>
  );
}

export function MiniBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 shadow-sm">
      <span className="text-emerald-700">{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  );
}
