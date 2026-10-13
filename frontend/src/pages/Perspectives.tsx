import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, Loader2, MessageCircleHeart, RefreshCw, Sparkles } from 'lucide-react'
import BirthForm, { loadSavedBirth, saveBirth, type BirthState } from '@/components/BirthForm'
import RichText from '@/components/RichText'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { perspectives, perspectivesStatus, type PerspectivesResult } from '@/api'
import { cn } from '@/lib/utils'
import { REPORTS_STORE } from '@/pages/Chat'

/** One interpretation page, three astrology lenses, three full reports. */
export default function Perspectives() {
  const nav = useNavigate()
  const [birth, setBirth] = useState<BirthState | null>(() => loadSavedBirth())
  const [askBirth, setAskBirth] = useState(false)
  const [focus, setFocus] = useState('')
  const [data, setData] = useState<PerspectivesResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    perspectivesStatus().then((s) => setConfigured(s.configured)).catch(() => setConfigured(null))
  }, [])

  const generate = async (b: BirthState) => {
    setLoading(true)
    setErr('')
    try {
      const r = await perspectives({
        birth: {
          calendar: b.calendar, year: b.year, month: b.month, day: b.day, hour: b.hour,
          minute: b.minute, tz: b.tz, tz_offset: b.tz_offset, time_precision: b.timeKnown === false ? 'unknown' : 'exact', lat: b.lat, lon: b.lon,
        },
        focus: focus.trim(),
      })
      setData(r)
      setActive(0)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'خطای ناشناخته')
    } finally {
      setLoading(false)
    }
  }

  const ready = data?.reports.filter((r) => r.text.trim()) ?? []

  const saveForChat = () => {
    if (!data) return
    try {
      localStorage.setItem(REPORTS_STORE, JSON.stringify({
        generated_at: data.generated_at,
        reports: data.reports.filter((r) => r.text.trim()).map((r) => ({ id: r.id, title: r.title, text: r.text })),
      }))
    } catch { /* storage blocked — chat still works without context */ }
    nav('/chat')
  }

  return (
    <div className="chat-theme min-h-[calc(100dvh-4rem)]">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
        <header className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-card/80 px-4 py-1.5 text-xs font-semibold text-[hsl(var(--primary))]">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" /> سه نگاه تفسیری
          </span>
          <h1 className="mt-3 text-3xl font-extrabold text-[hsl(var(--primary))]">یک چارت، سه مکتب نگاه</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
            سه ستاره‌شناس مصنوعی، هرکدام با زاویهٔ دید خود — ساختار کلاسیک پاراشاری، زمان‌بندی دشا و گذر، و نگاه نمادین —
            گزارشی مستقل برای همان چارت می‌نویسند. جاهایی که نگاه‌ها متفاوت‌اند، بخشی از زیبایی است.
          </p>
        </header>

        {configured === false && (
          <div role="alert" className="rounded-2xl bg-card/85 p-4 text-center text-sm leading-7">
            دستیار هوشمند هنوز فعال نشده است؛ متغیر محیطی <code className="num" dir="ltr">OPENROUTER_API_KEY</code> را تنظیم کنید.
          </div>
        )}
        {err && <div role="alert" className="rounded-2xl bg-card/85 p-4 text-center text-sm">{err}</div>}

        <section className="space-y-4" aria-labelledby="h-birth">
          <h2 id="h-birth" className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 text-amber-500" aria-hidden="true" /> چارت مبنا
          </h2>
          {!birth || askBirth ? (
            <BirthForm title="اطلاعات تولد" submitLabel="ساخت سه گزارش" loading={loading}
              onSubmit={(b) => { saveBirth(b); setBirth(b); setAskBirth(false); void generate(b) }} />
          ) : (
            <div className="chat-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-sm">
              <span className="text-muted-foreground">
                چارت ذخیره‌شده: <b className="text-foreground">{birth.cityLabel}</b> — {birth.year}/{birth.month}/{birth.day} ساعت {birth.hour}:{String(birth.minute).padStart(2, '0')}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setAskBirth(true)}>ویرایش تولد</Button>
                <Button size="sm" disabled={loading || configured === false} onClick={() => void generate(birth)}>
                  {loading ? <Loader2 className="ml-1 h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="ml-1 h-4 w-4" aria-hidden="true" />}
                  {data ? 'تازه‌سازی گزارش‌ها' : 'ساخت سه گزارش'}
                </Button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="focus" className="text-sm text-muted-foreground">موضوع دلخواه (اختیاری):</label>
            <Input id="focus" value={focus} maxLength={300} placeholder="مثلاً: ازدواج، شغل، سال پیشِ رو"
              className="max-w-xs" onChange={(e) => setFocus(e.target.value)} />
          </div>
        </section>



        {loading && (
          <div className="grid gap-4 lg:grid-cols-3" aria-live="polite">
            {[0, 1, 2].map((i) => (
              <div key={i} className="chat-panel flex items-center justify-center rounded-3xl p-10 text-muted-foreground">
                <Loader2 className="ml-2 h-5 w-5 animate-spin" aria-hidden="true" />
                <span className="text-sm">در حال نوشتن گزارش {i + 1} از ۳…</span>
              </div>
            ))}
          </div>
        )}

        {!loading && data && (
          <>
            {/* lens switcher on small screens */}
            <div className="flex flex-wrap justify-center gap-2 lg:hidden" role="tablist" aria-label="نگاه‌ها">
              {data.reports.map((r, i) => (
                <button key={r.id} role="tab" aria-selected={active === i} onClick={() => setActive(i)}
                  className={cn('chat-chip rounded-full px-4 py-2 text-sm', active === i && 'ring-1 ring-[hsl(var(--primary))]')}>
                  {r.title}
                </button>
              ))}
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {data.reports.map((r, i) => (
                <article key={r.id} aria-label={r.title}
                  className={cn('chat-panel flex flex-col rounded-3xl p-5', active === i ? 'block' : 'hidden lg:flex')}>
                  <header className="mb-3 border-b border-border/60 pb-3">
                    <h2 className="text-lg font-extrabold text-[hsl(var(--primary))]">{r.title}</h2>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">{r.subtitle}</p>
                    <Badge variant="secondary" className="mt-2 text-[11px]">{r.agent}</Badge>
                  </header>
                  {r.error ? (
                    <p className="text-sm leading-7 text-muted-foreground">
                      این نگاه این بار ساخته نشد ({r.error}). دو نگاه دیگر آماده‌اند؛ می‌توانی دوباره تلاش کنی.
                    </p>
                  ) : (
                    <div className="text-sm leading-8"><RichText text={r.text} /></div>
                  )}
                  {r.sources.length > 0 && (
                    <details className="mt-auto pt-3 text-xs text-muted-foreground">
                      <summary className="cursor-pointer">منابع ({r.sources.length})</summary>
                      <ul className="mt-1 space-y-0.5">
                        {r.sources.map((s) => (
                          <li key={s.ref}>[{s.ref}] {s.title}{s.page ? ` — ص ${s.page}` : ''}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </article>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button onClick={saveForChat} disabled={ready.length === 0}>
                <MessageCircleHeart className="ml-2 h-4 w-4" aria-hidden="true" />
                ادامهٔ گفت‌وگو با همین سه گزارش
              </Button>
              <Button variant="outline" disabled={loading} onClick={() => birth && void generate(birth)}>
                <RefreshCw className="ml-2 h-4 w-4" aria-hidden="true" /> تازه‌سازی
              </Button>
            </div>
            <p className="mx-auto max-w-2xl text-center text-[11px] leading-6 text-muted-foreground">
              این سه گزارش با سه زاویهٔ دید متفاوت نوشته شده‌اند و ممکن است در جزئیات با هم اختلاف داشته باشند؛
              تفسیر و استعاره‌اند، نه پیش‌بینی قطعی. مدل: <span className="num" dir="ltr">{data.model}</span>
            </p>
          </>
        )}

        {!data && !loading && (
          <p className="text-center text-sm leading-7 text-muted-foreground">
            با واردکردن یا انتخاب چارت، سه گزارش کامل می‌سازی. هر گزارش صدها کلمه تفسیر بر پایهٔ داده‌های همان چارت است.
          </p>
        )}
      </div>
    </div>
  )
}
