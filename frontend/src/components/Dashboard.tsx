import { useState, useEffect } from 'react';
import { searchCities } from '../api';

export interface BirthState {
  year: number; month: number; day: number;
  hour: number; minute: number;
  lat: number; lon: number; tz_offset: number;
  cityLabel: string;
}

export interface Profile {
  id: string; birth: BirthState; createdAt: string;
}

const STORAGE_KEY = 'vedic_profiles';

function loadProfiles(): Profile[] {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
}
function saveProfiles(list: Profile[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

function signLabel(lon: number): string {
  const n = ['حمل','ثور','جوزا','سرطان','اسد','سنبله','میزان','عقرب','قوس','جدی','دلو','حوت'];
  return n[Math.floor(lon / 30)] + ` (${(lon % 30).toFixed(1)}°)`;
}

export default function Dashboard() {
  const [profiles, setProfiles] = useState<Profile[]>(loadProfiles());
  const [tab, setTab] = useState<'list'|'compare'>('list');
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');
  const [synastry, setSynastry] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [cities, setCities] = useState<any[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [newProfile, setNewProfile] = useState<BirthState>({
    year: 1375, month: 5, day: 12, hour: 10, minute: 30,
    lat: 35.6892, lon: 51.389, tz_offset: 3.5, cityLabel: 'تهران'
  });

  // city search
  useEffect(() => {
    if (!citySearch.trim()) { setCities([]); return; }
    const t = setTimeout(async () => {
      setCityLoading(true);
      try { const res = await searchCities(citySearch); setCities(res ?? []); } catch { setCities([]); }
      setCityLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [citySearch]);

  const handleAddProfile = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/chart/compute', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ calendar: 'jalali', ...newProfile, hour: newProfile.hour, minute: newProfile.minute }),
      });
      if (!res.ok) throw new Error('خطا در محاسبه چارت');
      const profile: Profile = { id: Date.now().toString(), birth: newProfile, createdAt: new Date().toISOString() };
      const next = [...profiles, profile];
      setProfiles(next); saveProfiles(next);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleDelete = (id: string) => {
    const next = profiles.filter(p => p.id !== id);
    setProfiles(next); saveProfiles(next);
  };

  const handleCitySelect = (c: any) => {
    setNewProfile(p => ({ ...p, lat: c.lat, lon: c.lon, tz_offset: c.tz_offset, cityLabel: c.name_fa }));
    setCities([]); setCitySearch('');
  };

  const handleCompare = async () => {
    if (!compareA || !compareB) return;
    setLoading(true); setError(''); setSynastry(null);
    try {
      const a = profiles.find(p => p.id === compareA)!;
      const b = profiles.find(p => p.id === compareB)!;
      const res = await fetch('/api/chart/synastry', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          a: { calendar: 'jalali', ...a.birth, hour: a.birth.hour, minute: a.birth.minute },
          b: { calendar: 'jalali', ...b.birth, hour: b.birth.hour, minute: b.birth.minute },
        }),
      });
      if (!res.ok) throw new Error('خطا در سیناستری');
      const data = await res.json();
      setSynastry(data.synastry);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="wrap">
      <header>
        <h1>داشبورد طالع‌بینی</h1>
        <p className="muted">مدیریت پروفایل‌های تولد، مقایسه سیناستری و تنظیمات محاسبات</p>
      </header>

      <nav className="layout" style={{ gap: 8, marginBottom: 16 }}>
        <button className={tab === 'list' ? 'active' : ''} onClick={() => setTab('list')}>پروفایل‌ها</button>
        <button className={tab === 'compare' ? 'active' : ''} onClick={() => setTab('compare')}>مقایسه سیناستری</button>
      </nav>

      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      {/* Tab: List */}
      {tab === 'list' && (
        <div className="layout">
          <section className="card" style={{ width: '100%' }}>
            <h2>اضافه کردن تولد جدید</h2>
            <div className="grid">
              <label>سال (شمسی)
                <input type="number" min={1200} max={2100} value={newProfile.year} onChange={e => setNewProfile(p => ({...p, year: +e.target.value}))} />
              </label>
              <label>ماه
                <input type="number" min={1} max={12} value={newProfile.month} onChange={e => setNewProfile(p => ({...p, month: +e.target.value}))} />
              </label>
              <label>روز
                <input type="number" min={1} max={31} value={newProfile.day} onChange={e => setNewProfile(p => ({...p, day: +e.target.value}))} />
              </label>
              <label>ساعت
                <input type="number" min={0} max={23} value={newProfile.hour} onChange={e => setNewProfile(p => ({...p, hour: +e.target.value}))} />
              </label>
              <label>دقیقه
                <input type="number" min={0} max={59} value={newProfile.minute} onChange={e => setNewProfile(p => ({...p, minute: +e.target.value}))} />
              </label>
              <label>UTC offset
                <input type="number" step={0.5} value={newProfile.tz_offset} onChange={e => setNewProfile(p => ({...p, tz_offset: +e.target.value}))} />
              </label>
            </div>
            <label className="full">شهر
              <input value={citySearch} onChange={e => setCitySearch(e.target.value)} placeholder="نام شهر..." />
            </label>
            {cityLoading && <span className="muted">در حال جستجو...</span>}
            {cities.length > 0 && (
              <ul className="cities" style={{ maxHeight: 120, overflowY: 'auto' }}>
                {cities.map(c => (
                  <li key={c.name_fa}>
                    <button type="button" onClick={() => handleCitySelect(c)}>{c.name_fa}</button>
                  </li>
                ))}
              </ul>
            )}
            <label className="full muted">مکان فعلی: {newProfile.cityLabel} — {newProfile.lat.toFixed(3)}, {newProfile.lon.toFixed(3)}</label>
            <button disabled={loading} onClick={handleAddProfile}>{loading ? 'در حال محاسبه...' : 'ذخیره و محاسبه چارت'}</button>
          </section>

          <section className="card" style={{ width: '100%' }}>
            <h2>پروفایل‌های ذخیره‌شده ({profiles.length})</h2>
            {profiles.length === 0 && <p className="muted">هنوز پروفایلی ثبت نشده</p>}
            {profiles.map(p => (
              <div key={p.id} className="card" style={{ margin: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{p.birth.cityLabel}</strong>
                  <span className="muted"> — {p.birth.year}/{p.birth.month}/{p.birth.day} {p.birth.hour}:{String(p.birth.minute).padStart(2,'0')} UTC{p.birth.tz_offset >= 0 ? '+' : ''}{p.birth.tz_offset}</span>
                  <br />
                  <span className="muted">{new Date(p.createdAt).toLocaleDateString('fa-IR')}</span>
                </div>
                <button type="button" onClick={() => handleDelete(p.id)}>حذف</button>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* Tab: Synastry */}
      {tab === 'compare' && (
        <div className="layout">
          <section className="card" style={{ width: '100%' }}>
            <h2>مقایسه دو چارت</h2>
            <label className="full">چارت اول (مرجع)
              <select value={compareA} onChange={e => setCompareA(e.target.value)}>
                <option value="">-- انتخاب --</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.birth.cityLabel} {p.birth.year}/{p.birth.month}/{p.birth.day}</option>)}
              </select>
            </label>
            <label className="full">چارت دوم
              <select value={compareB} onChange={e => setCompareB(e.target.value)}>
                <option value="">-- انتخاب --</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.birth.cityLabel} {p.birth.year}/{p.birth.month}/{p.birth.day}</option>)}
              </select>
            </label>
            <button disabled={loading || !compareA || !compareB} onClick={handleCompare}>
              {loading ? 'در حال محاسبه...' : 'مقایسه'}
            </button>

            {synastry && (
              <div style={{ marginTop: 16 }}>
                <h3>نتیجه سیناستری</h3>
                <p className="muted">نقطه مشترک: {synastry.shared_points?.length ?? 0} — تعارض: {synastry.conflicts?.length ?? 0}</p>
                {synastry.compatibility && (
                  <div className="card" style={{ marginTop: 8 }}>
                    <strong>سازگاری کلی:</strong> {synastry.compatibility}
                  </div>
                )}
                {synastry.details && synastry.details.length > 0 && (
                  <table style={{ marginTop: 8 }}>
                    <thead><tr><th>نقطه</th><th>چارت A</th><th>چارت B</th><th>نوع</th></tr></thead>
                    <tbody>
                      {synastry.details.map((d: any, i: number) => (
                        <tr key={i}>
                          <td>{d.point ?? d.body ?? '-'}</td>
                          <td>{d.sign_a ?? d.position_a ?? '-'}</td>
                          <td>{d.sign_b ?? d.position_b ?? '-'}</td>
                          <td>{d.type ?? d.aspect ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}