/**
 * Data-driven visual blocks for the /reading page: medallions, element
 * bars, house cards, graha voice cards and the dasha timeline.
 * Server components only — no hooks, no client JS.
 */
import type { SynthesisSection } from "@/lib/astrology/intelligence"
import { faNum } from "@/lib/astrology/format"
import type {
  ElementBar,
  GrahaVoice,
  HouseItem,
  Medallion,
  PatternItem,
  TimelineItem,
} from "@/lib/astrology/reading"
import { fortuneDotStyles } from "@/components/reading/fortune-dots"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const ELEMENT_ACCENT: Record<ElementBar["key"], string> = {
  fire: "chart-4",
  earth: "chart-5",
  air: "chart-3",
  water: "chart-10",
}

const VOICE_TONE: Record<GrahaVoice["badgeTone"], string> = {
  good: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
  soft: "border-border text-muted-foreground",
  hard: "border-red-500/40 text-red-600 dark:text-red-400",
}

/** Helper for Analysis, Example, and Action insights */
export function InsightBox({
  analysis,
  example,
  action,
  className,
}: {
  analysis?: string
  example?: string
  action?: string
  className?: string
}) {
  if (!analysis && !example && !action) return null
  return (
    <div className={cn("mt-4 space-y-3", className)}>
      {analysis && (
        <div className="flex gap-2.5">
          <div className="text-primary mt-1 shrink-0" title="تحلیل استدلالی">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3.5"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <p className="text-[11.5px] leading-6 text-foreground/90">
            <span className="font-bold text-primary ml-1">استدلال:</span>
            {analysis}
          </p>
        </div>
      )}
      {example && (
        <div className="flex gap-2.5">
          <div className="text-chart-4 mt-1 shrink-0" title="مثال روزمره">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3.5"
            >
              <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .5 2.2 1.5 3.1.7.7 1.3 1.5 1.5 2.4" />
              <path d="M9 18h6" />
              <path d="M10 22h4" />
            </svg>
          </div>
          <p className="text-[11.5px] leading-6 text-foreground/90 italic">
            <span className="font-bold text-chart-4 ml-1">مصداق:</span>
            {example}
          </p>
        </div>
      )}
      {action && (
        <div className="flex gap-2.5">
          <div className="text-chart-10 mt-1 shrink-0" title="پیشنهاد برای تصمیم‌گیری">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3.5"
            >
              <path d="m12 19 7-7-7-7" />
              <path d="M19 12H5" />
            </svg>
          </div>
          <p className="text-[11.5px] leading-6 text-foreground/90 font-medium">
            <span className="font-bold text-chart-10 ml-1">اقدام:</span>
            {action}
          </p>
        </div>
      )}
    </div>
  )
}


/** Hero medallion for one of the three key signs. */
export function MedallionCard({ m }: { m: Medallion }) {
  return (
    <article className="glass-strong ring-gold relative overflow-hidden rounded-3xl px-6 py-7 text-center">
      <span
        aria-hidden
        className="nebula -top-20 left-1/2 h-44 w-44 -translate-x-1/2"
        style={{ background: `color-mix(in oklch, var(--${m.accent}) 30%, transparent)` }}
      />
      <p className="text-primary/80 relative text-[11px] font-semibold tracking-[0.2em]">
        {m.label} · {m.hint}
      </p>
      <div
        className="relative mt-3 text-5xl leading-none"
        style={{ color: `var(--${m.accent})` }}
        aria-hidden
      >
        {m.symbol}︎
      </div>
      <h3 className="font-display relative mt-3 text-2xl font-bold">{m.signFa}</h3>
      <div className="relative mt-2 flex justify-center">
        <Badge variant="outline" className="text-[10px] font-normal">
          {m.keyword}
        </Badge>
      </div>
      <p className="text-muted-foreground relative mt-3 text-sm leading-7">{m.note}</p>
    </article>
  )
}

/** Element mix (fire/earth/air/water) as slim horizontal bars. */
export function ElementBars({ bars }: { bars: ElementBar[] }) {
  return (
    <div className="space-y-3">
      {bars.map((b) => (
        <div key={b.key} className="flex items-center gap-3">
          <span className="w-9 text-sm">{b.fa}</span>
          <div className="bg-muted h-2.5 flex-1 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full"
              style={{
                width: `${b.percent}%`,
                background: `var(--${ELEMENT_ACCENT[b.key]})`,
              }}
            />
          </div>
          <span className="persian-nums text-muted-foreground w-12 text-xs">
            {faNum(b.percent)}٪
          </span>
        </div>
      ))}
    </div>
  )
}

/** One house: sign, occupants, plain reading and its bindu bar. */
export function HouseCard({ item }: { item: HouseItem }) {
  return (
    <article
      className={cn(
        "glass flex flex-col gap-2.5 rounded-2xl p-4",
        !item.occupied && "opacity-85"
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">
          خانه‌ی {faNum(item.house)} — {item.fa}
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ color: `var(--${item.accent})` }} aria-hidden>
            {item.signSymbol}
          </span>
          <span className="text-xs">{item.signFa}</span>
        </span>
      </header>

      {item.occupied ? (
        <div className="flex flex-wrap gap-1.5">
          {item.planets.map((p) => (
            <span
              key={p.fa}
              title={p.fa}
              className="bg-muted rounded-md px-1.5 py-0.5 text-sm"
              style={{ color: `var(--${p.accent})` }}
            >
              {p.glyph}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground text-[11px]">
          خالی — حکمرانش {item.lordFa}
        </span>
      )}

      <p className="text-muted-foreground text-xs leading-6">{item.line}</p>

      <div className="mt-auto flex items-center gap-2">
        <span className="text-muted-foreground text-[10px]">بندو</span>
        <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
          <div
            className={cn("h-full rounded-full", fortuneDotStyles(item.tone))}
            style={{ width: `${Math.min(100, Math.round((item.bindu / 40) * 100))}%` }}
          />
        </div>
        <span className="persian-nums text-[10px] font-semibold">{faNum(item.bindu)}</span>
      </div>
    </article>
  )
}

/** One graha's plain-language voice card. */
export function GrahaVoiceCard({ v }: { v: GrahaVoice }) {
  return (
    <article className="glass rounded-2xl p-5">
      <header className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2.5">
          <span
            className="text-2xl leading-none"
            style={{ color: `var(--${v.accent})` }}
            aria-hidden
          >
            {v.glyph}
          </span>
          <span>
            <span className="block text-sm font-semibold">{v.fa}</span>
            <span className="text-muted-foreground block text-xs">
              خانه‌ی {faNum(v.house)} · {v.signFa}
            </span>
          </span>
        </span>
        <Badge variant="outline" className={cn("text-[10px]", VOICE_TONE[v.badgeTone])}>
          {v.badge}
        </Badge>
      </header>
      <p className="text-muted-foreground mt-3 text-xs leading-7">{v.body}</p>
      <InsightBox analysis={v.analysis} example={v.example} action={v.action} />
    </article>
  )
}

/** Yoga / dosha card with its computed strength. */
export function PatternCard({ p }: { p: PatternItem }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{p.fa}</span>
        <span className="text-muted-foreground text-[11px]" dir="ltr">
          {p.name}
        </span>
        <Badge variant="outline" className="text-[10px]">
          {p.strengthLabel}
          {typeof p.score === "number" ? ` · ${faNum(p.score)}` : ""}
        </Badge>
      </div>
      <p className="text-muted-foreground text-xs leading-6">{p.description}</p>
    </div>
  )
}

/** Vertical mahadasha timeline; the active period is highlighted. */
/** Super Ultra executive summary banner */
export function ExecutiveSummaryBanner({
  exec,
}: {
  exec: { coreStrength: string; mentalPeace: string; weeklyAction: string }
}) {
  return (
    <div className="glass-strong ring-gold relative overflow-hidden rounded-3xl p-6 sm:p-8">
      <div
        className="nebula -top-24 left-1/2 h-56 w-56 -translate-x-1/2"
        style={{ background: "color-mix(in oklch, var(--primary) 25%, transparent)" }}
        aria-hidden
      />
      <h2 className="font-display relative flex items-center gap-2 text-lg font-bold sm:text-xl">
        <span className="text-primary">✦</span>
        نقشه‌ی راه فوریِ امروزِ تو (نسخه سوپر اولترا)
      </h2>
      <p className="text-muted-foreground relative mt-1 text-xs leading-6">
        چکیده‌ی کاربردی و بی‌تکلف چارت شما برای تصمیم‌گیری در کار، آرامش درون و زندگی روزمره.
      </p>
      <div className="relative mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-background/60 p-4 backdrop-blur-sm">
          <p className="text-xs font-semibold text-primary">قوت کلیدی شغلی و مالی</p>
          <p className="mt-2 text-xs leading-6 text-foreground/90">{exec.coreStrength}</p>
        </div>
        <div className="rounded-2xl border bg-background/60 p-4 backdrop-blur-sm">
          <p className="text-xs font-semibold text-chart-4">کلید آرامش درون</p>
          <p className="mt-2 text-xs leading-6 text-foreground/90">{exec.mentalPeace}</p>
        </div>
        <div className="rounded-2xl border bg-background/60 p-4 backdrop-blur-sm">
          <p className="text-xs font-semibold text-chart-10">قطب‌نمای زندگی امروز</p>
          <p className="mt-2 text-xs leading-6 text-foreground/90">{exec.weeklyAction}</p>
        </div>
      </div>
    </div>
  )
}

export function MarketStoryTimeline({
  sequence,
}: {
  sequence: { step: string; label: string; detail: string }[]
}) {
  return (
    <div className="rounded-3xl border bg-card/80 p-6 backdrop-blur-sm sm:p-8">
      <h2 className="font-display text-lg font-bold sm:text-xl">داستان تکامل و سیر زندگی (Narrative Sequence)</h2>
      <p className="text-muted-foreground mt-1 text-xs leading-6">
        مسیر جریان انرژی از ریشه تا موقعیت کنونی چارت شما به زبان ساده.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-5">
        {sequence.map((s) => (
          <div key={s.step} className="rounded-2xl border bg-background/50 p-4 relative flex flex-col justify-between">
            <div>
              <span className="persian-nums text-xs font-bold text-primary">{s.step}</span>
              <p className="mt-1 text-xs font-semibold">{s.label}</p>
            </div>
            <p className="text-muted-foreground mt-3 text-[11px] leading-5">{s.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * The invalidation panel — replaces the old "Scenario Engine".
 *
 * Deliberately shows no probabilities. The previous version printed 80% / 15%
 * for two invented futures; those numbers were fabricated and are gone. The
 * five-stage narrative already lives in `MarketStoryTimeline` above it; this
 * panel only states what would force the whole reading to be recomputed.
 */
export function InvalidationPanel({ invalidation }: { invalidation: string }) {
  return (
    <div className="rounded-3xl border border-dashed bg-card/80 p-6 backdrop-blur-sm sm:p-8">
      <h2 className="font-display text-lg font-bold sm:text-xl">شرط بازنگری (Invalidation)</h2>
      <p className="text-muted-foreground mt-1 text-xs leading-6">
        چه چیزی می‌تواند این خوانش را تغییر دهد؟
      </p>
      <div className="mt-6 rounded-2xl border bg-background/70 p-5">
        <p className="text-xs leading-7 text-foreground/90">{invalidation}</p>
      </div>
    </div>
  )
}

export function WatchpointsPanel({ watchpoints }: { watchpoints: string[] }) {
  return (
    <div className="rounded-3xl border bg-card/80 p-6 backdrop-blur-sm sm:p-8">
      <h2 className="font-display text-lg font-bold sm:text-xl">نقاط دیده‌بانی و اقدام (Actionable Watchpoints)</h2>
      <p className="text-muted-foreground mt-1 text-xs leading-6">
        برای هدایت بهتر تصمیمات روزمره، این موارد را همواره زیر نظر داشته باشید:
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {watchpoints.map((w, i) => (
          <div key={i} className="flex items-start gap-3 rounded-2xl border bg-background/50 p-4">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary persian-nums">
              {faNum(i + 1)}
            </span>
            <p className="text-xs leading-6 text-foreground/90">{w}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function IntelligenceHeader({
  intelligence,
}: {
  intelligence: {
    status: string
    bias: string
    trend: string
  }
}) {
  return (
    <div className="glass-strong ring-gold relative overflow-hidden rounded-3xl p-6 sm:p-8">
      <div
        className="nebula -top-24 right-1/4 h-56 w-56 -translate-x-1/2"
        style={{ background: "color-mix(in oklch, var(--primary) 22%, transparent)" }}
        aria-hidden
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              موتور تفسیر تحلیل · Intelligence Center
            </span>
          </div>
          <h1 className="font-display mt-2 text-xl font-bold sm:text-2xl">
            وضعیت کلی: {intelligence.status}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-xs leading-6 sm:text-sm">
            {intelligence.bias}
          </p>
        </div>
        <div className="rounded-2xl border bg-background/75 p-4 backdrop-blur-md sm:max-w-xs">
          <p className="text-[11px] font-semibold text-primary">روند و جریان فعلی</p>
          <p className="mt-1 text-xs leading-6 text-foreground/90">{intelligence.trend}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * The evidence panel — replaces the old "Confidence Engine".
 *
 * Every number shown here is the sum of the weights on the evidence chips
 * printed directly beneath it, against a declared maximum. Nothing is an
 * overall confidence percentage, because there is no such quantity to show.
 */
export function SynthesisPanel({ sections }: { sections: SynthesisSection[] }) {
  return (
    <div className="rounded-3xl border bg-card/80 p-6 backdrop-blur-sm sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold sm:text-xl">
            موتور تحلیل مبتنی بر شواهد
          </h2>
          <p className="text-muted-foreground text-xs leading-6">
            هر امتیاز از جمع وزنِ شواهد زیرِ همان بخش به دست آمده است؛ با حذف یک شاهد، عدد هم پایین می‌آید.
          </p>
        </div>
        <Badge variant="outline" className="persian-nums text-[10px]">
          {faNum(sections.length)} بخش
        </Badge>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <div key={s.key} className="rounded-2xl border bg-background/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">{s.title}</span>
              <span className="persian-nums text-xs font-bold text-primary">
                {faNum(s.score)}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${s.score}%` }}
              />
            </div>
            <p className="text-muted-foreground mt-2 text-[11px] leading-5">{s.subtitle}</p>
            <ul className="mt-3 space-y-1.5">
              {s.evidence.map((e) => (
                <li key={`${s.key}-${e.label}`} className="flex items-start gap-2 text-[11px] leading-5">
                  <Badge variant="secondary" className="shrink-0 text-[9px]">
                    {faNum(Math.round(e.weight * 100))}
                  </Badge>
                  <span>
                    <span className="font-semibold">{e.label}</span>
                    <span className="text-muted-foreground"> — {e.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-3 border-t pt-3 text-[11px] leading-6">
              {s.summary}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ConflictDetectorPanel({
  conflicts,
}: {
  conflicts: { title: string; desc: string; resolution: string }[]
}) {
  return (
    <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6 backdrop-blur-sm sm:p-8">
      <div className="flex items-center gap-2">
        <span className="text-amber-500 text-lg">⚠</span>
        <h2 className="font-display text-lg font-bold sm:text-xl">تحلیل‌های متناقض و ظرایف چارت</h2>
      </div>
      <p className="text-muted-foreground mt-1 text-xs leading-6">
        سیستم هوشمند تضادهای میان جهان درون (ماه)، اراده (خورشید) و چالش‌های چارت را شناسایی کرده است.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {conflicts.map((c, i) => (
          <div key={i} className="rounded-2xl border bg-background/70 p-4">
            <p className="text-xs font-semibold text-[hsl(var(--sun))] dark:text-amber-400">{c.title}</p>
            <p className="mt-2 text-xs leading-6 text-foreground/90">{c.desc}</p>
            <div className="mt-3 rounded-lg bg-muted/50 p-2.5 text-[11px] text-muted-foreground leading-5">
              <span className="font-semibold text-foreground ml-1">راه‌حل / سنتز:</span>
              {c.resolution}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}



export function DashaTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((t, i) => (
        <div
          key={i}
          className={cn(
            "flex flex-col gap-2 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between",
            t.active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "bg-card/50"
          )}
        >
          <div className="flex items-center gap-3">
            <span
              className="text-2xl leading-none"
              style={{ color: `var(--${t.accent})` }}
              aria-hidden
            >
              {t.glyph}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{t.fa}</span>
                {t.active && (
                  <Badge variant="default" className="text-[10px]">
                    دوران فعلی
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1 text-xs leading-6">دوران مهاداشای {t.fa}</p>
            </div>
          </div>
          <div className="persian-nums text-muted-foreground text-xs font-semibold sm:text-end">
            {t.fromLabel} تا {t.toLabel}
          </div>
        </div>
      ))}
    </div>
  )
}
