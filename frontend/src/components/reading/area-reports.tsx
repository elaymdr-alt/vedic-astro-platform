import { CalendarClock, Footprints } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SectionHeading } from "@/components/section-heading"
import { cn } from "@/lib/utils"

export interface LifeArea {
  key: string
  title: string
  agent: string
  level: "high" | "mid" | "support"
  level_fa: string
  headline: string
  daily: string
  actions: string[]
  timing: string | null
  evidence: string[]
}

export interface LifeAreasReport {
  has_birth_time: boolean
  note: string | null
  overview: { strongest: string; needs_care: string; period: string; week_focus: string }
  areas: LifeArea[]
  disclaimer: string
}

const LEVEL_STYLE: Record<LifeArea["level"], string> = {
  high: "border-primary/40 text-primary",
  mid: "border-[hsl(var(--cx-cyan))]/40 text-[hsl(var(--cx-cyan))]",
  support: "border-[hsl(var(--cx-magenta))]/40 text-[hsl(var(--cx-magenta))]",
}

function AreaCard({ a }: { a: LifeArea }) {
  return (
    <article className="glass flex flex-col gap-3 rounded-3xl p-5 sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold">{a.title}</h3>
          <p className="text-muted-foreground text-xs">{a.agent}</p>
        </div>
        <Badge variant="outline" className={cn("shrink-0", LEVEL_STYLE[a.level])}>
          {a.level_fa}
        </Badge>
      </header>
      <p className="text-sm leading-7 font-semibold">{a.headline}</p>
      <p className="text-muted-foreground text-sm leading-7">{a.daily}</p>
      {a.timing && (
        <p className="bg-primary/10 text-foreground/90 flex gap-2 rounded-2xl px-3.5 py-2.5 text-xs leading-6">
          <CalendarClock className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
          {a.timing}
        </p>
      )}
      <div>
        <p className="text-primary mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
          <Footprints className="size-3.5" aria-hidden />
          این هفته امتحان کن
        </p>
        <ul className="space-y-1.5 text-sm leading-7">
          {a.actions.map((t) => (
            <li key={t} className="flex gap-2">
              <span className="text-primary" aria-hidden>
                ✦
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>
      <details className="text-muted-foreground mt-auto text-xs">
        <summary className="hover:text-foreground cursor-pointer">این برداشت از کجا آمده؟</summary>
        <ul className="mt-2 space-y-1 leading-6">
          {a.evidence.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      </details>
    </article>
  )
}

export function AreaReports({ report }: { report: LifeAreasReport }) {
  const o = report.overview
  return (
    <section className="container mx-auto max-w-5xl space-y-6 px-4 pb-10">
      <SectionHeading
        eyebrow="گزارش‌های کاربردی"
        title="چارتت در زندگی روزمره"
        description="شش مشاور، هرکدام از یک زاویه به همین چارت نگاه می‌کنند — به زبان ساده و با قدم‌های کوچک."
      />
      <div className="glass-strong ring-gold rounded-3xl p-5 text-center sm:p-6">
        <p className="text-sm leading-8">{o.week_focus}</p>
        <p className="text-muted-foreground mt-2 text-xs leading-6">
          نقطهٔ قوت: {o.strongest} · نیازمند توجه بیشتر: {o.needs_care}
        </p>
        <p className="text-muted-foreground mt-1 text-xs leading-6">{o.period}</p>
        {report.note && <p className="text-primary mt-2 text-xs">{report.note}</p>}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {report.areas.map((a) => (
          <AreaCard key={a.key} a={a} />
        ))}
      </div>
      <p className="text-muted-foreground text-center text-[11px] leading-6">{report.disclaimer}</p>
    </section>
  )
}
