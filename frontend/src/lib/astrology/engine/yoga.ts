import { getRashi } from "../signs"
import { DOSHAS, YOGAS } from "../dosha"
import type { GrahaKey, PlanetPlacement, SignKey, YogaDosh } from "../types"
import { EXTRA } from "./yoga-extra"
import { grahaAspects, isConjunct, type GrahaAspect } from "./aspects"

const SIGNS: SignKey[] = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
]
const KENDRA = [1, 4, 7, 10]
const TRIKONA = [5, 9]
const DUSTHANA = [6, 8, 12]
const REAL: GrahaKey[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]
const BENEFICS: GrahaKey[] = ["jupiter", "venus", "mercury"]
const MALEFICS: GrahaKey[] = ["sun", "mars", "saturn", "rahu", "ketu"]

export interface Ctx {
  p: Record<GrahaKey, PlanetPlacement>
  lagna: SignKey
  /** house of `g` counted from the Moon */
  fromMoon: (g: GrahaKey) => number
  /** graha ruling house `h` */
  lordOf: (h: number) => GrahaKey
  /** both grahas occupy the same sign (the classical "yuti") */
  same: (a: GrahaKey, b: GrahaKey) => boolean
  /** degree-based conjunction within the aspect orb */
  conjunct: (a: GrahaKey, b: GrahaKey) => boolean
  lon: (g: GrahaKey) => number
  /** classical drishti value cast by `from` onto `to` (0–1, 0 = no aspect) */
  aspectValue: (from: GrahaKey, to: GrahaKey) => number
  aspects: GrahaAspect[]
}

const FIVE: GrahaKey[] = ["mars", "mercury", "jupiter", "venus", "saturn"]

interface Rule {
  test: (c: Ctx) => boolean
  planets: (c: Ctx) => GrahaKey[]
}

// ───── combination helpers (kept as functions so `test` and `planets` agree)

const rajaPairs = (c: Ctx): GrahaKey[] => {
  const out: GrahaKey[] = []
  for (const k of [4, 7, 10].map(c.lordOf))
    for (const t of [5, 9].map(c.lordOf))
      if (k !== t && (c.same(k, t) || (c.aspectValue(k, t) >= 1 && c.aspectValue(t, k) >= 1))) out.push(k, t)
  return [...new Set(out)]
}

const dhanaPairs = (c: Ctx): GrahaKey[] => {
  const out: GrahaKey[] = []
  for (const [a, b] of [[2, 11], [5, 9], [2, 5], [9, 11]] as const) {
    const x = c.lordOf(a)
    const y = c.lordOf(b)
    if (x !== y && (c.same(x, y) || (c.aspectValue(x, y) >= 1 && c.aspectValue(y, x) >= 1))) out.push(x, y)
  }
  return [...new Set(out)]
}

const mahapurusha = (c: Ctx): GrahaKey[] =>
  FIVE.filter((g) => {
    const q = c.p[g]
    return (q.dignity === "exalted" || q.dignity === "own") && KENDRA.includes(q.house)
  })

const neecha = (c: Ctx): GrahaKey[] => REAL.filter((g) => c.p[g].debilitated)

const RULES: Record<string, Rule> = {
  "Gaja Kesari Yoga": {
    test: (c) => KENDRA.includes(c.fromMoon("jupiter")) || c.aspectValue("jupiter", "moon") >= 1,
    planets: () => ["jupiter", "moon"],
  },
  "Chandra Mangala Yoga": {
    test: (c) => c.same("moon", "mars"),
    planets: () => ["moon", "mars"],
  },
  "Budha Aditya Yoga": {
    test: (c) => c.same("sun", "mercury"),
    planets: () => ["sun", "mercury"],
  },
  "Raja Yoga": { test: (c) => rajaPairs(c).length > 0, planets: rajaPairs },
  "Dhana Yoga": { test: (c) => dhanaPairs(c).length > 0, planets: dhanaPairs },
  "Pancha Mahapurusha": { test: (c) => mahapurusha(c).length > 0, planets: mahapurusha },
  "Kemadruma Yoga": {
    // Classical: no graha (other than the Sun) in the 1st, 2nd or 12th from the Moon.
    test: (c) => !REAL.some((g) => g !== "sun" && g !== "moon" && [1, 2, 12].includes(c.fromMoon(g))),
    planets: () => ["moon"],
  },
  "Neecha Yoga": { test: (c) => neecha(c).length > 0, planets: neecha },
  "Manglik Dosha": {
    test: (c) => [1, 2, 4, 7, 8, 12].includes(c.p.mars.house),
    planets: () => ["mars"],
  },
  "Kaal Sarp Dosha": {
    test: (c) => {
      const r = c.lon("rahu")
      const off = REAL.map((g) => (((c.lon(g) - r) % 360) + 360) % 360)
      return off.every((o) => o < 180) || off.every((o) => o > 180)
    },
    planets: () => [...REAL],
  },
  "Pitru Dosha": {
    test: (c) =>
      c.same("sun", "rahu") || c.same("sun", "ketu") || c.same("sun", "saturn") ||
      c.p.rahu.house === 9 || c.p.ketu.house === 9,
    planets: (c) => {
      const out: GrahaKey[] = ["sun"]
      if (c.same("sun", "rahu")) out.push("rahu")
      if (c.same("sun", "ketu")) out.push("ketu")
      if (c.same("sun", "saturn")) out.push("saturn")
      if (c.p.rahu.house === 9) out.push("rahu")
      if (c.p.ketu.house === 9) out.push("ketu")
      return [...new Set(out)]
    },
  },
  "Shrapit Yoga": {
    test: (c) => c.same("saturn", "rahu"),
    planets: () => ["saturn", "rahu"],
  },
}

export function makeCtx(placements: PlanetPlacement[], lagna: SignKey): Ctx {
  const p = Object.fromEntries(placements.map((x) => [x.graha, x])) as Ctx["p"]
  const li = SIGNS.indexOf(lagna)
  const signIndexOf = (g: GrahaKey) => SIGNS.indexOf(p[g].sign)
  const lon = (g: GrahaKey) => signIndexOf(g) * 30 + p[g].degreeInSign
  const aspects = grahaAspects(placements, (x) => SIGNS.indexOf(x.sign))
  const drishti = new Map<string, number>()
  for (const a of aspects) {
    const k = `${a.from}>${a.to}`
    drishti.set(k, Math.max(drishti.get(k) ?? 0, a.drishti))
  }
  return {
    p,
    lagna,
    fromMoon: (g) => ((p[g].house - p.moon.house + 12) % 12) + 1,
    lordOf: (h) => getRashi(SIGNS[(li + h - 1) % 12]).lord,
    same: (a, b) => p[a].sign === p[b].sign,
    conjunct: (a, b) => isConjunct(p[a], p[b], (x) => SIGNS.indexOf(x.sign)),
    lon,
    aspectValue: (from, to) => drishti.get(`${from}>${to}`) ?? 0,
    aspects,
  }
}

// ───── chart-derived strength

const DIGNITY_SCORE: Record<PlanetPlacement["dignity"], number> = {
  exalted: 30, own: 20, friendly: 10, neutral: 0, enemy: -10, debilitated: -25,
}
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/**
 * How well one graha carries a combination: dignity, house placement,
 * retrograde state and the aspects it receives. 0–100.
 */
export function grahaScore(c: Ctx, g: GrahaKey): number {
  const p = c.p[g]
  if (!p) return 50
  let s = 50 + DIGNITY_SCORE[p.dignity]
  const h = p.house
  if (TRIKONA.includes(h)) s += 12
  else if (KENDRA.includes(h)) s += 8
  else if (DUSTHANA.includes(h)) s -= 10
  if (p.retrograde) s -= 5
  for (const a of c.aspects) {
    if (a.to !== g) continue
    const w = a.strength * 6
    if (BENEFICS.includes(a.from)) s += w
    else if (MALEFICS.includes(a.from)) s -= w
  }
  return clamp(s, 0, 100)
}

/** Mean strength of the grahas that carry a combination. */
export function combinationScore(c: Ctx, grahas: GrahaKey[]): number {
  const list = grahas.filter((g) => c.p[g])
  if (list.length === 0) return 50
  return Math.round(list.reduce((n, g) => n + grahaScore(c, g), 0) / list.length)
}

const strengthFromScore = (score: number): YogaDosh["strength"] =>
  score >= 65 ? "strong" : score >= 42 ? "moderate" : "weak"

const withScore = (def: YogaDosh, c: Ctx, grahas: GrahaKey[]): YogaDosh => {
  const score = combinationScore(c, grahas)
  return { ...def, score, strength: strengthFromScore(score) }
}

/** Evaluates every classical combination against the actual chart. */
export function evaluateYogas(
  placements: PlanetPlacement[],
  lagna: SignKey
): { yogas: YogaDosh[]; doshas: YogaDosh[] } {
  const ctx = makeCtx(placements, lagna)
  const detected: YogaDosh[] = []

  for (const def of [...YOGAS, ...DOSHAS]) {
    const rule = RULES[def.name]
    if (!rule?.test(ctx)) continue
    detected.push(withScore(def, ctx, rule.planets(ctx)))
  }
  for (const e of EXTRA) {
    if (!e.test(ctx)) continue
    detected.push(withScore(e.def, ctx, e.planets(ctx)))
  }

  return {
    yogas: detected.filter((y) => y.kind === "yoga"),
    doshas: detected.filter((y) => y.kind === "dosha"),
  }
}

/** Every combination the engine can detect (for reference pages). */
export const ALL_COMBINATIONS: YogaDosh[] = [...YOGAS, ...DOSHAS, ...EXTRA.map((e) => e.def)]
