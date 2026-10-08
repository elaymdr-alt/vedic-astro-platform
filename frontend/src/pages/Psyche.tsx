import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Brain, MoonStar, CheckCircle2, Loader2, Search, Sparkles } from 'lucide-react'
import BirthForm, { loadSavedBirth, type BirthState } from '@/components/BirthForm'
import { cn } from '@/lib/utils'

interface Profile {
  persona: { text_fa: string; question_fa: string } | null
  self: { text_fa: string; planet_fa: string; sign_fa: string; house?: number; question_fa: string }
  inner_world: { text_fa: string; sign_fa: string }
  inner_other: { text_fa: string; venus: { sign_fa: string }; mars: { sign_fa: string }; question_fa: string }
  shadow: { text_fa: string; question_fa: string; candidates: { planet_fa: string; sign_fa: string; house?: number; theme_fa: string; reasons_fa: string[] }[] }
  tensions: { pair_fa: string; aspect_fa: string; text_fa: string }[]
  individuation: { text_fa: string; question_fa: string; toward: { sign_fa: string; theme_fa?: string }; from: { sign_fa: string; theme_fa?: string } }
  chapter: { stage: string; focus_fa: string; text_fa: string; age: number }
  disclaimer: string
}
interface QuizItem { id: number; axis: string; text: string; a: { pole: string; text: string }; b: { pole: string; text: string } }
interface Concept { id: string; title: string; text: string }

const fa = (s: string | number) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`/api${path}`, init)
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    throw new Error(e?.detail?.message ?? 'خطا در دریافت اطلاعات')
  }
  return r.json()
}

function Card({ title, children, hint }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <article className="chat-panel space-y-2 rounded-3xl p-5">
      <h3 className="font-bold text-[hsl(var(--primary))]">{title}</h3>
      {children}
      {hint && <p className="rounded-2xl bg-[hsl(258_70%_95%)] p-3 text-sm leading-7"><b>پرسش تأملی:</b> {hint}</p>}
    </article>
  )
}

export default function Psyche() {
  const [birth, setBirth] = useState<BirthState | null>(() => loadSavedBirth())
  const [askBirth, setAskBirth] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [quiz, setQuiz] = useState<QuizItem[]>([])
  const [answers, setAnswers] = useState<Record<number, 'a' | 'b'>>({})
  const [result, setResult] = useState<{ code: string; function_stack_fa: string[]; note_fa: string } | null>(null)
  const [q, setQ] = useState('')
  const [concepts, setConcepts] = useState<Concept[]>([])

  useEffect(() => {
    api<{ items: QuizItem[] }>('/psyche/quiz').then((r) => setQuiz(r.items)).catch(() => {})
  }, [])
  useEffect(() => {
    const t = setTimeout(() => {
      api<{ items: Concept[] }>(`/psyche/concepts?q=${encodeURIComponent(q)}&limit=6`)
        .then((r) => setConcepts(r.items)).catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [q])
  useEffect(() => {
    if (!birth) return
    setLoading(true); setErr('')
    api<Profile>('/psyche/profile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calendar: 'jalali', year: birth.year, month: birth.month, day: birth.day,
        hour: birth.hour, minute: birth.minute, tz: birth.tz, tz_offset: birth.tz_offset, lat: birth.lat, lon: birth.lon }),
    }).then(setProfile).catch((e) => setErr(e.message)).finally(() => setLoading(false))
  }, [birth])

  const answered = Object.keys(answers).length
  const submitQuiz = async () => {
    try {
      setResult(await api('/psyche/quiz/score', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers }),
      }))
    } catch (e) { setErr(e instanceof Error ? e.message : 'خطا') }
  }

  return (
    <div className="chat-theme min-h-[calc(100dvh-4rem)]">
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
        <header className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-xs font-semibold text-[hsl(var(--primary))]">
            <Brain className="h-3.5 w-3.5" aria-hidden="true" /> روان‌شناسی یونگی
          </span>
          <h1 className="mt-3 text-3xl font-extrabold text-[hsl(var(--primary))]">آشنایی با دنیای درونت</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
            نگاهی مهربان به پرسونا، «ظرفیت‌های نهفته»، رابطهٔ درونی و فصل فعلی زندگی‌ات؛ با زبان نمادین چارت و مفاهیم یونگ.
            این‌ها تفسیر و استعاره‌اند، نه تشخیص.
          </p>
        </header>

        <Link to="/dreams" className="chat-panel flex items-center justify-center gap-2 rounded-2xl p-3 text-sm font-semibold text-[hsl(var(--primary))]">
          <MoonStar className="h-4 w-4" aria-hidden="true" /> دفترچهٔ رؤیا و تأمل یونگی
        </Link>
        {err && <div role="alert" className="rounded-2xl bg-white/80 p-3 text-center text-sm">{err}</div>}

        <section className="space-y-4" aria-labelledby="h-profile">
          <h2 id="h-profile" className="flex items-center gap-2 text-xl font-bold"><Sparkles className="h-5 w-5 text-amber-500" aria-hidden="true" /> نقشهٔ درونی از روی چارت</h2>
          {!birth || askBirth ? (
            <BirthForm title="اطلاعات تولد" submitLabel="نمایش نقشهٔ درونی" loading={loading}
              onSubmit={(b) => { setBirth(b); setAskBirth(false) }} />
          ) : loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-7 w-7 animate-spin text-[hsl(var(--primary))]" aria-label="در حال بارگذاری" /></div>
          ) : profile && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card title={`فصل فعلی: ${profile.chapter.stage}`} hint={profile.individuation.question_fa}>
                <p className="text-sm leading-7">{profile.chapter.focus_fa}</p>
                <p className="text-sm leading-7 text-muted-foreground">{profile.chapter.text_fa}</p>
              </Card>
              {profile.persona ? (
                <Card title="پرسونا (چهرهٔ نخست)" hint={profile.persona.question_fa}>
                  <p className="text-sm leading-7">{profile.persona.text_fa}</p>
                </Card>
              ) : (
                <Card title="پرسونا"><p className="text-sm leading-7">با وارد کردن ساعت تولد، چهرهٔ نخست (طالع) هم دیده می‌شود.</p></Card>
              )}
              <Card title={`خود: خورشید در ${profile.self.sign_fa}`} hint={profile.self.question_fa}>
                <p className="text-sm leading-7">{profile.self.text_fa}</p>
                <p className="text-sm leading-7 text-muted-foreground">{profile.inner_world.text_fa} (ماه در {profile.inner_world.sign_fa})</p>
              </Card>
              <Card title="وجه درونیِ «دیگری» (آنیما/آنیموس)" hint={profile.inner_other.question_fa}>
                <p className="text-sm leading-7">{profile.inner_other.text_fa}</p>
                <p className="text-sm text-muted-foreground">زهره در {profile.inner_other.venus.sign_fa} • مریخ در {profile.inner_other.mars.sign_fa}</p>
              </Card>
              <Card title="ظرفیت‌های نهفته (سایهٔ طلایی)" hint={profile.shadow.question_fa}>
                <p className="text-sm leading-7 text-muted-foreground">{profile.shadow.text_fa}</p>
                <ul className="space-y-1.5 text-sm leading-7">
                  {profile.shadow.candidates.slice(0, 4).map((c) => (
                    <li key={c.planet_fa}><b>{c.planet_fa}</b> در {c.sign_fa}{c.house ? ` (خانهٔ ${fa(c.house)})` : ''}: {c.theme_fa}</li>
                  ))}
                </ul>
              </Card>
              <Card title="محور رشد (فردیت‌یابی)">
                <p className="text-sm leading-7">{profile.individuation.text_fa}</p>
                <p className="text-sm text-muted-foreground">
                  به‌سوی: {profile.individuation.toward.sign_fa}{profile.individuation.toward.theme_fa ? ` (${profile.individuation.toward.theme_fa})` : ''}
                  {' • '}از: {profile.individuation.from.sign_fa}
                </p>
              </Card>
              {profile.tensions.length > 0 && (
                <Card title="کشش‌های سازنده درونی">
                  <ul className="space-y-1.5 text-sm leading-7">
                    {profile.tensions.map((t) => <li key={t.pair_fa}><b>{t.pair_fa}</b> ({t.aspect_fa}): {t.text_fa}</li>)}
                  </ul>
                </Card>
              )}
              <div className="md:col-span-2 text-center">
                <button type="button" className="text-xs underline" onClick={() => setAskBirth(true)}>تغییر اطلاعات تولد</button>
                <p className="mt-1 text-[11px] text-muted-foreground">{profile.disclaimer}</p>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4" aria-labelledby="h-quiz">
          <h2 id="h-quiz" className="flex items-center gap-2 text-xl font-bold"><CheckCircle2 className="h-5 w-5 text-[hsl(var(--primary))]" aria-hidden="true" /> پرسشنامهٔ کوتاه تیپ یونگی</h2>
          <div className="chat-panel space-y-4 rounded-3xl p-5">
            {quiz.map((it) => (
              <fieldset key={it.id} className="space-y-2">
                <legend className="text-sm font-medium">{fa(it.id + 1)}. {it.text}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(['a', 'b'] as const).map((k) => (
                    <label key={k} className={cn('chat-chip cursor-pointer rounded-2xl px-3 py-2 text-sm',
                      answers[it.id] === k && 'chat-chip-on')}>
                      <input type="radio" className="sr-only" name={`q${it.id}`} checked={answers[it.id] === k}
                        onChange={() => setAnswers((a) => ({ ...a, [it.id]: k }))} />
                      {it[k].text}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <div className="flex items-center gap-3">
              <button type="button" disabled={answered < 8} onClick={submitQuiz}
                className="chat-send rounded-2xl px-6 py-2.5 text-sm font-semibold disabled:opacity-40">
                نمایش نتیجه
              </button>
              <span className="text-xs text-muted-foreground">{fa(answered)} از {fa(quiz.length)} پاسخ (حداقل ۸)</span>
            </div>
            {result && (
              <div className="rounded-2xl bg-[hsl(258_70%_95%)] p-4 text-sm leading-7" role="status">
                <div className="text-lg font-extrabold text-[hsl(var(--primary))]" dir="ltr">{result.code}</div>
                <div>پشتهٔ کارکردها: {result.function_stack_fa.join(' ← ')}</div>
                <p className="mt-1 text-xs text-muted-foreground">{result.note_fa}</p>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="h-concepts">
          <h2 id="h-concepts" className="flex items-center gap-2 text-xl font-bold"><BookOpen className="h-5 w-5 text-[hsl(var(--primary))]" aria-hidden="true" /> واژه‌نامهٔ یونگی</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثلاً: سایه، آنیما، رؤیا…"
              aria-label="جست‌وجوی مفاهیم" className="chat-panel h-11 w-full rounded-2xl pr-9 text-sm outline-none" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {concepts.map((c) => (
              <article key={c.id} className="chat-panel rounded-2xl p-4">
                <h3 className="font-bold text-[hsl(var(--primary))]">{c.title}</h3>
                <p className="mt-1 text-sm leading-7">{c.text}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
