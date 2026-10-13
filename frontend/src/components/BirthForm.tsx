import { useEffect, useState } from 'react'
import { Loader2, MapPin, Search } from 'lucide-react'
import { searchCities } from '../api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface BirthState {
  calendar: 'jalali' | 'gregorian'
  year: number
  month: number
  day: number
  hour: number
  minute: number
  lat: number
  lon: number
  tz_offset: number
  /** IANA zone — the backend derives the real (historical/DST) offset from it */
  tz: string
  cityLabel: string
  /** false = the birth hour is unknown; the chart is then computed without time-based parts */
  timeKnown?: boolean
}

const DEFAULTS: BirthState = {
  calendar: 'jalali',
  year: 1375,
  month: 5,
  day: 12,
  hour: 10,
  minute: 30,
  lat: 35.6892,
  lon: 51.389,
  tz_offset: 3.5,
  tz: 'Asia/Tehran',
  cityLabel: 'تهران',
  timeKnown: true,
}

interface CityOption {
  name_fa: string
  name_en?: string
  country?: string
  tz?: string
  lat: number
  lon: number
  tz_offset: number
}

const STORE_KEY = 'ab_birth'

/** Last submitted birth data, shared by every page (best effort — storage may be blocked). */
export function loadSavedBirth(): BirthState | null {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : null
  } catch {
    return null
  }
}

export function saveBirth(b: BirthState) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(b))
  } catch {
    /* storage unavailable: the app keeps working without persistence */
  }
}

function validate(f: BirthState, needTime: boolean): string {
  const int = (n: number) => Number.isInteger(n)
  if (!int(f.year) || f.year < 1200 || f.year > 1500) return 'سال شمسی را بین ۱۲۰۰ تا ۱۵۰۰ وارد کنید.'
  if (!int(f.month) || f.month < 1 || f.month > 12) return 'ماه باید عددی از ۱ تا ۱۲ باشد.'
  const maxDay = f.month <= 6 ? 31 : 30
  if (!int(f.day) || f.day < 1 || f.day > maxDay) return `روز این ماه باید بین ۱ تا ${maxDay} باشد.`
  if (needTime) {
    if (!int(f.hour) || f.hour < 0 || f.hour > 23) return 'ساعت باید عددی از ۰ تا ۲۳ باشد.'
    if (!int(f.minute) || f.minute < 0 || f.minute > 59) return 'دقیقه باید عددی از ۰ تا ۵۹ باشد.'
  }
  return ''
}

export default function BirthForm({
  onSubmit,
  loading,
  showTime = true,
  allowUnknownTime = false,
  submitLabel = 'محاسبه چارت',
  title = 'مشخصات تولد',
}: {
  onSubmit: (b: BirthState) => void
  loading: boolean
  /** hide hour/minute (e.g. when the time itself is being estimated) */
  showTime?: boolean
  /** offer a «birth hour unknown» switch (only on pages that handle time-less charts) */
  allowUnknownTime?: boolean
  submitLabel?: string
  title?: string
}) {
  const [f, setF] = useState<BirthState>(() => loadSavedBirth() ?? DEFAULTS)
  const [q, setQ] = useState('')
  const [opts, setOpts] = useState<CityOption[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [error, setError] = useState('')
  const [picked, setPicked] = useState(true)

  const set = (k: keyof BirthState, v: number | string) =>
    setF((s) => ({ ...s, [k]: v }))

  useEffect(() => {
    if (!q.trim() || picked) {
      setOpts([])
      return
    }
    let cancelled = false
    const t = setTimeout(async () => {
      setSearching(true)
      setSearchError(false)
      try {
        const res = await searchCities(q)
        if (!cancelled) setOpts(res ?? [])
      } catch {
        if (!cancelled) {
          setOpts([])
          setSearchError(true)
        }
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [q, picked])

  const pickCity = (c: CityOption) => {
    setF((s) => ({
      ...s,
      lat: c.lat,
      lon: c.lon,
      tz_offset: c.tz_offset,
      tz: c.tz ?? s.tz,
      cityLabel: c.name_fa,
    }))
    setOpts([])
    setQ(c.name_fa)
    setPicked(true)
  }

  const numberField = (
    label: string,
    key: 'year' | 'month' | 'day' | 'hour' | 'minute',
    min?: number,
    max?: number,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={`bf-${key}`} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={`bf-${key}`}
        type="number"
        inputMode="numeric"
        className="num h-11 text-center"
        min={min}
        max={max}
        value={Number.isNaN(f[key]) ? '' : f[key]}
        onChange={(e) => set(key, e.target.value === '' ? NaN : Number(e.target.value))}
      />
    </div>
  )
return (
    <form
      className="vedic-card p-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        const msg = validate(f, showTime && f.timeKnown !== false)
        if (msg) {
          setError(msg)
          return
        }
        setError('')
        saveBirth(f)
        onSubmit(f)
      }}
    >
      <header className="mb-6">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          تاریخ شمسی و شهر محل تولد را وارد کنید.
        </p>
      </header>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {numberField('سال', 'year')}
          {numberField('ماه', 'month', 1, 12)}
          {numberField('روز', 'day', 1, 31)}
          {showTime && f.timeKnown !== false && numberField('ساعت', 'hour', 0, 23)}
          {showTime && f.timeKnown !== false && numberField('دقیقه', 'minute', 0, 59)}
        </div>

        {showTime && allowUnknownTime && (
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="size-4 accent-[hsl(var(--primary))]"
              checked={f.timeKnown === false}
              onChange={(e) => setF((s) => ({ ...s, timeKnown: !e.target.checked }))}
            />
            ساعت تولدم را نمی‌دانم
          </label>
        )}
        {showTime && f.timeKnown === false && (
          <p className="rounded-xl border border-primary/25 bg-primary/10 px-3.5 py-2.5 text-xs leading-6 text-foreground/90">
            بدون ساعت تولد، طالع و خانه‌ها محاسبه نمی‌شوند؛ چارت با ماه به‌جای طالع (چاندرا لگنا) و ظهر محلی ساخته می‌شود.
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="bf-city" className="text-xs text-muted-foreground">
            جست‌وجوی شهر
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="bf-city"
              value={q}
              placeholder="مثلاً تهران…"
              onChange={(e) => {
                setQ(e.target.value)
                setPicked(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && opts.length > 0 && !picked) {
                  e.preventDefault()
                  pickCity(opts[0])
                }
              }}
              className="h-11 pr-9"
              autoComplete="off"
            />
          </div>

          {opts.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2" role="listbox" aria-label="نتایج شهر">
              {opts.map((c) => (
                <li key={`${c.name_fa}-${c.country ?? ''}-${c.lat}-${c.lon}`}>
                  <button
                    type="button"
                    onClick={() => pickCity(c)}
                    className="rounded-full border border-border bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-accent hover:text-accent-foreground"
                  >
                    {c.name_fa}
                    {c.country && c.country !== 'IR' && (
                      <span className="mr-1.5 text-[10px] opacity-60" dir="ltr">
                        {c.name_en ? `${c.name_en}, ` : ''}
                        {c.country}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!searching && !picked && q.trim() && opts.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {searchError
                ? 'جست‌وجوی شهر انجام نشد؛ اتصال به سرور را بررسی کنید.'
                : 'شهری پیدا نشد؛ املای دیگری یا نام انگلیسی را امتحان کنید.'}
            </p>
          )}
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" aria-hidden="true" />
          <p className="num">
            شهر: <span className="font-medium text-foreground">{f.cityLabel}</span>
            <br />
            {f.lat.toFixed(3)}, {f.lon.toFixed(3)} (UTC
            {f.tz_offset >= 0 ? '+' : ''}
            {f.tz_offset})
            {searching && <span className="mr-2 opacity-60">در حال جست‌وجو…</span>}
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="vedic-gradient h-12 w-full text-base shadow-lg shadow-brand-950/40 transition-all duration-300 hover:brightness-110"
        >
          {loading ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              در حال محاسبه…
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  )
}