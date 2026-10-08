/**
 * Premium report blocks for /reading — server components only.
 * Visual language matches the existing reading-blocks (glass, ring-gold,
 * font-display, persian-nums). Every block renders its evidence as
 * WHY chips; nothing renders without traceable data.
 */
import type {
  Contradiction, CoreTheme, GrowthCard, LifeArea, StrengthCard,
} from "@/lib/astrology/premium-interpretation";
import { faNum } from "@/lib/astrology/format";
import type { Evidence } from "@/lib/astrology/intelligence";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const KIND_FA: Record<Evidence["kind"], string> = {
  graha: "سیاره", house: "خانه", aspect: "دید", pattern: "الگو",
  element: "عنصر", modality: "کیفیت", sign: "برج", lord: "حاکم",
  dasha: "دوره", av: "اشتاکاورگا",
};

const PRIO_FA = { major: "کلیدی", important: "مهم", supporting: "پشتیبان", minor: "فرعی" } as const;
const PRIO_CLS = {
  major: "border-primary/50 text-primary",
  important: "border-chart-4/50 text-chart-4",
  supporting: "border-border text-muted-foreground",
  minor: "border-border text-muted-foreground",
} as const;

export function WhyChips({ evidence }: { evidence: Evidence[] }) {
  if (evidence.length === 0) return null;
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-[11px] font-semibold text-primary">
        چرا این تفسیر؟ ({faNum(evidence.length)} شاهد)
      </summary>
      <ul className="mt-2 space-y-1.5">
        {evidence.map((e, i) => (
          <li key={i} className="flex items-start gap-2 text-[11px] leading-5">
            <Badge variant="outline" className="shrink-0 text-[9px]">{KIND_FA[e.kind]}</Badge>
            <span>
              <span className="font-semibold">{e.label}</span>
              <span className="text-muted-foreground"> — {e.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function PrioBadge({ p, score }: { p: keyof typeof PRIO_FA; score: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <Badge variant="outline" className={cn("text-[10px]", PRIO_CLS[p])}>{PRIO_FA[p]}</Badge>
      <span className="persian-nums text-[11px] text-muted-foreground">{faNum(score)} از ۱۰۰</span>
    </span>
  );
}

export function ExecutiveBanner({ pattern, signature, topThemes, topStrength, topGrowth }: {
  pattern: string; signature: string; topThemes: string[]; topStrength: string; topGrowth: string;
}) {
  return (
    <div className="glass-strong ring-gold rounded-3xl p-6 sm:p-8">
      <p className="text-xs font-semibold text-primary">خلاصه‌ی اجرایی — کل چارت در یک نگاه</p>
      <p className="font-display mt-3 text-lg leading-9 font-bold sm:text-xl">{pattern}</p>
      <p className="persian-nums text-muted-foreground mt-2 text-xs leading-7">{signature}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-background/60 p-3">
          <p className="text-[11px] font-semibold text-muted-foreground">مهم‌ترین موضوعات</p>
          <p className="mt-1 text-xs leading-6 font-semibold">{topThemes.join(" · ")}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-background/60 p-3">
          <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">مهم‌ترین نقطه‌ی قوت</p>
          <p className="mt-1 text-xs leading-6 font-semibold">{topStrength}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-background/60 p-3">
          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">مهم‌ترین زمینه‌ی رشد</p>
          <p className="mt-1 text-xs leading-6 font-semibold">{topGrowth}</p>
        </div>
      </div>
    </div>
  );
}

export function ThemeCard({ theme, index }: { theme: CoreTheme; index: number }) {
  return (
    <article className="rounded-3xl border bg-card/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base font-bold">
          <span className="persian-nums text-primary ml-2">۰{faNum(index + 1)}</span>
          {theme.title}
        </h3>
        <PrioBadge p={theme.priority} score={theme.score} />
      </div>
      <p className="text-muted-foreground mt-1 text-xs">{theme.fa}</p>
      <p className="mt-3 text-[13px] leading-8">{theme.interpretation}</p>
      <div className="mt-3 rounded-2xl bg-muted/50 p-3">
        <p className="text-[11px] font-semibold text-chart-4">در زندگی روزمره</p>
        <p className="mt-1 text-xs leading-7">{theme.dailyLife}</p>
      </div>
      <WhyChips evidence={theme.evidence} />
    </article>
  );
}


export function ContradictionCard({ c }: { c: Contradiction }) {
  return (
    <article className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-5 sm:p-6">
      <h3 className="font-display text-base font-bold text-amber-600 dark:text-amber-400">⚖ {c.title}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border bg-background/70 p-3">
          <p className="text-xs font-semibold">{c.factorA}</p>
          <p className="text-muted-foreground mt-1 text-[11px] leading-6">← {c.pullA}</p>
        </div>
        <div className="rounded-2xl border bg-background/70 p-3">
          <p className="text-xs font-semibold">{c.factorB}</p>
          <p className="text-muted-foreground mt-1 text-[11px] leading-6">← {c.pullB}</p>
        </div>
      </div>
      <p className="mt-3 text-[13px] leading-8">{c.synthesis}</p>
      <p className="mt-2 text-xs leading-7 text-foreground/90"><span className="font-bold text-chart-4 ml-1">در روزمره:</span>{c.dailyLife}</p>
      <p className="mt-2 rounded-xl bg-muted/50 p-2.5 text-[11px] leading-6 text-muted-foreground"><span className="font-semibold text-foreground ml-1">سؤال تأمل:</span>{c.reflection}</p>
    </article>
  );
}

export function StrengthBlock({ s }: { s: StrengthCard }) {
  return (
    <article className="rounded-3xl border border-emerald-500/25 bg-card/60 p-5">
      <h3 className="font-display text-base font-bold text-emerald-600 dark:text-emerald-400">{s.title}</h3>
      <p className="mt-2 text-[13px] leading-8">{s.interpretation}</p>
      <p className="mt-2 text-xs leading-7"><span className="font-bold ml-1">بروزش در عمل:</span>{s.expression}</p>
      <p className="mt-2 text-xs leading-7 text-muted-foreground"><span className="font-bold text-foreground ml-1">مراقب باش:</span>{s.challenge}</p>
      <WhyChips evidence={s.evidence} />
    </article>
  );
}

export function GrowthBlock({ g }: { g: GrowthCard }) {
  return (
    <article className="rounded-3xl border bg-card/60 p-5">
      <h3 className="font-display text-base font-bold">{g.pattern}</h3>
      <dl className="mt-3 space-y-2 text-xs leading-7">
        <div><dt className="font-bold inline ml-1">بروزش:</dt><dd className="inline text-foreground/90">{g.manifestation}</dd></div>
        <div><dt className="font-bold inline ml-1 text-red-600 dark:text-red-400">ریسک:</dt><dd className="inline text-foreground/90">{g.risk}</dd></div>
        <div><dt className="font-bold inline ml-1 text-emerald-600 dark:text-emerald-400">فرصت رشد:</dt><dd className="inline text-foreground/90">{g.opportunity}</dd></div>
      </dl>
      <p className="mt-2 rounded-xl bg-muted/50 p-2.5 text-[11px] leading-6 text-muted-foreground"><span className="font-semibold text-foreground ml-1">سؤال تأمل:</span>{g.reflection}</p>
      <WhyChips evidence={g.evidence} />
    </article>
  );
}

export function LifeAreaCard({ area }: { area: LifeArea }) {
  return (
    <article className="rounded-3xl border bg-card/60 p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-base font-bold"><span className="ml-2" aria-hidden>{area.icon}</span>{area.fa}</h3>
        <PrioBadge p={area.priority} score={area.score} />
      </div>
      <p className="mt-2 text-[13px] leading-8 font-medium">{area.summary}</p>
      <p className="text-muted-foreground mt-1 text-xs leading-7">{area.detail}</p>
      <div className="mt-3 rounded-2xl bg-muted/50 p-3">
        <p className="text-[11px] font-semibold text-chart-4">در زندگی روزمره</p>
        <p className="mt-1 text-xs leading-7">{area.dailyLife}</p>
      </div>
      <p className="mt-2 text-[11px] leading-6 text-muted-foreground"><span className="font-semibold text-foreground ml-1">تأمل:</span>{area.reflection}</p>
      <WhyChips evidence={area.evidence} />
    </article>
  );
}

export function QualityFooter({ sections, evidenceCount, coverage }: { sections: number; evidenceCount: number; coverage: string }) {
  return (
    <div className="rounded-3xl border bg-muted/30 p-5 text-center">
      <p className="text-xs font-semibold">شفافیت گزارش</p>
      <p className="persian-nums text-muted-foreground mt-1 text-[11px] leading-6">
        {faNum(sections)} بخش تحلیلی · {faNum(evidenceCount)} شاهد نجومی قابل‌ردیابی · بدون درصد ساختگی
      </p>
      <p className="text-muted-foreground mt-1 text-[11px] leading-6">{coverage}</p>
    </div>
  );
}
