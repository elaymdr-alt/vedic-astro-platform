export interface Planet {
  name: string; longitude: number; sign_index: number; sign: string; sign_fa: string;
  degree_in_sign: number; house: number | null; retrograde: boolean; speed: number;
  d9_sign_index: number; d9_sign: string; d9_longitude: number;
}

export interface House { house: number; sign_index: number; sign: string; sign_fa: string; lord: string; }

export interface Ascendant {
  longitude: number; sign_index: number; sign: string; sign_fa: string; degree_in_sign: number;
  d9_sign_index: number; d9_sign: string; d9_longitude: number;
}

export interface ChartResult {
  ayanamsa_lahiri: number; ephemeris_flag: string; julian_day_ut: number;
  time_precision: 'exact' | 'approximate' | 'unknown';
  time_sensitive_omitted: string[];
  reference_time: string | null;
  /** null when time_precision === 'unknown' (P05-T05) */
  ascendant: Ascendant | null;
  /** Sidereal Midheaven; null when time_precision === 'unknown' */
  midheaven: { longitude: number; sign_index: number } | null;
  planets: Planet[];
  houses_whole_sign: House[] | null;
  moon_nakshatra: { index: number; name: string; pada: number; lord: string } | null;
  dasha: {
    birth_nakshatra: { name: string; pada: number; lord: string };
    balance_years: number;
    mahadashas: { lord: string; start: string; end: string; years: number; balance: boolean }[];
  } | null;
}

export const PLANET_FA: Record<string, string> = {
  Sun: 'شمس', Moon: 'قمر', Mars: 'مریخ', Mercury: 'عطارد', Jupiter: 'مشتری',
  Venus: 'زهره', Saturn: 'زحل', Rahu: 'راهو', Ketu: 'کیتو',
};

export const SIGN_FA = ['حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله',
  'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'];

import { friendlyError } from './lib/net';

const API = '/api';

async function post<T>(path: string, payload: unknown): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }).catch((e) => { throw new Error(friendlyError(e)); });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err?.detail?.message ?? (typeof err?.detail === 'string' ? err.detail : `خطای سرور (${r.status})`));
  }
  return r.json();
}

export async function computeChart(payload: Record<string, unknown>): Promise<{ input_gregorian: object; chart: ChartResult }> {
  const r = await fetch(`${API}/chart/compute`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    const d = err?.detail;
    // FastAPI validation errors arrive as a list of {loc, msg}
    const msg = d?.message ?? (typeof d === 'string' ? d : Array.isArray(d) ? 'مقادیر واردشده معتبر نیستند؛ تاریخ، ساعت و شهر را دوباره بررسی کنید.' : '');
    throw new Error(msg || `خطای سرور (${r.status})`);
  }
  return r.json();
}

export async function lifeAreas(payload: Record<string, unknown>) {
  return post<import('./components/reading/area-reports').LifeAreasReport>('/chart/areas', payload);
}

export async function searchCities(q: string) {
  const r = await fetch(`${API}/cities?q=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error('خطا در جست‌وجوی شهر');
  const j = await r.json();
  return j.items as { name_fa: string; name_en: string; country?: string; lat: number; lon: number; tz_offset: number; tz?: string }[];
}

/* ------------------------------------------------------------ rectification */
export interface RectifyEvent {
  type: string; calendar: 'jalali' | 'gregorian'; year: number; month: number; day: number;
  precision: 'day' | 'month' | 'year';
}
export interface RectifyResult {
  candidates_evaluated: number; step_minutes: number; events_used: number;
  lagna_probabilities: { sign: string; sign_fa: string; probability: number; best_time: string; window: [string, string] }[];
  best: { time: string; lagna_fa: string; moon_nakshatra: string; posterior: number; score: number };
  credible_window: { from: string; to: string; mass: number; total_mass: number };
  credible_ranges: { from: string; to: string; mass: number }[];
  significance: { p_value: number | null; permutations: number; informative: boolean };
  explanation: {
    type: string; label_fa: string; date: string; precision: string; event_houses: number[];
    dasha: { mahadasha: string; antardasha: string; pratyantar: string }; supports: number;
    jupiter_house: number; saturn_house: number;
  }[];
  curve: { time: string; score: number; posterior: number }[];
  warnings: string[]; disclaimer: string;
}

export const rectify = (payload: Record<string, unknown>) => post<RectifyResult>('/rectify', payload);

export async function rectifyEventTypes() {
  const r = await fetch(`${API}/rectify/event-types`);
  if (!r.ok) throw new Error('خطا در دریافت نوع رویدادها');
  return (await r.json()).items as { type: string; label_fa: string; houses: number[] }[];
}

/* -------------------------------------------------------------------- daily */
export interface DailyResult {
  date: string; limited: boolean;
  panchang: {
    weekday: string; vara_lord_fa: string; sunrise: string; sunset: string; moon_sign_fa: string;
    tithi: { name: string; number: number; paksha: string; ends: string };
    nakshatra: { name: string; pada: number; lord: string; ends: string };
    yoga: { name: string; harsh: boolean }; karana: { name: string; harsh: boolean };
    avoid: Record<'rahu_kala' | 'yamaganda' | 'gulika', { from: string; to: string }>;
    abhijit_muhurta: { from: string; to: string };
  };
  personal: {
    score: number; level: 'green' | 'amber' | 'red'; level_fa: string;
    chandra_bala: { house_from_moon: number; good: boolean };
    tara_bala: { number: number; name_fa: string; good: boolean };
    areas: { key: string; label_fa: string; score: number; level: 'green' | 'amber' | 'red'; level_fa: string }[];
    gochara: { planet: string; planet_fa: string; house: number; verdict: string; verdict_fa: string }[];
  };
  dasha: {
    summary_fa: string;
    levels: { level: string; lord_fa: string; from: string; to: string; theme_fa: string; advice_fa: string; focus_areas_fa?: string[] }[];
  };
  hora: { from: string; to: string; lord_fa: string; night: boolean; favourable: boolean; use_fa: string }[];
  best_horas: { from: string; to: string; lord_fa: string; use_fa: string }[];
  outlook: {
    days: { date: string; score: number; level: 'green' | 'amber' | 'red'; level_fa: string }[];
    best_days: Record<string, { date: string; score: number }[]>;
    caution_days: { date: string; score: number }[];
  };
  notes: string[];
}

export const daily = (payload: Record<string, unknown>) => post<DailyResult>('/daily', payload);

/* ------------------------------------------------------------- perspectives */
export interface PerspectiveLens { id: string; title: string; subtitle: string; agent: string }
export interface PerspectiveReport extends PerspectiveLens {
  text: string
  sources: { ref: string; title: string; source: string; page: number | null; kind: string }[]
  error: string | null
}
export interface PerspectivesResult {
  generated_at: string
  model: string
  focus: string
  reports: PerspectiveReport[]
}

export const perspectivesStatus = async (): Promise<{ configured: boolean; model: string; lenses: PerspectiveLens[] }> => {
  const r = await fetch(`${API}/perspectives/status`)
  if (!r.ok) throw new Error('خطا در وضعیت سه نگاه')
  return r.json()
}

export const perspectives = (payload: Record<string, unknown>) => post<PerspectivesResult>('/perspectives', payload);
