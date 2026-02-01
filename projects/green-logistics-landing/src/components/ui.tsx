import React from "react";
import { ArrowRight, Check, ChevronRight } from "lucide-react";

export type NavItem = { label: string; href: string };

export function classNames(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={classNames("mx-auto w-full max-w-6xl px-5", className)}>{children}</div>;
}

export function Button({
  children,
  href,
  variant = "primary",
  onClick,
}: {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
  onClick?: () => void;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2";
  const styles = {
    primary: "bg-emerald-600 text-white shadow-soft hover:bg-emerald-700",
    secondary: "bg-slate-900 text-white hover:bg-slate-800",
    ghost: "bg-white/60 text-slate-900 ring-1 ring-slate-200 hover:bg-white",
  } as const;

  const cls = classNames(base, styles[variant]);

  if (href) {
    return (
      <a className={cls} href={href}>
        {children}
      </a>
    );
  }
  return (
    <button className={cls} onClick={onClick}>
      {children}
    </button>
  );
}

export function CTAButton({ text }: { text: string }) {
  return (
    <Button href="#pricing" variant="primary">
      {text} <ArrowRight className="h-4 w-4" />
    </Button>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="max-w-2xl">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {eyebrow}
      </div>
      <h2 className="text-balance text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">{title}</h2>
      <p className="mt-4 text-pretty text-base leading-7 text-slate-600 md:text-lg">{desc}</p>
    </div>
  );
}

export function Card({
  title,
  desc,
  icon,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{desc}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
        자세히 <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </div>
    </div>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <div className="space-y-2">
      {items.map((b) => (
        <div key={b} className="flex items-start gap-2 text-sm text-slate-700">
          <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-700" />
          <span>{b}</span>
        </div>
      ))}
    </div>
  );
}
