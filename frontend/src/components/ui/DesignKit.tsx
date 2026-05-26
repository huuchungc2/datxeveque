import type React from "react";
import { ArrowRight, ClipboardList, MapPinned, Sparkles } from "lucide-react";

export function PublicHero({
  eyebrow = "Đặt Xe Về Quê",
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,.35),transparent_34%),radial-gradient(circle_at_75%_25%,rgba(249,115,22,.25),transparent_28%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-teal-50 backdrop-blur">
            <Sparkles size={14} /> {eyebrow}
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight md:text-5xl">{title}</h1>
          {subtitle && <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 md:text-lg">{subtitle}</p>}
          {children && <div className="mt-7">{children}</div>}
        </div>
      </div>
    </section>
  );
}

export function PageIntro({
  eyebrow = "Đặt Xe Về Quê",
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-brand-700">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900 md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-500 md:text-base">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card grid place-items-center px-6 py-10 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-3xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
        {icon || <ClipboardList size={26} />}
      </div>
      <h2 className="mt-4 text-lg font-extrabold text-ink-900">{title}</h2>
      {subtitle && <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function InfoPill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 ring-1 ring-brand-100">{children}</span>;
}

export function RouteCard({ title, subtitle, href }: { title: string; subtitle?: string; href: string }) {
  return (
    <a href={href} className="group flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft">
      <span className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-700"><MapPinned size={21} /></span>
        <span><b className="block text-ink-900">{title}</b>{subtitle && <span className="text-sm text-ink-500">{subtitle}</span>}</span>
      </span>
      <ArrowRight className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-brand-700" size={19} />
    </a>
  );
}
