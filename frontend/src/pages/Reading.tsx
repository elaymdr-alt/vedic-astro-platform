import { useState } from "react"
import { Link } from "react-router-dom"
import { ScrollText, Sparkles } from "lucide-react"
import CelestialWheel from "@/components/CelestialWheel"
import BirthForm, { type BirthState } from "@/components/BirthForm"
import { ChapterPills } from "@/components/reading/chapter-pills"
import {
  ContradictionCard,
  ExecutiveBanner,
  GrowthBlock,
  LifeAreaCard,
  QualityFooter,
  StrengthBlock,
  ThemeCard,
} from "@/components/reading/premium-blocks"
import {
  ConflictDetectorPanel,
  DashaTimeline,
  ElementBars,
  ExecutiveSummaryBanner,
  GrahaVoiceCard,
  HouseCard,
  InsightBox,
  IntelligenceHeader,
  InvalidationPanel,
  MarketStoryTimeline,
  MedallionCard,
  PatternCard,
  SynthesisPanel,
  WatchpointsPanel,
} from "@/components/reading/reading-blocks"
import { Reveal } from "@/components/reveal"
import { ChapterDivider, SectionHeading } from "@/components/section-heading"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { computeChart } from "@/api"
import { faNum, formatJalali, toPersianDigits } from "@/lib/astrology/format"
import { buildIntelligence } from "@/lib/astrology/intelligence"
import { buildAnalysis } from "@/lib/astrology/analysis-schema"
import { buildPremiumReport } from "@/lib/astrology/premium-interpretation"
import { natalChartFromBackend } from "@/lib/astrology/fromBackend"
import type { BirthProfile, NatalChart } from "@/lib/astrology/types"
import {
  buildReading,
  READING_CHAPTERS,
  type ReadingChapterMeta,
} from "@/lib/astrology/reading"

function ChapterHeader({ meta, concept }: { meta: ReadingChapterMeta; concept: string }) {
  return (
    <header className="space-y-5 text-center">
      <ChapterDivider label={`فصل ${meta.num}`} />
      <SectionHeading eyebrow={meta.eyebrow} title={meta.title} description={concept} />
    </header>
  )
}

/** Big gold pull-quote between chapters — the editorial beat of the page. */
function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <figure className="mx-auto max-w-2xl text-center">
      <span className="text-primary/50 block text-3xl" aria-hidden>
        ✦
      </span>
      <blockquote className="text-gradient-gold font-display mt-2 text-xl leading-9 font-bold sm:text-2xl">
        {children}
      </blockquote>
    </figure>
  )
}

function ChapterProse({ items }: { items: string[] }) {
  return (
    <div className="space-y-4">
      {items.map((t) => (
        <p
          key={t.slice(0, 24)}
          className="text-muted-foreground leading-8 first:text-foreground sm:first:text-lg"
        >
          {t}
        </p>
      ))}
    </div>
  )
}

function ReadingView({
  chart,
  profile,
  onReset,
}: {
  chart: NatalChart
  profile: BirthProfile
  onReset: () => void
}) {
  const doc = buildReading(chart)
  const intelligence = buildIntelligence(chart)
  const premium = buildPremiumReport(buildAnalysis(chart))

  const [chIdentity, chMind, chCore, chHouses, chGrahas, chPatterns, chTime, chGuide, chGlossary] =
    READING_CHAPTERS

  return (
    <>
      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative container mx-auto max-w-4xl px-4 pt-14 pb-6 text-center">
          <CelestialWheel className="absolute top-2 left-1/2 -z-10 w-[34rem] max-w-none -translate-x-1/2 opacity-40" />
          <p className="text-primary text-sm font-semibold">تفسیر کامل چارت</p>
          <h1 className="font-display mt-5 text-4xl leading-[1.35] font-extrabold sm:text-5xl">
            {profile.name ?? "دوست عزیز"}،{" "}
            <span className="text-gradient-gold">این است روایت آسمان تو</span>
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-sm leading-7">
            {toPersianDigits(formatJalali(profile.date))} — {profile.city}
            {profile.timeKnown && profile.time
              ? `، ساعت ${toPersianDigits(profile.time)}`
              : "، ساعت نامشخص"}
          </p>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-9 text-foreground/90">
            {doc.hero.lede}
          </p>
          {!profile.timeKnown && (
            <ul className="text-muted-foreground mx-auto mt-5 max-w-2xl space-y-1 text-xs leading-6">
              <li>ساعت تولد نامشخص است؛ ماه به‌جای لگنا فرض شده (چاندرا لگنا).</li>
            </ul>
          )}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onReset}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              <Sparkles className="size-4" />
              تغییر اطلاعات تولد
            </button>
            <Button size="lg" variant="outline" className="no-print" onClick={() => window.print()}>
              دریافت PDF (چاپ)
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/" className="gap-2">
                <ScrollText className="size-4" />
                دیدن چارت بصری
              </Link>
            </Button>
          </div>
        </section>

        {/* ── Three medallions ─────────────────────────────────────────── */}
        <section className="container mx-auto max-w-5xl px-4 pb-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {doc.hero.medallions.map((m) => (
              <MedallionCard key={m.key} m={m} />
            ))}
          </div>
        </section>

        {/* ── Super Ultra Executive Summary ────────────────────────────── */}
        <section className="container mx-auto max-w-5xl px-4 pb-10">
          <ExecutiveSummaryBanner exec={doc.executive} />
        </section>

        {/* ── Intelligence Hub (evidence-grounded) ─────────────────────── */}
        <section className="container mx-auto max-w-5xl px-4 pb-10 space-y-6">
          <IntelligenceHeader intelligence={doc.intelligence} />
          <SynthesisPanel sections={intelligence.synthesis} />
          <ConflictDetectorPanel conflicts={doc.intelligence.conflicts} />
        </section>

        {/* ── PREMIUM REPORT — synthesis-based interpretation ──────────── */}
        <section className="container mx-auto max-w-5xl px-4 pb-10 space-y-6">
          <ExecutiveBanner
            pattern={premium.executive.pattern}
            signature={premium.executive.signature}
            topThemes={premium.executive.topThemes}
            topStrength={premium.executive.topStrength}
            topGrowth={premium.executive.topGrowth}
          />
        </section>

        <section className="container mx-auto max-w-5xl px-4 pb-10 space-y-6">
          <SectionHeading
            eyebrow="تم‌های اصلی"
            title="موضوعات کلیدی زندگی تو"
            description="چند الگوی اصلی که از کل چارت استخراج شده‌اند — هرکدام با شاهد نجومی و ترجمه‌ی روزمره."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {premium.themes.map((t, i) => (
              <ThemeCard key={t.id} theme={t} index={i} />
            ))}
          </div>
        </section>

        {premium.contradictions.length > 0 && (
          <section className="container mx-auto max-w-5xl px-4 pb-10 space-y-6">
            <SectionHeading
              eyebrow="تضادهای صادقانه"
              title="جایی که چارت دو حرف دارد"
              description="اگر چارت دو پیام متفاوت بدهد، آن را پنهان نمی‌کنیم — هر دو را نشان می‌دهیم و سنتزشان می‌کنیم."
            />
            <div className="grid gap-4">
              {premium.contradictions.map((c) => (
                <ContradictionCard key={c.title} c={c} />
              ))}
            </div>
          </section>
        )}

        <section className="container mx-auto max-w-5xl px-4 pb-10 space-y-6">
          <SectionHeading
            eyebrow="نقاط قوت"
            title="توانایی‌هایی که واقعاً داری"
            description="نه صفت خشک — هر قوت با تفسیر، بروز عملی و نقطه‌ی مراقبت."
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {premium.strengths.map((s) => (
              <StrengthBlock key={s.title} s={s} />
            ))}
          </div>
        </section>

        <section className="container mx-auto max-w-5xl px-4 pb-10 space-y-6">
          <SectionHeading
            eyebrow="زمینه‌های رشد"
            title="جایی که آگاهی، قدرت می‌سازد"
            description="بدون زبان قطعی و تشخیص — فقط الگو، بروز، ریسک، فرصت و سؤال تأمل."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {premium.growth.map((g) => (
              <GrowthBlock key={g.pattern} g={g} />
            ))}
          </div>
        </section>

        <section className="container mx-auto max-w-5xl px-4 pb-10 space-y-6">
          <SectionHeading
            eyebrow="حوزه‌های زندگی"
            title="یک چارت، هشت آینه"
            description="هر حوزه تفسیر اختصاصی خودش را دارد — مرتب‌شده بر اساس اهمیت در همین چارت."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {premium.areas.map((area) => (
              <LifeAreaCard key={area.key} area={area} />
            ))}
          </div>
          <QualityFooter
            sections={premium.quality.sections}
            evidenceCount={premium.quality.evidenceCount}
            coverage={premium.quality.coverage}
          />
        </section>

        {/* ── Sticky chapter nav ───────────────────────────────────────── */}
        <nav aria-label="فصل‌های تفسیر" className="sticky top-16 z-40 px-4 py-3">
          <ChapterPills
            chapters={READING_CHAPTERS.map(({ id, short }) => ({ id, short }))}
          />
        </nav>

        <div className="container mx-auto max-w-4xl space-y-6 sm:space-y-8 lg:space-y-20 px-4 py-8">

          {/* ── 1 · identity (lagna) ────────────────────────────────────── */}
          <section id="identity" className="scroll-mt-32 space-y-8">
             <ChapterHeader meta={chIdentity} concept={doc.identity.concept} />
             <Reveal className="space-y-6">
               <div className="glass rounded-3xl p-6 sm:p-8">
                 <ChapterProse items={doc.identity.paragraphs} />
               </div>
               <div className="flex flex-wrap justify-center gap-2">
                 {doc.identity.traits.map((t) => (
                   <span
                     key={t}
                     className="bg-primary/10 text-primary rounded-full px-3.5 py-1.5 text-sm"
                   >
                     {t}
                   </span>
                 ))}
               </div>
               <div className="gap-4 lg:grid-cols-2">
                 <Card className="gap-0">
                   <CardHeader className="space-y-1">
                     <CardTitle className="text-base">مخلوط عنصرها</CardTitle>
                     <p className="text-muted-foreground text-xs">
                       از نُه سیاره‌ی چارت — هرچه نوار بلندتر، آن عنصر در تصمیم‌هایت پررنگ‌تر است.
                     </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ElementBars bars={doc.identity.elements} />
                      <InsightBox
                        analysis={doc.identity.analysis}
                        example={doc.identity.example}
                        action={doc.identity.action}
                        className="border-t pt-4"
                      />
                    </CardContent>
                 </Card>
                 {doc.identity.karaka && (
                   <div className="glass-strong ring-gold flex flex-col items-center justify-center gap-3 rounded-3xl p-6 text-center">
                     <p className="text-primary text-xs font-semibold tracking-[0.2em]">
                       کاراکای روح
                     </p>
                     <p className="text-sm leading-8">{doc.identity.karaka}</p>
                   </div>
                 )}
               </div>
             </Reveal>
            <PullQuote>{doc.identity.quote}</PullQuote>
          </section>

          {/* ── 2 · mind (moon) ─────────────────────────────────────────── */}
          <section id="mind" className="scroll-mt-32 space-y-8">
            <ChapterHeader meta={chMind} concept={doc.mind.concept} />
            <Reveal className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              <div className="glass rounded-3xl p-6 sm:p-8">
                <ChapterProse items={doc.mind.paragraphs} />
              </div>
              <div className="glass-strong ring-gold flex flex-col items-center justify-center gap-2 rounded-3xl p-6 text-center">
                <p className="text-primary text-xs font-semibold tracking-[0.2em]">نکشتر ماه</p>
                <p className="font-display text-3xl font-bold">{doc.mind.nakName}</p>
                <p className="text-muted-foreground text-sm leading-7">
                  {doc.mind.nakSymbol && <>{doc.mind.nakSymbol} · </>}
                  کلید: {doc.mind.nakKeyword}
                  <br />
                  حکمران: {doc.mind.nakLord} · پده‌ی {faNum(doc.mind.nakPada)}
                </p>
                <InsightBox
                  analysis={doc.mind.analysis}
                  example={doc.mind.example}
                  action={doc.mind.action}
                  className="mt-4 border-t pt-4 w-full text-start"
                />
              </div>
            </Reveal>
            <PullQuote>{doc.mind.quote}</PullQuote>
          </section>

          {/* ── 3 · core (sun) ──────────────────────────────────────────── */}
          <section id="core" className="scroll-mt-32 space-y-8">
            <ChapterHeader meta={chCore} concept={doc.core.concept} />
            <Reveal>
              <div className="glass rounded-3xl p-6 sm:p-8 space-y-6">
                <ChapterProse items={doc.core.paragraphs} />
                <InsightBox
                  analysis={doc.core.analysis}
                  example={doc.core.example}
                  action={doc.core.action}
                  className="border-t pt-6"
                />
              </div>
            </Reveal>
            <PullQuote>{doc.core.quote}</PullQuote>
          </section>

          {/* ── 4 · houses ──────────────────────────────────────────────── */}
          <section id="houses" className="scroll-mt-32 space-y-8">
            <ChapterHeader meta={chHouses} concept={doc.houses.concept} />
            <Reveal className="space-y-5">
              <p className="text-muted-foreground text-center text-sm leading-7">
                {doc.houses.summary}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {doc.houses.items.map((h) => (
                  <HouseCard key={h.house} item={h} />
                ))}
              </div>
              <p className="text-muted-foreground text-center text-xs leading-6">
                {doc.houses.avNote}
              </p>
            </Reveal>
          </section>

          {/* ── 5 · graha voices ────────────────────────────────────────── */}
          <section id="grahas" className="scroll-mt-32 space-y-8">
            <ChapterHeader meta={chGrahas} concept={doc.grahas.concept} />
            <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {doc.grahas.voices.map((v) => (
                <GrahaVoiceCard key={v.key} v={v} />
              ))}
            </Reveal>
          </section>

          {/* ── 6 · patterns ────────────────────────────────────────────── */}
          <section id="patterns" className="scroll-mt-32 space-y-8">
            <ChapterHeader meta={chPatterns} concept={doc.patterns.concept} />
            <Reveal className="grid gap-4 lg:grid-cols-2">
              <Card className="gap-0">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-base">یوگاها — پل‌های قوت</CardTitle>
                  <p className="text-muted-foreground text-xs">
                    ترکیب‌های مثبتی که واقعاً در چارتت پیدا شده‌اند.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {doc.patterns.yogas.length > 0 ? (
                    doc.patterns.yogas.map((p) => <PatternCard key={p.name} p={p} />)
                  ) : (
                    <p className="text-muted-foreground text-sm leading-7">
                      در چارت تو یوگای پررنگی ثبت نشد — قوت‌هایت را در خانه‌ها و سیارات جست‌وجو کن.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card className="gap-0">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-base">دوشاها — نقطه‌های چالش</CardTitle>
                  <p className="text-muted-foreground text-xs">
                    ترکیب‌هایی که درس و تمرین بیشتری از تو می‌خواهند.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {doc.patterns.doshas.length > 0 ? (
                    doc.patterns.doshas.map((p) => <PatternCard key={p.name} p={p} />)
                  ) : (
                    <p className="text-muted-foreground text-sm leading-7">
                      هیچ دوشای پررنگی نداری — نقطه‌ی چالش خاصی سر راهت ساخته نشده است.
                    </p>
                  )}
                </CardContent>
              </Card>
            </Reveal>
            <p className="text-muted-foreground text-center text-xs leading-6">
              {doc.patterns.note}
            </p>
          </section>

          {/* ── 7 · time (dasha) ────────────────────────────────────────── */}
          <section id="time" className="scroll-mt-32 space-y-8">
            <ChapterHeader meta={chTime} concept={doc.time.concept} />
            <Reveal className="space-y-5">
              <div className="glass-strong ring-gold rounded-3xl p-6 text-center sm:p-8">
                <p className="text-primary text-xs font-semibold tracking-[0.2em]">
                  دوره‌ی فعلی زندگی
                </p>
                <p className="font-display persian-nums mt-2 text-2xl font-bold sm:text-3xl">
                  {doc.time.period}
                </p>
                <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-sm leading-7">
                  {doc.time.description}
                </p>
              </div>
              <p className="text-muted-foreground text-center text-sm leading-7">
                {doc.time.explain}
              </p>
              <MarketStoryTimeline sequence={doc.intelligence.storySequence} />
              <DashaTimeline items={doc.time.timeline} />
            </Reveal>
          </section>

          {/* ── 8 · practical guide ─────────────────────────────────────── */}
          <section id="guide" className="scroll-mt-32 space-y-8">
            <ChapterHeader meta={chGuide} concept={doc.guide.concept} />
            <Reveal className="space-y-6">
              <ol className="space-y-3">
                {doc.guide.tips.map((tip, i) => (
                  <li key={tip.slice(0, 20)} className="glass flex gap-4 rounded-2xl p-5">
                    <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                      {faNum(i + 1)}
                    </span>
                    <p className="text-sm leading-8">{tip}</p>
                  </li>
                ))}
              </ol>
              <Card className="gap-0">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-base">نمادهای خوش‌یمن تو</CardTitle>
                  <p className="text-muted-foreground text-xs">
                    از حکمران لگنایت ساخته شده‌اند؛ در روزهای مهم کنارت بگذارشان.
                  </p>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {doc.guide.facts.map((f) => (
                    <div key={f.label} className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{f.label}</span>
                      <span className="text-end font-semibold">{f.value}</span>
                    </div>
                  ))}
                  <div className="persian-nums text-primary bg-muted/40 rounded-lg p-3 text-center text-sm">
                    {doc.guide.mantra}
                  </div>
                </CardContent>
              </Card>
              <InvalidationPanel invalidation={doc.intelligence.invalidation} />
              <WatchpointsPanel watchpoints={doc.intelligence.watchpoints} />
              <p className="text-gradient-gold font-display text-center text-xl leading-9 font-bold">
                {doc.guide.blessing}
              </p>
            </Reveal>
          </section>

          {/* ── 9 · glossary ────────────────────────────────────────────── */}
          <section id="glossary" className="scroll-mt-32 space-y-8">
            <ChapterHeader
              meta={chGlossary}
              concept="هر واژه‌ی فنی‌ای که در این صفحه دیدی اینجا یک‌خطی و بی‌تکلف معنا شده؛ اگر جایی گیج شدی، سر بزن."
            />
            <Reveal>
              <Card className="gap-0">
                <CardContent className="pt-5">
                  <Accordion type="single" collapsible>
                    {doc.glossary.map((g) => (
                      <AccordionItem key={g.term} value={g.term}>
                        <AccordionTrigger className="text-sm">{g.term}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-7">{g.body}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </Reveal>
          </section>

          {/* ── Closing CTA ─────────────────────────────────────────────── */}
          <section className="glass-strong ring-gold space-y-4 rounded-3xl p-7 text-center sm:p-10">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              حالا نقشه‌ی پشت این روایت را ببین
            </h2>
            <p className="text-muted-foreground mx-auto max-w-xl text-sm leading-7">
              چارت شمال و جنوب هندی، چرخه‌ی دایره‌ای، جدول نُه سیاره و چارت‌های تقسیمی همه در
              صفحه‌ی چارت‌اند — با همین اطلاعات تولد.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link to="/" className="gap-2">
                  <Sparkles className="size-4" />
                  دیدن چارت کامل
                </Link>
              </Button>
              <Button size="lg" variant="outline" onClick={onReset}>
                تغییر اطلاعات تولد
              </Button>
            </div>
            <p className="text-muted-foreground mx-auto max-w-xl text-[11px] leading-6">
              تفسیرهای این صفحه عمومی و بر پایه‌ی قواعد کلاسیک ودایی‌اند؛ جنبه‌ی آموزشی و سرگرمی
              دارند و جایگزین مشاوره‌ی پزشکی، حقوقی یا مالی نیستند.
            </p>
          </section>
        </div>
      </main>
    </>
  )
}


/* -------------------------------------------------------------- page shell */
const pad = (n: number) => String(n).padStart(2, "0")

export default function Reading() {
  const [result, setResult] = useState<{ chart: NatalChart; profile: BirthProfile } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const submit = async (b: BirthState) => {
    setLoading(true)
    setError("")
    try {
      const r = await computeChart({
        calendar: "jalali",
        year: b.year,
        month: b.month,
        day: b.day,
        hour: b.hour,
        minute: b.minute,
        tz_offset: b.tz_offset,
        tz: b.tz,
        lat: b.lat,
        lon: b.lon,
      })
      const g = r.input_gregorian as { year: number; month: number; day: number }
      const timeKnown = r.chart.time_precision !== "unknown"
      const profile: BirthProfile = {
        date: `${g.year}-${pad(g.month)}-${pad(g.day)}`,
        time: timeKnown ? `${pad(b.hour)}:${pad(b.minute)}` : undefined,
        timeKnown,
        city: b.cityLabel,
        latitude: b.lat,
        longitude: b.lon,
      }
      setResult({ chart: natalChartFromBackend(r.chart, profile), profile })
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطای ناشناخته")
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <ReadingView
        chart={result.chart}
        profile={result.profile}
        onReset={() => setResult(null)}
      />
    )
  }
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="vedic-text-gradient mb-6 text-center text-3xl font-extrabold">
        تفسیر کامل چارت
      </h1>
      <BirthForm onSubmit={submit} loading={loading} />
      {error && (
        <div role="alert" className="border-destructive/30 bg-destructive/10 text-destructive mt-4 rounded-2xl border px-4 py-3 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
