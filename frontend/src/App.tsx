import { useState } from 'react';
import BirthForm, { type BirthState } from './components/BirthForm';
import NorthChart, { type ChartMode } from './components/NorthChart';
import Dashboard, { type BirthState as DBirthState } from './components/Dashboard';
import { computeChart, PLANET_FA, SIGN_FA, type ChartResult } from './api';
import './styles.css';

export default function App() {
  const [chart, setChart] = useState<ChartResult | null>(null);
  const [mode, setMode] = useState<ChartMode>('D1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState<'chart'|'dashboard'>('chart');

  const submit = async (b: BirthState) => {
    setLoading(true); setError('');
    try {
      const r = await computeChart({
        calendar: 'jalali', year: b.year, month: b.month, day: b.day,
        hour: b.hour, minute: b.minute, tz_offset: b.tz_offset, lat: b.lat, lon: b.lon,
      });
      setChart(r.chart);
      setMode('D1');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطای ناشناخته');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wrap">
      <header>
        <h1>طالع‌بینی ودیک</h1>
        <p className="muted">منطقه‌البروج • آیانامشا لاهیری • خانه‌های Whole Sign</p>
      </header>
      <nav className="layout" style={{ gap: 8, marginBottom: 16 }}>
        <button className={page === 'chart' ? 'active' : ''} onClick={() => setPage('chart')} type="button">چارت</button>
        <button className={page === 'dashboard' ? 'active' : ''} onClick={() => setPage('dashboard')} type="button">داشبورد</button>
      </nav>

      {page === 'chart' ? (
        <main className="layout">
          <BirthForm onSubmit={submit} loading={loading} />
          <section className="card">
            <h2>نتیجه</h2>
            {error && <p className="error">{error}</p>}
            {!chart && !error && <p className="muted">مشخصات تولد را وارد و «محاسبه چارت» را بزنید.</p>}
            {chart && (
              <>
                <p className="muted">
                  {chart.ascendant && <>طالع: {chart.ascendant.sign_fa} ({chart.ascendant.degree_in_sign.toFixed(2)}°) • </>}
                  {chart.moon_nakshatra && <>ناکشاترای قمر: {chart.moon_nakshatra.name} پادا {chart.moon_nakshatra.pada} • </>}
                  آیانامشا: {chart.ayanamsa_lahiri.toFixed(3)}° • منبع: {chart.ephemeris_flag}
                </p>
                {!chart.ascendant && (
                  <p className="muted">ساعت تولد نامعلوم است — طالع، خانه‌ها و داشا بدون مبنای معتبر تولید نمی‌شوند.</p>
                )}
                {chart.ascendant && (
                  <>
                    <div className="mode-toggle" role="group" aria-label="انتخاب وارگا">
                      <button type="button" className={mode === 'D1' ? 'active' : ''}
                        onClick={() => setMode('D1')}>D1 — دشانه</button>
                      <button type="button" className={mode === 'D9' ? 'active' : ''}
                        onClick={() => setMode('D9')}>D9 — ناوامشا</button>
                    </div>
                    <NorthChart chart={chart} mode={mode} />
                  </>
                )}
                <h3>سیارات ({mode})</h3>
                <table>
                  <thead><tr><th>سیاره</th><th>برج</th><th>درجه</th><th>خانه</th><th>وضعیت</th><th>ناوامشا</th></tr></thead>
                  <tbody>
                    {chart.planets.map((p) => {
                      const signIdx = mode === 'D9' ? p.d9_sign_index : p.sign_index;
                      const ascIdx = chart.ascendant
                        ? (mode === 'D9' ? chart.ascendant.d9_sign_index : chart.ascendant.sign_index)
                        : null;
                      const house = ascIdx === null ? null : (signIdx - ascIdx + 12) % 12 + 1;
                      return (
                        <tr key={p.name}>
                          <td>{PLANET_FA[p.name] ?? p.name}</td>
                          <td>{mode === 'D9' ? SIGN_FA[p.d9_sign_index] : p.sign_fa}</td>
                          <td>{(mode === 'D9' ? p.d9_longitude % 30 : p.degree_in_sign).toFixed(2)}°</td>
                          <td>{house ?? '—'}</td>
                          <td>{p.retrograde ? 'رجعی' : 'مستقیم'}</td>
                          <td>{p.d9_sign} ({p.d9_longitude.toFixed(1)}°)</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {chart.dasha && (
                  <>
                    <h3>ویمشوتاری داشا (ماهاداشا)</h3>
                    <table>
                      <thead><tr><th>دوره</th><th>شروع</th><th>پایان</th><th>سال</th></tr></thead>
                      <tbody>
                        {chart.dasha.mahadashas.slice(0, 6).map((m) => (
                          <tr key={m.lord + m.start}>
                            <td>{PLANET_FA[m.lord] ?? m.lord}{m.balance ? ' (باقی‌مانده تولد)' : ''}</td>
                            <td dir="ltr">{m.start}</td>
                            <td dir="ltr">{m.end}</td>
                            <td>{m.years}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </>
            )}
          </section>
        </main>
      ) : (
        <Dashboard />
      )}
    </div>
  );
}
