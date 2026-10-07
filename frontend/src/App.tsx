import { useState } from 'react';
import BirthForm, { type BirthState } from './components/BirthForm';
import NorthChart from './components/NorthChart';
import { computeChart, PLANET_FA, type ChartResult } from './api';
import './styles.css';

export default function App() {
  const [chart, setChart] = useState<ChartResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (b: BirthState) => {
    setLoading(true); setError('');
    try {
      const r = await computeChart({
        calendar: 'jalali', year: b.year, month: b.month, day: b.day,
        hour: b.hour, minute: b.minute, tz_offset: b.tz_offset, lat: b.lat, lon: b.lon,
      });
      setChart(r.chart);
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
      <main className="layout">
        <BirthForm onSubmit={submit} loading={loading} />
        <section className="card">
          <h2>نتیجه</h2>
          {error && <p className="error">{error}</p>}
          {!chart && !error && <p className="muted">مشخصات تولد را وارد و «محاسبه چارت» را بزنید.</p>}
          {chart && (
            <>
              <p className="muted">
                طالع: {chart.ascendant.sign_fa} ({chart.ascendant.degree_in_sign.toFixed(2)}°) •
                ناکشاترای قمر: {chart.moon_nakshatra.name} پادا {chart.moon_nakshatra.pada} •
                آیانامشا: {chart.ayanamsa_lahiri.toFixed(3)}° • منبع: {chart.ephemeris_flag}
              </p>
              <NorthChart chart={chart} />
              <h3>سیارات (D1)</h3>
              <table>
                <thead><tr><th>سیاره</th><th>برج</th><th>درجه</th><th>خانه</th><th>وضعیت</th><th>ناوامشا</th></tr></thead>
                <tbody>
                  {chart.planets.map((p) => (
                    <tr key={p.name}>
                      <td>{PLANET_FA[p.name] ?? p.name}</td>
                      <td>{p.sign_fa}</td>
                      <td>{p.degree_in_sign.toFixed(2)}°</td>
                      <td>{p.house}</td>
                      <td>{p.retrograde ? 'رجعی' : 'مستقیم'}</td>
                      <td>{p.d9_sign} ({p.d9_longitude.toFixed(1)}°)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
        </section>
      </main>
    </div>
  );
}
