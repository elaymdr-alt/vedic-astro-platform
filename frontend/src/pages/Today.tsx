import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarDays, Clock, Download, Loader2, Printer, Sparkles, Sun } from 'lucide-react'
import BirthForm, { type BirthState, loadSavedBirth } from '@/components/BirthForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { daily, type DailyResult } from '@/api'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'

const fa = (s: string | number) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
const LEVEL_BG = { green: 'bg-fortune-green', amber: 'bg-fortune-amber', red: 'bg-fortune-red' } as const
/** Soft wording: a low day is a day for recovery, never a warning. */
const LEVEL_LABEL = { green: 'فرصت‌دار', amber: 'متعادل', red: 'مناسب بازیابی' } as const
const NAK_FA: Record<string, string> = { 'Ashwini': 'اشویني','Bharani': 'بهراني','Krittika': 'کریتیکا','Rohini': 'روهینی','Mrigashira': 'مریگاشیرا','Ardra': 'آردرا','Punarvasu': 'پونرواسو','Pushya': 'پوشیا','Ashlesha': 'اشلیشا','Magha': 'ماگها','Purva Phalguni': 'پوروا پهالگونی','Uttara Phalguni': 'اوتارا پهالگونی','Hasta': 'هستا','Chitra': 'چیترا','Swati': 'سواتی','Vishakha': 'ویشاکها','Anuradha': 'آنورادها','Jyeshtha': 'جیشتها','Mula': 'مولا','Purva Ashadha': 'پوروا آشادها','Uttara Ashadha': 'اوتارا آشادها','Shravana': 'شراوانا','Dhanishta': 'دهانیشتا','Shatabhisha': 'شاتابهیشا','Purva Bhadrapada': 'پوروا بهادراپادا','Uttara Bhadrapada': 'اوتارا بهادراپادا','Revati': 'ریوتی' }
const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'short', day: 'numeric' }).format(new Date(iso))
const PLAN_LEVEL: Record<string, string> = { maha: 'دوره اصلی', antar: 'زیردوره', pratyantar: 'ریزدوره' }
const AREA_KEY_FA: Record<string, string> = {
  work: 'کار', money: 'پول', love: 'رابطه', health: 'سلامت', family: 'خانواده', mind: 'ذهن و یادگیری',
}

function Ring({ score, level }: { score: number; level: 'green' | 'amber' | 'red' }) {
  const r = 52, c = 2 * Math.PI * r
  const color = level === 'green' ? 'hsl(var(--primary))' : level === 'amber' ? 'hsl(var(--sun))' : 'hsl(258 45% 68%)'
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32" role="img" aria-label={`امتیاز امروز ${score} از ۱۰۰`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} transform="rotate(-90 60 60)" />
      <text x="60" y="68" textAnchor="middle" fontSize="30" fontWeight="800" fill="currentColor">{fa(score)}</text>
    </svg>
  )
}

export default function Today() {
  const [birth, setBirth] = useState<BirthState | null>(() => loadSavedBirth())
  const [data, setData] = useState<DailyResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    if (!birth) return
    let alive = true
    setLoading(true)
    setError('')
    // calendar is the form's Jalali date; the API takes Gregorian-or-Jalali via BirthInput
    daily({
      birth: {
        calendar: 'jalali', year: birth.year, month: birth.month, day: birth.day,
        hour: birth.hour, minute: birth.minute, tz: birth.tz, tz_offset: birth.tz_offset, time_precision: birth.timeKnown === false ? 'unknown' : 'exact',
        lat: birth.lat, lon: birth.lon,
      },
      days: 14,
    })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'خطای ناشناخته'))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [birth])

  const downloadIcs = async () => {
    if (!birth) return
    const r = await fetch('/api/daily/calendar.ics', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birth: { calendar: 'jalali', year: birth.year, month: birth.month, day: birth.day,
        hour: birth.hour, minute: birth.minute, tz: birth.tz, tz_offset: birth.tz_offset, time_precision: birth.timeKnown === false ? 'unknown' : 'exact', lat: birth.lat, lon: birth.lon }, days: 30 }),
    })
    if (!r.ok) { setError('ساخت فایل تقویم انجام نشد'); return }
    const url = URL.createObjectURL(await r.blob())
    const a = document.createElement('a')
    a.href = url; a.download = 'astrobinesh.ics'; a.click()
    URL.revokeObjectURL(url)
  }

  if (!birth || asking) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="vedic-text-gradient mb-6 text-center text-3xl font-extrabold">برنامه امروز من</h1>
        <BirthForm title="اطلاعات تولد شما" submitLabel="نمایش برنامه امروز" loading={loading}
          onSubmit={(b) => { setBirth(b); setAsking(false) }} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      {loading && <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="در حال بارگذاری" /></div>}
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {data && (
        <>
          <header className="vedic-card grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <Ring score={data.personal.score} level={data.personal.level} />
            <div>
              <span className="eyebrow mb-2"><Sun className="h-3.5 w-3.5" aria-hidden="true" /> {data.panchang.weekday} • {fa(data.date)}</span>
              <h1 className="text-2xl font-extrabold">امروز برای شما: <span className="text-primary">{LEVEL_LABEL[data.personal.level]}</span></h1>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{data.dasha.summary_fa}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Badge variant={data.personal.chandra_bala.good ? 'secondary' : 'outline'}>
                  قمر در خانه {fa(data.personal.chandra_bala.house_from_moon)} از ماه تولد
                </Badge>
                <Badge variant={data.personal.tara_bala.good ? 'secondary' : 'outline'}>
                  تارا: {data.personal.tara_bala.name_fa}
                </Badge>
                <Button size="sm" variant="ghost" onClick={() => setAsking(true)}>تغییر اطلاعات</Button>
                <Button size="sm" variant="outline" onClick={downloadIcs}><Download className="ml-1 h-3.5 w-3.5" aria-hidden="true" /> افزودن به تقویم (ICS)</Button>
                <Button size="sm" variant="outline" className="no-print" onClick={() => window.print()}><Printer className="ml-1 h-3.5 w-3.5" aria-hidden="true" /> چاپ / PDF</Button>
              </div>
              {data.limited && (
                <p className="mt-3 flex items-center gap-2 text-xs text-[hsl(var(--sun))]">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  ساعت تولد نامشخص است؛ خانه‌ها بر پایه ماه تولد سنجیده شده‌اند.
                </p>
              )}
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            <article className="vedic-card space-y-2 p-5">
              <h2 className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4 text-primary" aria-hidden="true" /> پنچانگ امروز</h2>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">طلوع / غروب</dt><dd className="num">{fa(data.panchang.sunrise)} / {fa(data.panchang.sunset)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">تیتی</dt><dd>{data.panchang.tithi.name} ({data.panchang.tithi.paksha.split(' ')[0]}) تا <span className="num">{fa(data.panchang.tithi.ends)}</span></dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">ناکشاترا</dt><dd>{NAK_FA[data.panchang.nakshatra.name] ?? data.panchang.nakshatra.name} پادا {fa(data.panchang.nakshatra.pada)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">یوگا</dt><dd className={cn(data.panchang.yoga.harsh && 'text-muted-foreground')}>{data.panchang.yoga.name}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">کارانا</dt><dd className={cn(data.panchang.karana.harsh && 'text-muted-foreground')}>{data.panchang.karana.name}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">قمر در برج</dt><dd>{data.panchang.moon_sign_fa}</dd></div>
              </dl>
            </article>

            <article className="vedic-card space-y-3 p-5">
              <h2 className="flex items-center gap-2 font-bold"><Clock className="h-4 w-4 text-primary" aria-hidden="true" /> ساعت‌ها</h2>
              <div className="rounded-xl bg-accent p-3 text-sm">
                <div className="font-semibold text-accent-foreground">بهترین زمان شروع کارهای مهم</div>
                <div className="num">ابهیجیت: {fa(data.panchang.abhijit_muhurta.from)} تا {fa(data.panchang.abhijit_muhurta.to)}</div>
              </div>
              <div className="rounded-xl bg-[hsl(var(--lavender))] p-3 text-sm">
                <div className="font-semibold text-foreground">بازه‌های آرام؛ مناسب کارهای روزمره</div>
                <ul className="num mt-1 space-y-0.5">
                  <li>راهو کالا: {fa(data.panchang.avoid.rahu_kala.from)}–{fa(data.panchang.avoid.rahu_kala.to)}</li>
                  <li>یامگاندا: {fa(data.panchang.avoid.yamaganda.from)}–{fa(data.panchang.avoid.yamaganda.to)}</li>
                  <li>گولیکا: {fa(data.panchang.avoid.gulika.from)}–{fa(data.panchang.avoid.gulika.to)}</li>
                </ul>
              </div>
            </article>

            <article className="vedic-card space-y-2 p-5">
              <h2 className="font-bold">ساعت‌های خوب امروز</h2>
              {data.best_horas.map((h) => (
                <div key={h.from} className="rounded-xl border border-primary/15 bg-card/70 p-2.5 text-sm">
                  <div className="num font-semibold">{fa(h.from)}–{fa(h.to)} • {h.lord_fa}</div>
                  <div className="text-xs leading-5 text-muted-foreground">{h.use_fa}</div>
                </div>
              ))}
            </article>
          </section>

          <section className="vedic-card space-y-3 p-6">
            <h2 className="font-bold">حوزه‌های زندگی امروز</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.personal.areas.map((a) => (
                <div key={a.key} className="space-y-1.5">
                  <div className="flex justify-between text-sm"><span>{a.label_fa}</span><span className="num">{fa(a.score)} • {LEVEL_LABEL[a.level]}</span></div>
                  <Progress value={a.score} aria-label={a.label_fa} className={cn('h-2.5 bg-muted', a.level === 'green' ? '[&>div]:bg-fortune-green' : a.level === 'amber' ? '[&>div]:bg-fortune-amber' : '[&>div]:bg-fortune-red')} />
                </div>
              ))}
            </div>
          </section>

          <section className="vedic-card space-y-4 p-6">
            <h2 className="font-bold">دوره‌ای که در آن هستید</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {data.dasha.levels.map((l) => (
                <div key={l.level} className="rounded-2xl border border-primary/15 bg-card/70 p-4">
                  <div className="text-xs text-muted-foreground">{PLAN_LEVEL[l.level]}</div>
                  <div className="text-lg font-bold text-primary">{l.lord_fa}</div>
                  <div className="num text-xs text-muted-foreground">{fa(l.from)} تا {fa(l.to)}</div>
                  <div className="mt-2 text-sm font-medium">{l.theme_fa}</div>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">{l.advice_fa}</p>
                  {l.focus_areas_fa && <p className="mt-2 text-xs">محورها: {l.focus_areas_fa.join('، ')}</p>}
                </div>
              ))}
            </div>
          </section>

          <section className="vedic-card space-y-4 p-6">
            <h2 className="flex items-center gap-2 font-bold"><CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" /> ۱۴ روز آینده</h2>
            <div className="grid grid-cols-7 gap-2">
              {data.outlook.days.map((d) => (
                <div key={d.date} className="rounded-xl border border-primary/15 bg-card/70 p-2 text-center text-xs">
                  <div className="text-muted-foreground">{dayLabel(d.date)}</div>
                  <div className={cn('mx-auto my-1 h-3 w-3 rounded-full', LEVEL_BG[d.level])} aria-hidden="true" />
                  <div className="num font-semibold">{fa(d.score)}</div>
                  <span className="sr-only">{LEVEL_LABEL[d.level]}</span>
                </div>
              ))}
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(data.outlook.best_days).map(([k, v]) => (
                <div key={k}><span className="font-semibold">بهترین روزها برای {AREA_KEY_FA[k]}:</span>{' '}
                  <span className="text-muted-foreground">{v.map((x) => dayLabel(x.date)).join('، ')}</span></div>
              ))}
            </div>
          </section>

          <p className="text-center text-xs text-muted-foreground">{data.notes[0]}</p>
        </>
      )}
    </div>
  )
}
