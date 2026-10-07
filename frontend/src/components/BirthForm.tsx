import { useEffect, useState } from 'react';
import { searchCities } from '../api';

export interface BirthState {
  year: number; month: number; day: number;
  hour: number; minute: number;
  lat: number; lon: number; tz_offset: number;
  cityLabel: string;
}

const DEFAULTS: BirthState = {
  year: 1375, month: 5, day: 12, hour: 10, minute: 30,
  lat: 35.6892, lon: 51.389, tz_offset: 3.5, cityLabel: 'تهران',
};

export default function BirthForm({ onSubmit, loading }: {
  onSubmit: (b: BirthState) => void; loading: boolean;
}) {
  const [f, setF] = useState<BirthState>(DEFAULTS);
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState<{ name_fa: string; lat: number; lon: number; tz_offset: number }[]>([]);
  const set = (k: keyof BirthState, v: number | string) =>
    setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!q.trim()) { setOpts([]); return; }
    const t = setTimeout(() => {
      searchCities(q).then(setOpts).catch(() => setOpts([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <form
      className="card"
      onSubmit={(e) => { e.preventDefault(); onSubmit(f); }}
    >
      <h2>مشخصات تولد</h2>
      <div className="grid">
        <label>سال (شمسی)<input type="number" value={f.year} onChange={(e) => set('year', +e.target.value)} /></label>
        <label>ماه<input type="number" min={1} max={12} value={f.month} onChange={(e) => set('month', +e.target.value)} /></label>
        <label>روز<input type="number" min={1} max={31} value={f.day} onChange={(e) => set('day', +e.target.value)} /></label>
        <label>ساعت<input type="number" min={0} max={23} value={f.hour} onChange={(e) => set('hour', +e.target.value)} /></label>
        <label>دقیقه<input type="number" min={0} max={59} value={f.minute} onChange={(e) => set('minute', +e.target.value)} /></label>
      </div>
      <label className="full">جست‌وجوی شهر
        <input value={q} placeholder="مثلاً تهران…" onChange={(e) => setQ(e.target.value)} />
      </label>
      {opts.length > 0 && (
        <ul className="cities">
          {opts.map((c) => (
            <li key={c.name_fa}>
              <button type="button" onClick={() => {
                setF((s) => ({ ...s, lat: c.lat, lon: c.lon, tz_offset: c.tz_offset, cityLabel: c.name_fa }));
                setOpts([]); setQ(c.name_fa);
              }}>{c.name_fa}</button>
            </li>
          ))}
        </ul>
      )}
      <p className="muted">شهر انتخاب‌شده: {f.cityLabel} — {f.lat.toFixed(3)}، {f.lon.toFixed(3)} (UTC{f.tz_offset >= 0 ? '+' : ''}{f.tz_offset})</p>
      <button type="submit" disabled={loading}>{loading ? 'در حال محاسبه…' : 'محاسبه چارت'}</button>
    </form>
  );
}
