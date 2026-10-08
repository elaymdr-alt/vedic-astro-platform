import { VIMSHOTTARI_ORDER, VIMSHOTTARI_YEARS } from "../nakshatra"
import type { FortuneLevel, GrahaKey, NatalChart } from "../types"

const DAY = 86_400_000
const YEAR = 365.25 * DAY
const NAK = 360 / 27

const LEVEL: Record<GrahaKey, FortuneLevel> = {
  jupiter: "green", venus: "green", mercury: "green", moon: "green",
  sun: "amber", mars: "amber", saturn: "red", rahu: "red", ketu: "red",
}

export interface DashaPeriod {
  graha: GrahaKey
  from: string
  to: string
  level: FortuneLevel
}

/** Full ISO timestamp (seconds precision) — sub-days periods must stay distinct. */
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 19) + "Z"

/** Vimshottari Mahadashas (one full 120-year cycle) from the Moon's longitude. */
export function vimshottari(moonLon: number, birth: Date): DashaPeriod[] {
  const idx = Math.floor(moonLon / NAK) % 27
  const elapsed = (moonLon % NAK) / NAK
  const first = idx % 9
  let t = birth.getTime() - elapsed * VIMSHOTTARI_YEARS[VIMSHOTTARI_ORDER[first]] * YEAR

  return Array.from({ length: 9 }, (_, i) => {
    const graha = VIMSHOTTARI_ORDER[(first + i) % 9]
    const from = t
    t += VIMSHOTTARI_YEARS[graha] * YEAR
    return { graha, from: iso(from), to: iso(t), level: LEVEL[graha] }
  })
}

/** Antardashas inside one Mahadasha. */
export function antardashas(maha: DashaPeriod): DashaPeriod[] {
  const start = Date.parse(maha.from)
  const total = Date.parse(maha.to) - start
  const first = VIMSHOTTARI_ORDER.indexOf(maha.graha)
  let t = start
  return Array.from({ length: 9 }, (_, i) => {
    const graha = VIMSHOTTARI_ORDER[(first + i) % 9]
    const from = t
    t += (total * VIMSHOTTARI_YEARS[graha]) / 120
    return { graha, from: iso(from), to: iso(t), level: LEVEL[graha] }
  })
}

export function activeDasha(chart: NatalChart, now: Date = new Date()) {
  const ms = now.getTime()
  const maha =
    chart.dashas.find((d) => ms >= Date.parse(d.from) && ms < Date.parse(d.to)) ??
    chart.dashas[chart.dashas.length - 1]
  const antar = antardashas(maha).find((d) => ms >= Date.parse(d.from) && ms < Date.parse(d.to))
  return { maha, antar }
}

// ───── Yogini dasha (36-year cycle, repeated to cover ~108 years)

const YOGINI: { name: string; graha: GrahaKey; years: number }[] = [
  { name: "منگلا", graha: "moon", years: 1 },
  { name: "پینگلا", graha: "sun", years: 2 },
  { name: "دانیا", graha: "jupiter", years: 3 },
  { name: "بهرامری", graha: "mars", years: 4 },
  { name: "بهدریکا", graha: "mercury", years: 5 },
  { name: "اولکا", graha: "saturn", years: 6 },
  { name: "سیددها", graha: "venus", years: 7 },
  { name: "سنکتا", graha: "rahu", years: 8 },
]

export interface YoginiPeriod extends DashaPeriod {
  name: string
}

export function yoginiDashas(moonLon: number, birth: Date): YoginiPeriod[] {
  const nakNo = (Math.floor(moonLon / NAK) % 27) + 1 // 1..27
  const first = ((nakNo + 3) % 8 || 8) - 1
  const elapsed = (moonLon % NAK) / NAK
  let t = birth.getTime() - elapsed * YOGINI[first].years * YEAR

  return Array.from({ length: 24 }, (_, i) => {
    const y = YOGINI[(first + i) % 8]
    const from = t
    t += y.years * YEAR
    return { name: y.name, graha: y.graha, from: iso(from), to: iso(t), level: LEVEL[y.graha] }
  })
}

/** Current Mahadasha → Antardasha → Pratyantar → Sookshma chain. */
export function activeDashaChain(chart: NatalChart, now: Date = new Date()): DashaPeriod[] {
  const ms = now.getTime()
  const inside = (d: DashaPeriod) => ms >= Date.parse(d.from) && ms < Date.parse(d.to)
  const chain: DashaPeriod[] = []
  let level: DashaPeriod | undefined =
    chart.dashas.find(inside) ?? chart.dashas[chart.dashas.length - 1]
  for (let depth = 0; depth < 4 && level; depth++) {
    chain.push(level)
    level = antardashas(level).find(inside)
  }
  return chain
}
