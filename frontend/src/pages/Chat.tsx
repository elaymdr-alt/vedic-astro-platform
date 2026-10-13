import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Compass, Heart, HeartHandshake, Layers, MessageCircleHeart, Send, Sparkles, Square, Sprout, Sun, Wind,
} from 'lucide-react'
import BirthForm, { loadSavedBirth, type BirthState } from '@/components/BirthForm'
import RichText from '@/components/RichText'
import { cn } from '@/lib/utils'
import { friendlyError } from '@/lib/net'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Alert, AlertDescription } from '@/components/ui/alert'

type StyleId = 'auto' | 'hope' | 'love' | 'nudge' | 'guide' | 'calm' | 'comfort' | 'heart'
interface Source { ref: string; title: string; source: string; page: number | null; kind: string }
interface Msg {
  role: 'user' | 'assistant'
  content: string
  styleLabel?: string
  sources?: Source[]
  crisis?: boolean
  error?: boolean
}

/** Reports saved by the «سه نگاه» page, attachable as chat context. */
export interface SavedReports { generated_at: string; reports: { id: string; title: string; text: string }[] }
export const REPORTS_STORE = 'ab_perspectives_v1'
export function loadSavedReports(): SavedReports | null {
  try { const raw = localStorage.getItem(REPORTS_STORE); return raw ? JSON.parse(raw) : null } catch { return null }
}

const STYLES: { id: StyleId; label: string; hint: string; icon: typeof Sun; starters: string[] }[] = [
  { id: 'auto', label: 'هوشمند', hint: 'خودش حال تو را می‌فهمد', icon: Sparkles,
    starters: ['امروز چه کاری برایم خوب است؟', 'کمی با من حرف بزن'] },
  { id: 'hope', label: 'امید', hint: 'نوری برای مسیر', icon: Sun,
    starters: ['به امید و روشنایی نیاز دارم', 'آینده‌ام را با نگاه امیدوار ببین'] },
  { id: 'love', label: 'عشق', hint: 'مهر و پیوند', icon: Heart,
    starters: ['دربارهٔ عشق و رابطه‌ام با من حرف بزن', 'چگونه مهربان‌تر با خودم باشم؟'] },
  { id: 'nudge', label: 'تلنگر', hint: 'یک قدم کوچک', icon: Sprout,
    starters: ['یک تلنگر مهربان بده', 'انگیزه‌ام کم شده؛ از کجا شروع کنم؟'] },
  { id: 'guide', label: 'راهنمایی', hint: 'مسیرهای ممکن', icon: Compass,
    starters: ['برای یک تصمیم مهم راهنمایی می‌خواهم', 'این هفته روی چه چیزی تمرکز کنم؟'] },
  { id: 'calm', label: 'آرامش', hint: 'نفس و سکون', icon: Wind,
    starters: ['دلشوره دارم؛ آرامم کن', 'یک تمرین کوتاه آرام‌سازی بگو'] },
  { id: 'comfort', label: 'مرهم', hint: 'برای دل خسته', icon: HeartHandshake,
    starters: ['دلم گرفته', 'حس می‌کنم کسی نیست که بفهمدم'] },
  { id: 'heart', label: 'هم‌صحبت دل', hint: 'درد دل', icon: MessageCircleHeart,
    starters: ['می‌خواهم درد دل کنم', 'امروز چه حالی دارم؟'] },
]

const STORE = 'ab_chat_v1'

function Breathing() {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card/70 p-3 text-xs text-[hsl(var(--muted-foreground))]" aria-live="off">
      <span className="chat-breath h-9 w-9 shrink-0 rounded-full" aria-hidden="true" />
      <span>با دایره نفس بکش: دم ۴ ثانیه… بازدم ۶ ثانیه.</span>
    </div>
  )
}

export default function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORE) || '[]') } catch { return [] }
  })
  const [style, setStyle] = useState<StyleId>('auto')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [birth, setBirth] = useState<BirthState | null>(() => loadSavedBirth())
  const [askBirth, setAskBirth] = useState(false)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [saved, setSaved] = useState<SavedReports | null>(() => loadSavedReports())
  const [withReports, setWithReports] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    fetch('/api/chat/status').then((r) => r.json()).then((j) => setConfigured(!!j.configured)).catch(() => setConfigured(null))
  }, [])
  useEffect(() => {
    const sync = () => setSaved(loadSavedReports())
    window.addEventListener('focus', sync)
    return () => window.removeEventListener('focus', sync)
  }, [])
  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify(msgs.slice(-30))) } catch { /* storage blocked */ }
    const el = panelRef.current
    if (el && msgs.length) el.scrollTo({ top: el.scrollHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [msgs])

  const current = useMemo(() => STYLES.find((s) => s.id === style)!, [style])
  const lastStyle = [...msgs].reverse().find((m) => m.role === 'assistant')?.styleLabel

  const send = useCallback(async (text: string) => {
    const content = text.trim()
    if (!content || busy) return
    setInput('')
    const history = [...msgs, { role: 'user' as const, content }]
    setMsgs([...history, { role: 'assistant', content: '' }])
    setBusy(true)
    const ac = new AbortController()
    abort.current = ac
    const patch = (fn: (m: Msg) => Msg) =>
      setMsgs((cur) => cur.map((m, i) => (i === cur.length - 1 ? fn(m) : m)))
    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ac.signal,
        body: JSON.stringify({
          messages: history.filter((m) => !m.error).slice(-12).map(({ role, content: c }) => ({ role, content: c })),
          style, mode: 'auto',
          reports: withReports && saved
            ? saved.reports.filter((r) => r.text.trim()).map((r) => ({ label: r.title, text: r.text.slice(0, 6000) }))
            : undefined,
          birth: birth ? {
            calendar: 'jalali', year: birth.year, month: birth.month, day: birth.day, hour: birth.hour,
            minute: birth.minute, tz: birth.tz, tz_offset: birth.tz_offset, lat: birth.lat, lon: birth.lon,
          } : undefined,
        }),
      })
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail?.message ?? 'پاسخی دریافت نشد؛ کمی بعد دوباره امتحان کن.')
      }
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        let idx
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const raw = buf.slice(0, idx)
          buf = buf.slice(idx + 2)
          const ev = /event: (\w+)/.exec(raw)?.[1]
          const data = /data: (.*)/s.exec(raw)?.[1]
          if (!ev || !data) continue
          const j = JSON.parse(data)
          if (ev === 'meta') patch((m) => ({ ...m, styleLabel: j.style_label, sources: j.sources, crisis: j.crisis }))
          else if (ev === 'delta') patch((m) => ({ ...m, content: m.content + j.text }))
          else if (ev === 'error') throw new Error(j.message)
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        patch((m) => ({ ...m, content: m.content || friendlyError(e), error: true }))
      }
    } finally {
      setBusy(false)
      abort.current = null
    }
  }, [busy, msgs, style, birth])

  return (
    <div className="chat-theme -mx-0 min-h-[calc(100dvh-4rem)]">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pb-6 pt-8 sm:px-6">
        <header className="text-center">
          <img src="/logo-mark.png" alt="" aria-hidden="true" className="mx-auto h-14 w-auto opacity-90" />
          <h1 className="mt-2 text-2xl font-extrabold text-[hsl(var(--primary))]">هم‌صحبت AstroBinesh</h1>
          <p className="mx-auto mt-1 max-w-xl text-sm leading-7 text-muted-foreground">
            ستاره‌شناس و روان‌شناس یونگی در یک گفت‌وگوی آرام؛ همیشه با نگاه امیدوار، و بر پایهٔ چارت خودت.
          </p>
        </header>

        <ToggleGroup type="single" value={style} onValueChange={(v) => v && setStyle(v as StyleId)}
          aria-label="حال گفت‌وگو" className="flex flex-wrap justify-center gap-2">
          {STYLES.map((s) => {
            const Icon = s.icon
            return (
              <ToggleGroupItem key={s.id} value={s.id} title={s.hint}
                className="chat-chip h-auto gap-1.5 rounded-full px-3.5 py-2 text-sm data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                <Icon className="h-4 w-4" aria-hidden="true" /> {s.label}
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>

        {style === 'calm' && <Breathing />}

        {configured === false && (
          <Alert>
            <AlertDescription>
              دستیار هنوز به OpenRouter وصل نشده است. مدیر سایت باید متغیر <span dir="ltr">OPENROUTER_API_KEY</span> را تنظیم کند.
            </AlertDescription>
          </Alert>
        )}
        {!birth && (
          <div className="rounded-2xl bg-card/80 p-3 text-center text-sm">
            برای پاسخ‌های شخصی‌تر، اطلاعات تولدت را وارد کن{' '}
            <button type="button" className="font-semibold text-[hsl(var(--primary))] underline" onClick={() => setAskBirth(true)}>
              وارد کردن تولد
            </button>
          </div>
        )}
        {askBirth && (
          <BirthForm title="اطلاعات تولد" submitLabel="ذخیره و ادامه" loading={false}
            onSubmit={(b) => { setBirth(b); setAskBirth(false) }} />
        )}

        <section ref={panelRef} aria-label="گفت‌وگو" aria-live="polite"
          className="chat-panel flex min-h-[40vh] max-h-[58vh] flex-col gap-3 overflow-y-auto rounded-3xl p-4">
          {msgs.length === 0 && (
            <div className="m-auto max-w-md text-center">
              <p className="text-base leading-8 text-[hsl(var(--foreground))]">
                سلام؛ خوش آمدی. هر چه در دلت هست بگو، من اینجا هستم و با هم یک قدم آرام‌تر برمی‌داریم.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {current.starters.map((t) => (
                  <button key={t} type="button" onClick={() => send(t)} className="chat-chip rounded-full px-3.5 py-2 text-sm">
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' ? 'justify-start' : 'justify-end')}>
              <div className={cn('max-w-[88%] rounded-3xl px-4 py-3 text-[15px] leading-8',
                m.role === 'user' ? 'chat-user' : m.crisis ? 'chat-crisis' : 'chat-bot', m.error && 'opacity-80')}>
                {m.role === 'assistant' && m.styleLabel && (
                  <div className="mb-1 text-[11px] font-semibold text-[hsl(var(--primary))]">حال گفت‌وگو: {m.styleLabel}</div>
                )}
                {m.content ? <RichText text={m.content} /> : (
                  <span className="chat-dots" role="status" aria-label="در حال نوشتن"><i /><i /><i /></span>
                )}
                {m.sources && m.sources.length > 0 && m.content && (
                  <details className="mt-2 text-xs text-muted-foreground">
                    <summary className="cursor-pointer">منابع ({m.sources.length})</summary>
                    <ul className="mt-1 space-y-0.5">
                      {m.sources.map((s) => (
                        <li key={s.ref}>[{s.ref}] {s.title}{s.page ? ` — ص ${s.page}` : ''}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          ))}
        </section>

        {saved && saved.reports.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="زمینهٔ گزارش‌ها">
            <button type="button" onClick={() => setWithReports((v) => !v)} aria-pressed={withReports}
              className={cn('chat-chip flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs',
                withReports && 'ring-1 ring-[hsl(var(--primary))]')}>
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              {withReports ? 'سه گزارش ضمیمه است' : `سه گزارش در زمینه (${saved.reports.length})`}
            </button>
            <Link to="/perspectives" className="chat-chip rounded-full px-3.5 py-1.5 text-xs">صفحهٔ سه نگاه</Link>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); void send(input) }}
          className="chat-panel flex items-end gap-2 rounded-3xl p-2.5">
          <label htmlFor="chat-input" className="sr-only">پیام شما</label>
          <textarea id="chat-input" rows={1} value={input} maxLength={3000}
            placeholder={lastStyle ? `هرچه می‌خواهی بگو… (حال فعلی: ${lastStyle})` : 'هرچه در دلت هست بنویس…'}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input) } }}
            className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] leading-7 outline-none placeholder:text-muted-foreground/70" />
          {busy ? (
            <button type="button" onClick={() => abort.current?.abort()} aria-label="توقف"
              className="chat-send grid h-11 w-11 place-items-center rounded-2xl"><Square className="h-4 w-4" /></button>
          ) : (
            <button type="submit" disabled={!input.trim()} aria-label="ارسال"
              className="chat-send grid h-11 w-11 place-items-center rounded-2xl disabled:opacity-40">
              <Send className="h-4 w-4 -scale-x-100" />
            </button>
          )}
        </form>
        <p className="text-center text-[11px] leading-6 text-muted-foreground">
          این گفت‌وگو ابزار خودشناسی و تأمل است و جایگزین مشاورهٔ تخصصی نیست. در شرایط دشوار با متخصص یا اورژانس ۱۱۵ و ۱۲۳ تماس بگیر.
          {msgs.length > 0 && (
            <button type="button" className="mr-2 underline" onClick={() => setMsgs([])}>شروع گفت‌وگوی تازه</button>
          )}
        </p>
      </div>
    </div>
  )
}
