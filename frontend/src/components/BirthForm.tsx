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
}

interface CityOption {
  name_fa: string
  tz?: string
  lat: number
  lon: number
  tz_offset: number
}

export default function BirthForm({
  onSubmit,
  loading,
}: {
  onSubmit: (b: BirthState) => void
  loading: boolean
}) {
  const [f, setF] = useState<BirthState>(DEFAULTS)
  const [q, setQ] = useState('')
  const [opts, setOpts] = useState<CityOption[]>([])
  const [searching, setSearching] = useState(false)

  const set = (k: keyof BirthState, v: number | string) =>
    setF((s) => ({ ...s, [k]: v }))

  useEffect(() => {
    if (!q.trim()) {
      setOpts([])
      return
    }
    let cancelled = false
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchCities(q)
        if (!cancelled) setOpts(res ?? [])
      } catch {
        if (!cancelled) setOpts([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [q])

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
        value={f[key]}
        onChange={(e) => set(key, Number(e.target.value))}
      />
    </div>
  )
return (
    <form
      className="vedic-card p-6"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(f)
      }}
    >
      <header className="mb-6">
        <h2 className="text-lg font-bold">مشخصات تولد</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          تاریخ شمسی و شهر محل تولد را وارد کنید.
        </p>
      </header>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {numberField('سال', 'year')}
          {numberField('ماه', 'month', 1, 12)}
          {numberField('روز', 'day', 1, 31)}
          {numberField('ساعت', 'hour', 0, 23)}
          {numberField('دقیقه', 'minute', 0, 59)}
        </div>

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
              onChange={(e) => setQ(e.target.value)}
              className="h-11 pr-9"
              autoComplete="off"
            />
          </div>

          {opts.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2" role="listbox" aria-label="نتایج شهر">
              {opts.map((c) => (
                <li key={c.name_fa}>
                  <button
                    type="button"
                    onClick={() => pickCity(c)}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-muted-foreground transition-all duration-200 hover:border-brand-400/40 hover:bg-brand-500/10 hover:text-brand-200"
                  >
                    {c.name_fa}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
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
            'محاسبه چارت'
          )}
        </Button>
      </div>
    </form>
  )
}