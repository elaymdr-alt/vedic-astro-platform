import { useState } from 'react'
import { Link, Routes, Route, useNavigate } from 'react-router-dom'
import BirthForm, { type BirthState } from './components/BirthForm'
import NorthChart, { type ChartMode } from './components/NorthChart'
import Dashboard from './pages/Dashboard'
import Pricing from './pages/Pricing'
import Settings from './pages/Settings'
import { computeChart, PLANET_FA, SIGN_FA, type ChartResult } from './api'
import { Button } from '@/components/ui/button'
import './styles.css'

export default function App() {
  const [chart, setChart] = useState<ChartResult | null>(null)
  const [mode, setMode] = useState<ChartMode>('D1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const submit = async (b: BirthState) => {
    setLoading(true); setError('')
    try {
      const r = await computeChart({
        calendar: 'jalali', year: b.year, month: b.month, day: b.day,
        hour: b.hour, minute: b.minute, tz_offset: b.tz_offset, lat: b.lat, lon: b.lon,
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
    <div className="wrap">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌌</span>
            <div>
              <h1 className="text-xl font-bold vedic-text-gradient">طالع‌بینی ودیک</h1>
              <p className="text-xs text-muted-foreground">منطقه‌البروج • آیانامشا لاهیری • خانه‌های Whole Sign</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>چارت</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>داشبورد</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/pricing')}>بسته‌ها</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>تنظیمات</Button>
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/" element={
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <BirthForm onSubmit={submit} loading={loading} />
                {error && <p className="error mt-4">{error}</p>}
              </div>
              <section className="card">
                <h2 className="text-lg font-semibold mb-4">نتیجه</h2>
                {!chart && !error && <p className="text-muted-foreground">مشخصات تولد را وارد و «محاسبه چارت» را بزنید.</p>}
                {chart && (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      {chart.ascendant && <>طالع: {chart.ascendant.sign_fa} ({chart.ascendant.degree_in_sign.toFixed(2)}°) • </>}
                      آیانامشا: {chart.ayanamsa_lahiri.toFixed(3)}°
                    </p>
                    {!chart.ascendant && <p className="text-muted-foreground">ساعت تولد نامعلوم است — طالع و خانه‌ها بدون مبنای معتبر تولد نمی‌شوند.</p>}
                    {chart.ascendant && (
                      <>
                        <div className="mode-toggle mb-4" role="group" aria-label="انتخاب وارگا">
                          <button type="button" className={mode === 'D1' ? 'active' : ''} onClick={() => setMode('D1')}>D1 — دشانه</button>
                          <button type="button" className={mode === 'D9' ? 'active' : ''} onClick={() => setMode('D9')}>D9 — ناوامشا</button>
                        </div>
                        <NorthChart chart={chart} mode={mode} />
                        <h3 className="text-sm font-semibold mt-6 mb-2">سیارات ({mode})</h3>
                        <div className="overflow-auto">
                          <table className="w-full text-sm">
                            <thead><tr><th>سیاره</th><th>برج</th><th>درجه</th><th>وضعیت</th></tr></thead>
                            <tbody>
                              {chart.planets.map((p) => (
                                <tr key={p.name}>
                                  <td>{PLANET_FA[p.name] ?? p.name}</td>
                                  <td>{p.sign_fa}</td>
                                  <td>{p.degree_in_sign.toFixed(2)}°</td>
                                  <td>{p.retrograde ? 'رجعی' : 'مستقیم'}</td>
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
          </main>
        } />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </div>
  )
}
