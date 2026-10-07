export interface Planet {
  name: string; longitude: number; sign_index: number; sign: string; sign_fa: string;
  degree_in_sign: number; house: number; retrograde: boolean; speed: number;
  d9_sign_index: number; d9_sign: string; d9_longitude: number;
}

export interface House { house: number; sign_index: number; sign: string; sign_fa: string; lord: string; }

export interface ChartResult {
  ayanamsa_lahiri: number; ephemeris_flag: string; julian_day_ut: number;
  ascendant: { longitude: number; sign_index: number; sign: string; sign_fa: string; degree_in_sign: number };
  planets: Planet[]; houses_whole_sign: House[];
  moon_nakshatra: { index: number; name: string; pada: number; lord: string };
  dasha: {
    birth_nakshatra: { name: string; pada: number; lord: string };
    balance_years: number;
    mahadashas: { lord: string; start: string; end: string; years: number; balance: boolean }[];
  };
}

export const PLANET_FA: Record<string, string> = {
  Sun: 'شمس', Moon: 'قمر', Mars: 'مریخ', Mercury: 'عطارد', Jupiter: 'مشتری',
  Venus: 'زهره', Saturn: 'زحل', Rahu: 'راهو', Ketu: 'کیتو',
};

const API = '/api';

export async function computeChart(payload: Record<string, unknown>): Promise<{ input_gregorian: object; chart: ChartResult }> {
  const r = await fetch(`${API}/chart/compute`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err?.detail?.message ?? `خطای سرور (${r.status})`);
  }
  return r.json();
}

export async function searchCities(q: string) {
  const r = await fetch(`${API}/cities?q=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error('خطا در جست‌وجوی شهر');
  const j = await r.json();
  return j.items as { name_fa: string; name_en: string; lat: number; lon: number; tz_offset: number }[];
}
