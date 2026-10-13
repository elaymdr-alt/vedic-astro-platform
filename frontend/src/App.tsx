import { useState } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { Compass, Home, Sparkles } from 'lucide-react'
import Layout from './components/Layout'
import BirthForm, { type BirthState } from './components/BirthForm'
import CelestialWheel from './components/CelestialWheel'
import NorthChart, { type ChartMode } from './components/NorthChart'
import Dashboard from './pages/Dashboard'
import Pricing from './pages/Pricing'
import Settings from './pages/Settings'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Profile from './pages/Profile'
import Reading from './pages/Reading'
import Perspectives from './pages/Perspectives'
import Rectify from './pages/Rectify'
import Today from './pages/Today'
import Chat from './pages/Chat'
import Psyche from './pages/Psyche'
import Dreams from './pages/Dreams'
import { computeChart, PLANET_FA, type ChartResult } from './api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ Home */
function HomePage() {
  const [chart, setChart] = useState<ChartResult | null>(null)
  const [mode, setMode] = useState<ChartMode>('D1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (b: BirthState) => {
    setLoading(true)
    setError('')
    try {
      const r = await computeChart({
        calendar: 'jalali',
        year: b.year,
        month: b.month,
        day: b.day,
        hour: b.hour,
        minute: b.minute,
        tz_offset: b.tz_offset,
        time_precision: b.timeKnown === false ? 'unknown' : 'exact',
        tz: b.tz,
        lat: b.lat,
        lon: b.lon,
      })
      setChart(r.chart)
      setMode('D1')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطای ناشناخته')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <span className="eyebrow mb-5">
          <Sparkles className="h-3.5 w-3.5 text-gold-400" aria-hidden="true" />
          منطقه‌البروج • آیانامشای لاهیری
        </span>
        <h1 className="vedic-text-gradient text-balance text-4xl font-extrabold sm:text-5xl">
          چارت تولد خود را محاسبه کنید
        </h1>
        <p className="text-pretty mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          اطلاعات تولد خود را وارد کنید تا چارت دشانه (D1) و ناوامشا (D9) به‌همراه موقعیت
          سیارات، برج‌ها و خانه‌ها محاسبه شود.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-8">
        <div className="space-y-4">
          <BirthForm onSubmit={submit} loading={loading} allowUnknownTime />

          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}
        </div>
        <section className="vedic-card p-6 sm:p-8">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Compass className="h-5 w-5 text-brand-400" aria-hidden="true" />
              نتیجه
            </h2>
            {chart?.ascendant && (
              <Badge variant="success">
                طالع: {chart.ascendant.sign_fa} · {chart.ascendant.degree_in_sign.toFixed(2)}°
              </Badge>
            )}
          </header>

          {!chart && !error && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CelestialWheel className="mb-4 w-full max-w-sm" />
              <p className="text-sm text-muted-foreground">
                مشخصات تولد را وارد و «محاسبه چارت» را بزنید.
              </p>
            </div>
          )}

          {chart && (
            <>
              <p className="mb-6 text-sm text-muted-foreground">
                آیانامشا: <span className="num text-foreground">{chart.ayanamsa_lahiri.toFixed(3)}°</span>
              </p>

              {!chart.ascendant ? (
                <p className="rounded-xl border border-gold-500/25 bg-gold-500/10 p-4 text-sm text-brand-700 dark:text-gold-200">
                  ساعت تولد نامعلوم است — طالع و خانه‌ها بدون مبنای معتبر تولد محاسبه نمی‌شوند.
                </p>
              ) : (
                <>
                  <div
                    className="mb-6 inline-flex rounded-2xl border border-border bg-white/[0.04] p-1 backdrop-blur-md"
                    role="group"
                    aria-label="انتخاب وارگا"
                  >
                    {(
                      [
                        { key: 'D1', label: 'D1 — دشانه' },
                        { key: 'D9', label: 'D9 — ناوامشا' },
                      ] as const
                    ).map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={mode === key}
                        onClick={() => setMode(key)}
                        className={cn(
                          'rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300',
                          mode === key
                            ? 'vedic-gradient text-white shadow-lg shadow-brand-900/40'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <NorthChart chart={chart} mode={mode} />

                  <h3 className="mb-3 mt-8 text-sm font-bold">سیارات ({mode})</h3>
                  <div className="-mx-6 overflow-x-auto sm:-mx-8">
                    <table className="vedic-table min-w-[32rem]">
                      <thead>
                        <tr>
                          <th>سیاره</th>
                          <th>برج</th>
                          <th>درجه</th>
                          <th>وضعیت</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chart.planets.map((p) => (
                          <tr key={p.name}>
                            <td className="font-medium">{PLANET_FA[p.name] ?? p.name}</td>
                            <td>{p.sign_fa}</td>
                            <td className="num">{p.degree_in_sign.toFixed(2)}°</td>
                            <td>
                              <Badge variant={p.retrograde ? 'warning' : 'secondary'}>
                                {p.retrograde ? 'رجعی' : 'مستقیم'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ 404 */
function NotFound() {
  const location = useLocation()
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-28 text-center">
      <p className="vedic-text-gradient num text-8xl font-extrabold">404</p>
      <h1 className="mt-4 text-2xl font-bold">صفحه پیدا نشد</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        مسیر{' '}
        <code className="num rounded bg-muted px-1.5 py-0.5" dir="ltr">
          {location.pathname}
        </code>{' '}
        وجود ندارد.
      </p>
      <Button asChild className="mt-8">
        <Link to="/">
          <Home className="ml-2 h-4 w-4" />
          بازگشت به خانه
        </Link>
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ App */
export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/reading" element={<Reading />} />
        <Route path="/perspectives" element={<Perspectives />} />
        <Route path="/today" element={<Today />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/psyche" element={<Psyche />} />
        <Route path="/dreams" element={<Dreams />} />
        <Route path="/rectify" element={<Rectify />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}
