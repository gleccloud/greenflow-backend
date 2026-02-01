import { Link, useLocation } from "react-router-dom";
import { BadgeCheck, Leaf, Truck } from "lucide-react";
import { classNames } from "./ui";

type PersonaKey = "shipper" | "carrier" | "owner";

const personaTabs: Array<{
  key: PersonaKey;
  label: string;
  to: string;
  icon: React.ReactNode;
  blurb: string;
}> = [
  {
    key: "shipper",
    label: "화주기업",
    to: "/shipper",
    icon: <Leaf className="h-4 w-4" />,
    blurb: "Scope 3 감축을 탄소효율 구매로",
  },
  {
    key: "carrier",
    label: "물류/주선",
    to: "/carrier",
    icon: <BadgeCheck className="h-4 w-4" />,
    blurb: "ISO-14083 기반 신뢰/프리미엄",
  },
  {
    key: "owner",
    label: "화물차주",
    to: "/owner",
    icon: <Truck className="h-4 w-4" />,
    blurb: "카본 타코그래프 실측 + 그린라벨 오더",
  },
];

function activeKeyFromPath(pathname: string): PersonaKey {
  if (pathname.startsWith("/carrier")) return "carrier";
  if (pathname.startsWith("/owner")) return "owner";
  return "shipper";
}

export function PersonaNav({ compact = false }: { compact?: boolean }) {
  const loc = useLocation();
  const active = activeKeyFromPath(loc.pathname);

  return (
    <div className={classNames("rounded-3xl border border-slate-200 bg-white/80 p-2 shadow-sm backdrop-blur", compact && "bg-white")}> 
      <div className={classNames("grid gap-2", compact ? "grid-cols-3" : "grid-cols-1 md:grid-cols-3")}> 
        {personaTabs.map((t) => {
          const isActive = t.key === active;
          return (
            <Link
              key={t.key}
              to={t.to}
              className={classNames(
                "rounded-2xl px-4 py-3 ring-1 transition",
                isActive
                  ? "bg-emerald-600 text-white ring-emerald-600"
                  : "bg-white text-slate-900 ring-slate-200 hover:bg-slate-50"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 text-xs font-extrabold opacity-95">
                    <span className={classNames("inline-flex", isActive ? "text-white" : "text-emerald-700")}>{t.icon}</span>
                    {t.label}
                  </div>
                  <div className={classNames("mt-1 text-sm font-black", isActive ? "text-white" : "text-slate-900")}>
                    {t.blurb}
                  </div>
                </div>
                <div className={classNames("hidden rounded-full px-2 py-1 text-[11px] font-bold ring-1 md:inline-flex", isActive ? "bg-white/15 text-white ring-white/20" : "bg-emerald-50 text-emerald-800 ring-emerald-100")}>
                  {isActive ? "현재" : "보기"}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
