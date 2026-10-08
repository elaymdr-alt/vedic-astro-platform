import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, MoonStar, Sparkles, Trash2 } from 'lucide-react'
import { authFetch, getToken, onAuthChange } from '@/lib/auth'
import { cn } from '@/lib/utils'

interface Dream {
  id: number; title: string; text: string; mood: string
  reflection: string | null; created_at: string | null
}
const MOODS: { id: string; label: string }[] = [
  { id: 'calm', label: 'آرام' }, { id: 'joy', label: 'شاد' }, { id: 'wonder', label: 'شگفت' },
  { id: 'longing', label: 'دلتنگ' }, { id: 'confusion', label: 'سردرگم' },
  { id: 'sadness', label: 'غمگین' }, { id: 'fear', label: 'هراسان' },
]
const when = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'medium' }).format(new Date(iso + 'Z')) : ''

async function readError(r: Response): Promise<string> {
  const j = await r.json().catch(() => ({}))
  return j?.detail?.message ?? (typeof j?.detail === 'string' ? j.detail : `خطا (${r.status})`)
}

export default function Dreams() {
  const [token, setTok] = useState(getToken())
  const [dreams, setDreams] = useState<Dream[]>([])
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [mood, setMood] = useState('')
  const [busy, setBusy] = useState<number | 'save' | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => onAuthChange(() => setTok(getToken())), [])

  const load = useCallback(async () => {
    const r = await authFetch('/dreams')
    if (r.ok) setDreams(await r.json())
  }, [])
  useEffect(() => { if (token) void load() }, [token, load])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy('save'); setErr('')
    const r = await authFetch('/dreams', { method: 'POST', body: JSON.stringify({ title, text, mood }) })
    if (r.ok) { setTitle(''); setText(''); setMood(''); await load() } else setErr(await readError(r))
    setBusy(null)
  }
  const reflect = async (id: number) => {
    setBusy(id); setErr('')
    const r = await authFetch(`/dreams/${id}/reflect`, { method: 'POST' })
    if (r.ok) { const d: Dream = await r.json(); setDreams((cur) => cur.map((x) => (x.id === id ? d : x))) }
    else setErr(await readError(r))
    setBusy(null)
  }
  const remove = async (id: number) => {
    const r = await authFetch(`/dreams/${id}`, { method: 'DELETE' })
    if (r.ok) setDreams((cur) => cur.filter((x) => x.id !== id))
  }

  return (
    <div className="chat-theme min-h-[calc(100dvh-4rem)]">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <header className="text-center">
          <MoonStar className="mx-auto h-8 w-8 text-[hsl(var(--primary))]" aria-hidden="true" />
          <h1 className="mt-2 text-3xl font-extrabold text-[hsl(var(--primary))]">دفترچهٔ رؤیا</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
            رؤیاهایت را همان‌طور که یادت می‌آید بنویس؛ اگر خواستی، یک تأمل یونگی مهربان برایش بگیر. فقط خودت می‌بینی‌شان.
          </p>
        </header>

        {!token ? (
          <div className="chat-panel rounded-3xl p-6 text-center text-sm">
            برای نگهداری خصوصی رؤیاها باید وارد شوی.{' '}
            <Link to="/auth" className="font-semibold text-[hsl(var(--primary))] underline">ورود / ثبت‌نام</Link>
          </div>
        ) : (
          <>
            <form onSubmit={save} className="chat-panel space-y-3 rounded-3xl p-5">
              <label className="block text-xs text-muted-foreground">
                عنوان (اختیاری)
                <input value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)}
                  className="chat-panel mt-1 h-10 w-full rounded-xl px-3 text-sm outline-none" />
              </label>
              <label className="block text-xs text-muted-foreground">
                رؤیا
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={6000} required minLength={3}
                  placeholder="تصویرها، آدم‌ها، حس‌ها…"
                  className="chat-panel mt-1 w-full rounded-xl px-3 py-2 text-sm leading-7 outline-none" />
              </label>
              <div role="radiogroup" aria-label="حس رؤیا" className="flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <button key={m.id} type="button" role="radio" aria-checked={mood === m.id}
                    onClick={() => setMood(mood === m.id ? '' : m.id)}
                    className={cn('chat-chip rounded-full px-3 py-1.5 text-xs', mood === m.id && 'chat-chip-on')}>{m.label}</button>
                ))}
              </div>
              <button type="submit" disabled={busy === 'save' || text.trim().length < 3}
                className="chat-send inline-flex items-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-semibold disabled:opacity-40">
                {busy === 'save' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} ذخیره رؤیا
              </button>
            </form>
            {err && <div role="alert" className="rounded-2xl bg-white/80 p-3 text-center text-sm">{err}</div>}

            <ul className="space-y-4">
              {dreams.map((d) => (
                <li key={d.id} className="chat-panel space-y-2 rounded-3xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold">{d.title || 'رؤیای بدون عنوان'}</h2>
                      <div className="text-xs text-muted-foreground">{when(d.created_at)}{d.mood ? ` • ${MOODS.find((m) => m.id === d.mood)?.label ?? ''}` : ''}</div>
                    </div>
                    <button type="button" onClick={() => remove(d.id)} aria-label="حذف رؤیا"
                      className="rounded-xl p-2 text-muted-foreground hover:bg-black/5"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <p className="whitespace-pre-line text-sm leading-8">{d.text}</p>
                  {d.reflection ? (
                    <div className="chat-bot rounded-2xl p-4 text-sm leading-8">
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--primary))]"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> تأمل یونگی</div>
                      <p className="whitespace-pre-line">{d.reflection}</p>
                    </div>
                  ) : (
                    <button type="button" onClick={() => reflect(d.id)} disabled={busy === d.id}
                      className="chat-chip inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm">
                      {busy === d.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />} تأمل یونگی بگیر
                    </button>
                  )}
                </li>
              ))}
              {dreams.length === 0 && <li className="text-center text-sm text-muted-foreground">هنوز رؤیایی ثبت نشده است.</li>}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
