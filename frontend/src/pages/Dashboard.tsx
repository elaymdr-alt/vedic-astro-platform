import { useState, useEffect } from 'react'
import { searchCities } from '../api'
import { authFetch, getToken, onAuthChange } from '../lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import ReportsPanel from '@/components/ReportsPanel'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import {
  Users, Calendar, Star, TrendingUp, Activity, Heart,
  Sun, Moon, Sparkles, Clock, DollarSign, Shield,
  CheckCircle2, XCircle, BookOpen, GitCompare,
} from 'lucide-react'

const CHART_COLORS = {
  charts: 'hsl(var(--brand-400))',
  readings: 'hsl(var(--gold-400))',
  value: 'hsl(var(--brand-400))',
  name: 'hsl(var(--foreground))',
}

export interface BirthState {
  year: number; month: number; day: number;
  hour: number; minute: number;
  lat: number; lon: number; tz_offset: number;
  cityLabel: string;
}

export interface Profile {
  id: string; birth: BirthState; createdAt: string;
}

const STORAGE_KEY = 'vedic_profiles'
function loadProfiles(): Profile[] {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : [] } catch { return [] }
}
function saveProfiles(list: Profile[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) }

const PLANET_FA: Record<string, string> = {
  Sun: 'شمس', Moon: 'قمر', Mars: 'مریخ', Mercury: 'عطارد', Jupiter: 'مشتری',
  Venus: 'زهره', Saturn: 'زحل', Rahu: 'راهو', Ketu: 'کیتو',
}
const SIGN_FA = ['حمل','ثور','جوزا','سرطان','اسد','سنبله','میزان','عقرب','قوس','جدی','دلو','حوت']
const COLORS = ['#c8102e','#7f0a1d','#f05b6e','#e08a1e','#a50d26','#ff9ca7','#5e0715','#dc2640','#b45309','#f59e0b','#8f0a1f','#ffc9cf']

const monthlyStats = [
  { month: 'فروردین', charts: 12, readings: 8, premium: 3 },
  { month: 'اردیبهشت', charts: 19, readings: 14, premium: 7 },
  { month: 'خرداد', charts: 15, readings: 11, premium: 5 },
  { month: 'تیر', charts: 22, readings: 16, premium: 8 },
  { month: 'مرداد', charts: 18, readings: 12, premium: 6 },
  { month: 'شهریور', charts: 25, readings: 18, premium: 10 },
]

const planetDistribution = [
  { name: 'شمس', value: 85 },
  { name: 'قمر', value: 72 },
  { name: 'مریخ', value: 45 },
  { name: 'عطارد', value: 38 },
  { name: 'مشتری', value: 65 },
  { name: 'زهره', value: 55 },
]

const recentActivity = [
  { action: 'محاسبه چارت جدید', time: '۱۰ دقیقه پیش', type: 'chart' },
  { action: 'بروزرسانی پروفایل', time: '۲ ساعت پیش', type: 'profile' },
  { action: 'مشاهده داشا', time: '۵ ساعت پیش', type: 'reading' },
  { action: 'مقایسه سیناستری', time: '۱ روز پیش', type: 'compare' },
  { action: 'ترجمه روزانه', time: '۲ روز پیش', type: 'daily' },
]

function StatCard({ icon: Icon, label, value, trend, color }: {
  icon: any; label: string; value: string | number; trend?: string; color: string
}) {
  return (
    <Card className="vedic-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
          {trend && <p className="text-xs mt-1 text-green-600 dark:text-green-400">{trend}</p>}
        </div>
        <div className="h-12 w-12 rounded-full bg-brand-500/15 ring-1 ring-brand-400/25 flex items-center justify-center">
          <Icon className="h-6 w-6" style={{ color }} />
        </div>
      </div>
    </Card>
  )
}

function ActivityItem({ action, time, type }: { action: string; time: string; type: string }) {
  const icons: Record<string, any> = { chart: Star, profile: Users, reading: BookOpen, compare: GitCompare, daily: Calendar }
  const Icon = icons[type] || Star
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 ring-1 ring-brand-400/25">
        <Icon className="h-4 w-4 text-brand-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{action}</p>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [profiles, setProfiles] = useState<Profile[]>(loadProfiles())
  const [tab, setTab] = useState<'overview'|'charts'|'compare'>('overview')
  const [reportsFor, setReportsFor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [citySearch, setCitySearch] = useState('')
  const [cities, setCities] = useState<any[]>([])
  const [cityLoading, setCityLoading] = useState(false)
  const [newProfile, setNewProfile] = useState<BirthState>({
    year: 1375, month: 5, day: 12, hour: 10, minute: 30,
    lat: 35.6892, lon: 51.389, tz_offset: 3.5, cityLabel: 'تهران'
  })
  const [compareA, setCompareA] = useState('')
  const [compareB, setCompareB] = useState('')
  const [synastry, setSynastry] = useState<any>(null)
  const [showResult, setShowResult] = useState(false)
  const [chartResult, setChartResult] = useState<any>(null)

  // logged in: the server is the source of truth for saved profiles
  const [token, setTok] = useState<string | null>(getToken())
  useEffect(() => onAuthChange(() => setTok(getToken())), [])
  useEffect(() => {
    if (!token) return
    authFetch('/profiles').then(async (r) => {
      if (!r.ok) return
      const rows: any[] = await r.json()
      setProfiles(rows.map((p) => ({
        id: String(p.id), createdAt: new Date().toISOString(),
        birth: { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute,
                 lat: p.lat, lon: p.lon, tz_offset: p.tz_offset, cityLabel: p.display_name },
      })))
    }).catch(() => {})
  }, [token])

  useEffect(() => {
    if (!citySearch.trim()) { setCities([]); return }
    const t = setTimeout(async () => {
      setCityLoading(true)
      try { const res = await searchCities(citySearch); setCities(res ?? []) } catch { setCities([]) }
      setCityLoading(false)
    }, 200)
    return () => clearTimeout(t)
  }, [citySearch])

  const handleCompute = async () => {
    setLoading(true); setError(''); setShowResult(false)
    try {
      const res = await fetch('/api/chart/compute', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ calendar: 'jalali', ...newProfile, hour: newProfile.hour, minute: newProfile.minute }),
      })
      if (!res.ok) throw new Error('خطا در محاسبه چارت')
      const data = await res.json()
      setChartResult(data.chart)
      let id = Date.now().toString()
      if (getToken()) {
        const name = `${newProfile.cityLabel} • ${newProfile.year}/${newProfile.month}/${newProfile.day} ${newProfile.hour}:${String(newProfile.minute).padStart(2, '0')}`
        const sr = await authFetch('/profiles', { method: 'POST', body: JSON.stringify({
          display_name: name, calendar: 'jalali', year: newProfile.year, month: newProfile.month, day: newProfile.day,
          hour: newProfile.hour, minute: newProfile.minute, tz_offset: newProfile.tz_offset, lat: newProfile.lat, lon: newProfile.lon,
        }) })
        if (sr.ok) id = String((await sr.json()).id)
        else if (sr.status !== 409) throw new Error('ذخیره پروفایل روی سرور انجام نشد')
      }
      const profile: Profile = { id, birth: newProfile, createdAt: new Date().toISOString() }
      const next = [...profiles.filter((p) => p.id !== id), profile]
      setProfiles(next); saveProfiles(next)
      setShowResult(true)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const handleDelete = (id: string) => {
    const next = profiles.filter(p => p.id !== id)
    setProfiles(next); saveProfiles(next)
    if (getToken() && /^\d+$/.test(id)) void authFetch(`/profiles/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  const handleCitySelect = (c: any) => {
    setNewProfile(p => ({ ...p, lat: c.lat, lon: c.lon, tz_offset: c.tz_offset, cityLabel: c.name_fa }))
    setCities([]); setCitySearch('')
  }

  const handleCompare = async () => {
    if (!compareA || !compareB) return
    setLoading(true); setError(''); setSynastry(null)
    try {
      const a = profiles.find(p => p.id === compareA)!
      const b = profiles.find(p => p.id === compareB)!
      const res = await fetch('/api/chart/synastry', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          a: { calendar: 'jalali', ...a.birth, hour: a.birth.hour, minute: a.birth.minute },
          b: { calendar: 'jalali', ...b.birth, hour: b.birth.hour, minute: b.birth.minute },
        }),
      })
      if (!res.ok) throw new Error('خطا در سیناستری')
      const data = await res.json()
      setSynastry(data.synastry)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const chartData = chartResult ? [
    { name: 'شمس', value: chartResult.planets.find((p:any) => p.name === 'Sun')?.degree_in_sign || 0 },
    { name: 'قمر', value: chartResult.planets.find((p:any) => p.name === 'Moon')?.degree_in_sign || 0 },
    { name: 'مریخ', value: chartResult.planets.find((p:any) => p.name === 'Mars')?.degree_in_sign || 0 },
    { name: 'عطارد', value: chartResult.planets.find((p:any) => p.name === 'Mercury')?.degree_in_sign || 0 },
    { name: 'مشتری', value: chartResult.planets.find((p:any) => p.name === 'Jupiter')?.degree_in_sign || 0 },
    { name: 'زهره', value: chartResult.planets.find((p:any) => p.name === 'Venus')?.degree_in_sign || 0 },
    { name: 'زحل', value: chartResult.planets.find((p:any) => p.name === 'Saturn')?.degree_in_sign || 0 },
    { name: 'راهو', value: chartResult.planets.find((p:any) => p.name === 'Rahu')?.degree_in_sign || 0 },
    { name: 'کیتو', value: chartResult.planets.find((p:any) => p.name === 'Ketu')?.degree_in_sign || 0 },
  ].filter((d: any) => d.value > 0) : []

  return (
    <div className=" bg-background p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold vedic-text-gradient mb-2">داشبورد</h1>
        <p className="text-muted-foreground">نمای کلی چارت‌ها، آمار و فعالیت‌های اخیر</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard icon={Users} label="پروفایل‌ها" value={profiles.length} trend="+12% از ماه گذشته" color="#9333ea" />
        <StatCard icon={Calendar} label="چارت‌های امروز" value={8} trend="+5 نسبت به دیروز" color="#f59e0b" />
        <StatCard icon={Star} label="داشاها" value={14} trend="3 فعال" color="#6366f1" />
        <StatCard icon={TrendingUp} label="نرخ رشد" value="23%" trend="نسبت به ماه قبل" color="#ec4899" />
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'overview' ? 'default' : 'outline'} onClick={() => setTab('overview')}>
          <Activity className="ml-2 h-4 w-4" /> نظار کلی
        </Button>
        <Button variant={tab === 'charts' ? 'default' : 'outline'} onClick={() => setTab('charts')}>
          <Star className="ml-2 h-4 w-4" /> چارت‌ها
        </Button>
        <Button variant={tab === 'compare' ? 'default' : 'outline'} onClick={() => setTab('compare')}>
          <GitCompare className="ml-2 h-4 w-4" /> مقایسه
        </Button>
      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="vedic-card">
              <CardHeader>
                <CardTitle>آمار ماهانه</CardTitle>
                <CardDescription>تعداد چارت‌ها و خوانش‌ها در ۶ ماه اخیر</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-[300px] w-full" config={{ charts: { label: 'چارت‌ها' }, readings: { label: 'خوانش‌ها' } }}>
                  <AreaChart data={monthlyStats} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillCharts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.charts} stopOpacity={0.45} />
                        <stop offset="95%" stopColor={CHART_COLORS.charts} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="fillReadings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.readings} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={CHART_COLORS.readings} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} width={32} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="charts"
                      stroke={CHART_COLORS.charts}
                      fill="url(#fillCharts)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="readings"
                      stroke={CHART_COLORS.readings}
                      fill="url(#fillReadings)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="vedic-card">
              <CardHeader>
                <CardTitle>توزیع سیارات</CardTitle>
                <CardDescription>پراکندگی سیارات در نقشه‌ها</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-[300px] w-full" config={{ value: { label: 'درصد' } }}>
                    <PieChart>
                      <Pie
                        data={planetDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={88}
                        paddingAngle={3}
                        strokeWidth={0}
                        label={({ name }) => name}
                      >
                        {planetDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    </PieChart>
                  </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="vedic-card">
            <CardHeader>
              <CardTitle>فعالیت اخیر</CardTitle>
              <CardDescription>آخرین اقدامات شما</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {recentActivity.map((item, i) => (
                  <ActivityItem key={i} action={item.action} time={item.time} type={item.type} />
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        )}

      {/* Charts Tab */}
      {tab === 'charts' && (
        <div className="space-y-6">
          <Card className="vedic-card">
            <CardHeader>
              <CardTitle>افزودن چارت جدید</CardTitle>
              <CardDescription>مشخصات تولد را وارد کنید</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Label>سال</Label>
                  <Input type="number" value={newProfile.year} onChange={e => setNewProfile({...newProfile, year: +e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>ماه</Label>
                  <Input type="number" min={1} max={12} value={newProfile.month} onChange={e => setNewProfile({...newProfile, month: +e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>روز</Label>
                  <Input type="number" min={1} max={31} value={newProfile.day} onChange={e => setNewProfile({...newProfile, day: +e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>ساعت</Label>
                  <Input type="number" min={0} max={23} value={newProfile.hour} onChange={e => setNewProfile({...newProfile, hour: +e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>دقیقه</Label>
                  <Input type="number" min={0} max={59} value={newProfile.minute} onChange={e => setNewProfile({...newProfile, minute: +e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>شهر</Label>
                  <Input value={citySearch} onChange={e => setCitySearch(e.target.value)} placeholder="جست‌وجوی شهر..." />
                  {cities.length > 0 && (
                    <ul className="absolute z-10 bg-card border rounded-lg mt-1 max-h-40 overflow-auto">
                      {cities.map((c, i) => (
                        <li key={i} className="p-2 hover:bg-accent cursor-pointer text-sm" onClick={() => handleCitySelect(c)}>
                          {c.name_fa}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button onClick={handleCompute} disabled={loading} className="bg-brand-600 hover:bg-brand-700">
                {loading ? 'در حال محاسبه...' : 'محاسبه چارت'}
              </Button>
            </CardContent>
          </Card>

          {showResult && chartResult && (
            <Card className="vedic-card">
              <CardHeader>
                <CardTitle>نتیجه چارت</CardTitle>
                <CardDescription>
                  {chartResult.ascendant && (
                    <>
                      طالع: {chartResult.ascendant.sign_fa} ({chartResult.ascendant.degree_in_sign.toFixed(2)}°) •{' '}
                      ناکشاترای قمر: {chartResult.moon_nakshatra?.name} پادا {chartResult.moon_nakshatra?.pada} •{' '}
                      آیانامشا: {chartResult.ayanamsa_lahiri.toFixed(3)}°
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-[300px] w-full" config={{ value: { label: 'درجه در برج' } }}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} width={32} domain={[0, 30]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="value"
                      fill={CHART_COLORS.value}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={38}
                    />
                  </BarChart>
                </ChartContainer>
                <div className="mt-4 overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="p-2 text-right">سیاره</th>
                        <th className="p-2 text-right">برج</th>
                        <th className="p-2 text-right">درجه</th>
                        <th className="p-2 text-right">وضعیت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartResult.planets.map((p: any) => (
                        <tr key={p.name} className="border-b">
                          <td className="p-2">{PLANET_FA[p.name] ?? p.name}</td>
                          <td className="p-2">{p.sign_fa}</td>
                          <td className="p-2">{p.degree_in_sign.toFixed(2)}°</td>
                          <td className="p-2">{p.retrograde ? 'رجعی' : 'مستقیم'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="vedic-card">
            <CardHeader>
              <CardTitle>پروفایل‌های ذخیره‌شده ({profiles.length})</CardTitle>
              <CardDescription>لیست چارت‌های محاسبه شده</CardDescription>
            </CardHeader>
            <CardContent>
              {profiles.length === 0 ? (
                <p className="text-muted-foreground text-sm">هنوز پروفایلی ثبت نشده</p>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="p-2 text-right">شهر</th>
                        <th className="p-2 text-right">تاریخ</th>
                        <th className="p-2 text-right">ساعت</th>
                        <th className="p-2 text-right">اقدامات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.map(p => (
                        <tr key={p.id} className="border-b">
                          <td className="p-2">{p.birth.cityLabel}</td>
                          <td className="p-2">{p.birth.year}/{p.birth.month}/{p.birth.day}</td>
                          <td className="p-2">{String(p.birth.hour).padStart(2,'0')}:{String(p.birth.minute).padStart(2,'0')}</td>
                          <td className="p-2">
                            <div className="flex gap-1">
                              {token && /^\d+$/.test(p.id) && (
                                <Button variant="ghost" size="sm"
                                  onClick={() => setReportsFor(reportsFor === p.id ? null : p.id)}>گزارش‌ها</Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}>حذف</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {reportsFor && /^\d+$/.test(reportsFor) && (() => {
                const p = profiles.find((x) => x.id === reportsFor)
                return p ? (
                  <div className="mt-3">
                    <ReportsPanel profileId={Number(p.id)} label={`${p.birth.cityLabel} ${p.birth.year}/${p.birth.month}/${p.birth.day}`} />
                  </div>
                ) : null
              })()}
            </CardContent>
          </Card>
        </div>
        )}

      </div>

      {/* Compare Tab */}
      {tab === 'compare' && (
        <Card className="vedic-card">
          <CardHeader>
            <CardTitle>مقایسه دو چارت</CardTitle>
            <CardDescription>انتخاب دو پروفایل برای مقایسه سیناستری</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>چارت اول (مرجع)</Label>
                <select value={compareA} onChange={e => setCompareA(e.target.value)} className="w-full p-2 border rounded-lg">
                  <option value="">-- انتخاب --</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.birth.cityLabel} {p.birth.year}/{p.birth.month}/{p.birth.day}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>چارت دوم</Label>
                <select value={compareB} onChange={e => setCompareB(e.target.value)} className="w-full p-2 border rounded-lg">
                  <option value="">-- انتخاب --</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.birth.cityLabel} {p.birth.year}/{p.birth.month}/{p.birth.day}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button onClick={handleCompare} disabled={loading || !compareA || !compareB} className="bg-brand-600 hover:bg-brand-700">
              {loading ? 'در حال محاسبه...' : 'مقایسه'}
            </Button>
            {synastry && (
              <div className="mt-4 space-y-4">
                <div className="p-4 rounded-lg border border-brand-400/25 bg-brand-500/10">
                  <p className="font-medium">نقطه مشترک: {synastry.shared_points?.length ?? 0}</p>
                  <p className="font-medium">تعارض: {synastry.conflicts?.length ?? 0}</p>
                  {synastry.compatibility && (
                    <Badge className="mt-2 bg-green-100 text-green-800">سازگاری: {synastry.compatibility}</Badge>
                  )}
                </div>
                {synastry.details && synastry.details.length > 0 && (
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="p-2 text-right">نقطه</th>
                          <th className="p-2 text-right">چارت A</th>
                          <th className="p-2 text-right">چارت B</th>
                          <th className="p-2 text-right">نوع</th>
                        </tr>
                      </thead>
                      <tbody>
                        {synastry.details.map((d: any, i: number) => (
                          <tr key={i} className="border-b">
                            <td className="p-2">{d.point ?? d.body ?? '-'}</td>
                            <td className="p-2">{d.sign_a ?? d.position_a ?? '-'}</td>
                            <td className="p-2">{d.sign_b ?? d.position_b ?? '-'}</td>
                            <td className="p-2">{d.type ?? d.aspect ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
