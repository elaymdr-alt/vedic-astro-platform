import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Clock, Loader2, Plus, Trash2, Wand2 } from 'lucide-react'
import BirthForm, { type BirthState, loadSavedBirth, saveBirth } from '@/components/BirthForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  rectify, rectifyEventTypes, PLANET_FA,
  type RectifyEvent, type RectifyResult,
} from '@/api'
import { cn } from '@/lib/utils'

const fa = (s: string | number) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])

const WINDOWS: { id: string; label: string; from: string; to: string; center?: string }[] = [
  { id: 'unknown', label: 'اصلاً نمی‌دانم', from: '00:00', to: '23:59' },
  { id: 'dawn', label: 'بامداد (۰۰ تا ۰۶)', from: '00:00', to: '06:00', center: '03:00' },
  { id: 'morning', label: 'صبح (۰۶ تا ۱۲)', from: '06:00', to: '12:00', center: '09:00' },
  { id: 'afternoon', label: 'ظهر و عصر (۱۲ تا ۱۸)', from: '12:00', to: '18:00', center: '15:00' },
  { id: 'night', label: 'شب (۱۸ تا ۲۴)', from: '18:00', to: '23:59', center: '21:00' },
  { id: 'exact', label: 'حدود یک ساعت مشخص…', from: '00:00', to: '23:59' },
]

const blankEvent = (type: string): RectifyEvent => ({
  type, calendar: 'jalali', year: 1395, month: 1, day: 1, precision: 'month',
})

function Curve({ r }: { r: RectifyResult }) {
  const pts = r.curve
  const max = Math.max(...pts.map((p) => p.posterior), 1e-9)
  const w = 600, h = 120
  const path = pts
    .map((p, i) => `${(i / Math.max(pts.length - 1, 1)) * w},${h - (p.posterior / max) * (h - 8) - 4}`)
    .join(' ')
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h + 18}`} className="w-full" role="img"
        aria-label="نمودار احتمال ساعت تولد در طول شبانه‌روز">
        <polyline points={path} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
        {[0, 6, 12, 18, 24].map((hh) => (
          <text key={hh} x={(hh / 24) * w} y={h + 14} fontSize="10" textAnchor="middle"
            fill="hsl(var(--muted-foreground))">{fa(hh)}</text>
        ))}
      </svg>
      <figcaption className="mt-1 text-center text-xs text-muted-foreground">
        احتمال نسبی هر لحظه (قله‌ها = محتمل‌تر)
      </figcaption>
    </figure>
  )
}

export default function Rectify() {
  const nav = useNavigate()
  const [birth, setBirth] = useState<BirthState | null>(null)
  const [types, setTypes] = useState<{ type: string; label_fa: string }[]>([])
  const [win, setWin] = useState('unknown')
  const [exact, setExact] = useState('10:30')
  const [events, setEvents] = useState<RectifyEvent[]>([])
  const [res, setRes] = useState<RectifyResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    rectifyEventTypes().then((t) => {
      setTypes(t)
      setEvents((e) => (e.length ? e : [blankEvent(t[0]?.type ?? 'marriage')]))
    }).catch((e) => setError(e.message))
  }, [])

  const labelOf = useMemo(() => Object.fromEntries(types.map((t) => [t.type, t.label_fa])), [types])
  const upd = (i: number, patch: Partial<RectifyEvent>) =>
    setEvents((es) => es.map((e, j) => (j === i ? { ...e, ...patch } : e)))

  const run = async () => {
    if (!birth) return
    setLoading(true)
    setError('')
    try {
      const w = WINDOWS.find((x) => x.id === win)!
      setRes(await rectify({
        calendar: 'jalali', year: birth.year, month: birth.month, day: birth.day,
        tz: birth.tz, tz_offset: birth.tz_offset, lat: birth.lat, lon: birth.lon,
        window_from: w.from, window_to: w.to,
        approx_time: win === 'exact' ? exact : w.center,
        approx_sigma_min: win === 'exact' ? 30 : 120,
        events, step_minutes: 4, permutations: 80,
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطای ناشناخته')
    } finally {
      setLoading(false)
    }
  }

  const useTime = (t: string) => {
    if (!birth) return
    const [h, m] = t.split(':').map(Number)
    saveBirth({ ...(loadSavedBirth() ?? birth), ...birth, hour: h, minute: m })
    nav('/reading')
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
      <header className="text-center">
        <span className="eyebrow mb-4"><Clock className="h-3.5 w-3.5" aria-hidden="true" /> تصحیح ساعت تولد</span>
        <h1 className="vedic-text-gradient text-balance text-3xl font-extrabold sm:text-4xl">
          ساعت تولدت را با رویدادهای زندگی‌ات برآورد کن
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
          سامانه چارت را برای همه ساعت‌های محتمل می‌سازد و می‌بیند کدام ساعت با تاریخ رویدادهای مهم
          زندگی‌ات (ازدواج، کار، فرزند، مهاجرت…) هم‌خوان‌تر است.
        </p>
        <div className="mx-auto mt-4 flex max-w-2xl items-start gap-2 rounded-2xl border border-[hsl(var(--sun))]/35 bg-[hsl(var(--sun-soft))] p-3 text-start text-xs leading-6">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--sun))]" aria-hidden="true" />
          <span>
            صادقانه: با رویدادهای زندگی نمی‌توان دقیقه را قطعی کرد؛ نتیجه یک <b>بازه محتمل</b> و
            احتمال هر <b>طالع</b> است. اگر شناسنامه، دفترچه واکسن یا گزارش بیمارستان دارید، همان معتبرتر است.
          </span>
        </div>
      </header>

      {!birth ? (
        <div className="mx-auto max-w-xl">
          <BirthForm showTime={false} title="تاریخ و محل تولد" submitLabel="ادامه"
            loading={false} onSubmit={setBirth} />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="vedic-card space-y-4 p-6">
            <h2 className="font-bold">۱. حدس خودتان از ساعت تولد چیست؟</h2>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="بازه زمانی">
              {WINDOWS.map((w) => (
                <button key={w.id} type="button" role="radio" aria-checked={win === w.id}
                  onClick={() => setWin(w.id)}
                  className={cn('rounded-full border px-4 py-2 text-sm transition-colors',
                    win === w.id ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-primary/25 bg-card/80 hover:bg-primary/10')}>
                  {w.label}
                </button>
              ))}
            </div>
            {win === 'exact' && (
              <Input type="time" value={exact} onChange={(e) => setExact(e.target.value)}
                className="num w-40" aria-label="ساعت تقریبی" />
            )}
          </section>

          <section className="vedic-card space-y-4 p-6">
            <h2 className="font-bold">۲. رویدادهای مهم زندگی (حداقل ۳ مورد، هرچه دقیق‌تر بهتر)</h2>
            <div className="space-y-3">
              {events.map((e, i) => (
                <div key={i} className="grid grid-cols-2 items-end gap-2 rounded-2xl border border-primary/15 bg-card/70 p-3 sm:grid-cols-[1.6fr_.8fr_.6fr_.6fr_1fr_auto]">
                  <label className="col-span-2 text-xs text-muted-foreground sm:col-span-1">
                    رویداد
                    <select className="vedic-field mt-1 w-full" value={e.type}
                      onChange={(x) => upd(i, { type: x.target.value })}>
                      {types.map((t) => <option key={t.type} value={t.type}>{t.label_fa}</option>)}
                    </select>
                  </label>
                  {(['year', 'month', 'day'] as const).map((k) => (
                    <label key={k} className="text-xs text-muted-foreground">
                      {k === 'year' ? 'سال' : k === 'month' ? 'ماه' : 'روز'}
                      <Input type="number" className="num mt-1 text-center" value={e[k]}
                        disabled={(k === 'day' && e.precision !== 'day') || (k === 'month' && e.precision === 'year')}
                        onChange={(x) => upd(i, { [k]: Number(x.target.value) })} />
                    </label>
                  ))}
                  <label className="text-xs text-muted-foreground">
                    دقت تاریخ
                    <select className="vedic-field mt-1 w-full" value={e.precision}
                      onChange={(x) => upd(i, { precision: x.target.value as RectifyEvent['precision'] })}>
                      <option value="day">روز مشخص</option>
                      <option value="month">فقط ماه</option>
                      <option value="year">فقط سال</option>
                    </select>
                  </label>
                  <Button type="button" variant="ghost" size="icon" aria-label="حذف رویداد"
                    onClick={() => setEvents((es) => es.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" disabled={events.length >= 14 || !types.length}
                onClick={() => setEvents((es) => [...es, blankEvent(types[0].type)])}>
                <Plus className="ml-1 h-4 w-4" /> افزودن رویداد
              </Button>
              <Badge variant="secondary">{fa(events.length)} رویداد</Badge>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={run} disabled={loading || events.length === 0}
              className="vedic-gradient h-12 px-8 text-base">
              {loading ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> در حال برآورد…</>
                : <><Wand2 className="ml-2 h-4 w-4" /> برآورد ساعت تولد</>}
            </Button>
            <Button variant="ghost" onClick={() => { setBirth(null); setRes(null) }}>تغییر تاریخ/شهر</Button>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {res && (
        <section className="space-y-6" aria-live="polite">
          <div className="vedic-card space-y-4 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-bold">نتیجه</h2>
              {res.significance.informative
                ? <Badge className="bg-fortune-green/15 text-success"><CheckCircle2 className="ml-1 h-3.5 w-3.5" /> رویدادها اطلاعات مفید دارند</Badge>
                : <Badge variant="destructive">اطلاعات کافی نیست</Badge>}
              {res.significance.p_value !== null && (
                <span className="num text-xs text-muted-foreground">
                  آزمون تصادفی‌بودن: p = {fa(res.significance.p_value.toFixed(2))}
                </span>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-primary/5 p-4 text-center">
                <div className="text-xs text-muted-foreground">محتمل‌ترین ساعت</div>
                <div className="num text-3xl font-extrabold text-primary">{fa(res.best.time)}</div>
                <div className="text-xs">طالع {res.best.lagna_fa}</div>
              </div>
              <div className="rounded-2xl bg-primary/5 p-4 text-center">
                <div className="text-xs text-muted-foreground">بازه محتمل (۸۰٪)</div>
                <div className="num text-xl font-bold">{fa(res.credible_window.from)} تا {fa(res.credible_window.to)}</div>
                <div className="text-xs">{res.credible_ranges.length > 1 ? `${fa(res.credible_ranges.length)} بازه جدا` : 'یک بازه'}</div>
              </div>
              <div className="rounded-2xl bg-primary/5 p-4 text-center">
                <div className="text-xs text-muted-foreground">بررسی‌شده</div>
                <div className="num text-xl font-bold">{fa(res.candidates_evaluated)} ساعت</div>
                <div className="text-xs">گام {fa(res.step_minutes)} دقیقه</div>
              </div>
            </div>
            <Button onClick={() => useTime(res.best.time)} variant="outline">
              ساخت چارت و تفسیر با ساعت {fa(res.best.time)}
            </Button>
          </div>

          <div className="vedic-card space-y-3 p-6">
            <h3 className="font-bold">احتمال هر طالع</h3>
            {res.lagna_probabilities.slice(0, 5).map((l) => (
              <div key={l.sign} className="flex items-center gap-3">
                <span className="w-16 text-sm">{l.sign_fa}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-primary/10"
                  role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(l.probability * 100)}>
                  <div className="h-full rounded-full bg-primary" style={{ width: `${l.probability * 100}%` }} />
                </div>
                <span className="num w-12 text-end text-sm">{fa(Math.round(l.probability * 100))}٪</span>
                <span className="num hidden w-28 text-xs text-muted-foreground sm:block">
                  {fa(l.window[0])}–{fa(l.window[1])}
                </span>
              </div>
            ))}
            <Curve r={res} />
          </div>

          <div className="vedic-card space-y-3 p-6">
            <h3 className="font-bold">چرا؟ تطبیق رویدادها با داشا (برای ساعت محتمل‌تر)</h3>
            <div className="overflow-x-auto">
              <table className="vedic-table">
                <thead><tr><th>رویداد</th><th>تاریخ</th><th>ماها / آنتر / پراتیانتر</th><th>همخوانی</th></tr></thead>
                <tbody>
                  {res.explanation.map((x, i) => (
                    <tr key={i}>
                      <td>{labelOf[x.type] ?? x.label_fa}</td>
                      <td className="num">{fa(x.date)}</td>
                      <td>{[x.dasha.mahadasha, x.dasha.antardasha, x.dasha.pratyantar].map((p) => PLANET_FA[p] ?? p).join(' / ')}</td>
                      <td className="num">{fa(Math.round(x.supports * 100))}٪</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ul className="space-y-2 text-sm text-muted-foreground">
            {res.warnings.map((w) => (
              <li key={w} className="flex gap-2"><AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-[hsl(var(--sun))]" aria-hidden="true" />{w}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
