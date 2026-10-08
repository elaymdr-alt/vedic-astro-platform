/**
 * Scoring signals — the honest replacement for invented percentages.
 *
 * Spec §18 bans random percentages, so every number this file emits is the
 * output of a documented formula over CALCULATED data, and each `GrahaSignal`
 * keeps the components that produced it so the UI can render the arithmetic.
 *
 * Graha strength is a weighted mean of four normalised components. The weights
 * are declared, not hidden, in `WEIGHTS`:
 *
 *   • `dignity`   (0.30) — exaltation / own sign / friendship, from the
 *                           `PlanetPlacement.dignity` the engine already computes.
 *   • `house`     (0.25) — classical bhava category (kendra / trikona / …).
 *   • `drishti`   (0.20) — aspects *received*, weighted by exactness.
 *   • `shadbala`  (0.25) — real virupa strength from `engine/bala`, when present.
 *
 * Rahu and Ketu have no shadbala, so their weights are renormalised over the
 * remaining components rather than being silently penalised.
 */

import { SIGN_KEYS } from "../chart"
import { faNum } from "../format"
import { ELEMENT_LABELS, getRashi, MODALITY_LABELS, RASHIS } from "../signs"
import { getBhava } from "../houses"
import { grahaBala } from "../engine/bala"
import { aspectsOn, conjunctionStrength } from "../engine/aspects"
import type { NatalChart, PlanetPlacement } from "../types"
import type { BalanceSlice, GrahaSignal, HouseEmphasis, LordPlacement, StrengthParts } from "./types"

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const round = (n: number) => Math.round(n)

/** Component weights. Must sum to 1 once renormalised. */
export const WEIGHTS = {
  dignity: 0.3,
  house: 0.25,
  drishti: 0.2,
  shadbala: 0.25,
} as const

/** Dignity → 0–1. Derived from the classical exaltation/own/friend scale. */
export const DIGNITY_SCORE: Record<PlanetPlacement["dignity"], number> = {
  exalted: 1,
  own: 0.85,
  friendly: 0.7,
  neutral: 0.5,
  enemy: 0.3,
  debilitated: 0.15,
}

export const DIGNITY_FA: Record<PlanetPlacement["dignity"], string> = {
  exalted: "شکوه",
  own: "برج خودش",
  friendly: "برج دوست",
  neutral: "برج خنثی",
  enemy: "برج دشمن",
  debilitated: "سقوط",
}

/** Classical bhava grouping. A house may appear in more than one row. */
export const HOUSE_GROUPS: { key: string; fa: string; houses: number[]; score: number }[] = [
  { key: "kendra", fa: "کندرا (زاویه‌ای)", houses: [1, 4, 7, 10], score: 1 },
  { key: "trikona", fa: "تریکونا (مثلثی)", houses: [1, 5, 9], score: 0.9 },
  { key: "upachaya", fa: "اپاچایا (رشد)", houses: [3, 6, 10, 11], score: 0.6 },
  { key: "dusthana", fa: "دوشانا (چالش‌زا)", houses: [6, 8, 12], score: 0.3 },
  { key: "marana", fa: "مارانا (فرسایشی)", houses: [2, 7], score: 0.35 },
]

/** Best (strongest) classical group a house belongs to. */
export function houseGroupScore(house: number): { score: number; fa: string } {
  let best = { score: 0.5, fa: "خانه‌ی میانی" }
  for (const g of HOUSE_GROUPS) {
    if (g.houses.includes(house) && g.score > best.score) best = { score: g.score, fa: g.fa }
  }
  return best
}

/** Aspect reception: sum of (classical drishti × how exact the angle is). */
function receptionScore(chart: NatalChart, placement: PlanetPlacement): number {
  const received = aspectsOn(placement.graha, chart.placements, (p) => SIGN_KEYS.indexOf(p.sign))
  let total = 0
  for (const a of received) {
    if (a.from === placement.graha) continue
    total += a.drishti * (0.5 + 0.5 * a.tightness)
  }
  return clamp01(total / 2.5)
}

/**
 * Element / modality balance.
 *
 * Weights each graha by its `GrahaSignal.score`, then expresses the total as a
 * share. A planet therefore counts for more when it is genuinely strong, which
 * is what makes this different from a raw head-count of signs.
 */
export function balance(
  chart: NatalChart,
  signals: GrahaSignal[],
  pick: (p: PlanetPlacement) => { fa: string; accent: string },
): BalanceSlice[] {
  const weightOf = new Map(signals.map((s) => [s.graha, s.score]))
  const buckets = new Map<string, { fa: string; accent: string; weight: number; count: number }>()

  for (const p of chart.placements) {
    const { fa, accent } = pick(p)
    const b = buckets.get(fa) ?? { fa, accent, weight: 0, count: 0 }
    b.weight += weightOf.get(p.graha) ?? 0
    b.count += 1
    buckets.set(fa, b)
  }

  const total = [...buckets.values()].reduce((s, b) => s + b.weight, 0) || 1
  return [...buckets.values()]
    .map((b) => ({ key: b.fa, fa: b.fa, accent: b.accent, percent: round((b.weight / total) * 100), count: b.count }))
    .sort((a, b) => b.percent - a.percent)
}

/** Strongest-sign weighted element distribution. */
export function elementBalance(chart: NatalChart, signals: GrahaSignal[]): BalanceSlice[] {
  const byKey = new Map(RASHIS.map((r) => [r.key, r]))
  return balance(chart, signals, (p) => {
    const r = byKey.get(p.sign)
    return { fa: ELEMENT_LABELS[r?.element ?? "fire"].fa, accent: ELEMENT_LABELS[r?.element ?? "fire"].accent }
  })
}

/** Same weighting, grouped by modality (cardinal / fixed / mutable). */
export function modalityBalance(chart: NatalChart, signals: GrahaSignal[]): BalanceSlice[] {
  const byKey = new Map(RASHIS.map((r) => [r.key, r]))
  return balance(chart, signals, (p) => {
    const m = byKey.get(p.sign)?.modality ?? "cardinal"
    return { fa: MODALITY_LABELS[m].fa, accent: MODALITY_LABELS[m].hint === "آغازگر" ? "chart-4" : "chart-3" }
  })
}

/**
 * House emphasis, 0–100.
 *
 * Three observable inputs, no invention:
 *   • Ashtakavarga bindu — the classical scoring the engine already computes
 *     (337 total, average ≈ 28).
 *   • Occupancy — how many grahas sit in the house (0, 1, 2, 3+).
 *   • Classical group — kendra/trikona houses score above dusthana.
 */
export function houseEmphasis(chart: NatalChart): HouseEmphasis[] {
  const avg = chart.ashtakavarga.reduce((s, b) => s + b, 0) / 12 || 1

  return Array.from({ length: 12 }, (_, i) => {
    const house = i + 1
    const bindu = chart.ashtakavarga[i] ?? 0
    const occupants = chart.placements.filter((p) => p.house === house)
    const count = occupants.length

    // Bindu: maps the observed 12–45 range onto 0–1 instead of a bare ratio.
    const binduScore = clamp01((bindu - avg * 0.5) / (avg * 1.2))
    const countScore = clamp01(count / 3)
    const groupScore = (houseGroupScore(house).score - 0.3) / 0.7

    const score = round(100 * (0.55 * binduScore + 0.3 * countScore + 0.15 * clamp01(groupScore)))
    const bhava = getBhava(house)
    return {
      house,
      score,
      bindu,
      count,
      fa: bhava.fa,
      keyword: bhava.keyword,
    }
  })
}

/**
 * Lord placements — where each bhava lord actually sits.
 * A lord in its own bhava is a classical strength; this is computed, not asserted.
 */
export function lordPlacements(chart: NatalChart, signals: GrahaSignal[]): LordPlacement[] {
  const byKey = new Map(RASHIS.map((r) => [r.key, r]))
  const strengthOf = new Map(signals.map((s) => [s.graha, s.score]))
  const houseOf = new Map(chart.placements.map((p) => [p.graha, p.house]))
  const signOf = new Map(chart.placements.map((p) => [p.graha, p.sign]))

  return Array.from({ length: 12 }, (_, i) => {
    const house = i + 1
    const sign = chart.placements.length ? signForHouse(chart, house) : ("aries" as const)
    const lord = byKey.get(sign)?.lord ?? "sun"
    const lordHouse = houseOf.get(lord) ?? house
    return {
      house,
      lord,
      lordHouse,
      lordSign: signOf.get(lord) ?? sign,
      ownBhava: lordHouse === house,
      strength: strengthOf.get(lord) ?? 0,
    }
  })
}

/** Which sign occupies a bhava, derived from the ascendant sign (whole-sign). */
function signForHouse(chart: NatalChart, house: number): PlanetPlacement["sign"] {
  const start = SIGN_KEYS.indexOf(chart.lagna)
  return SIGN_KEYS[(start + house - 1) % 12]
}
/**
 * Full strength signal for every graha, sorted strongest-first.
 * Pure function of `chart` — no dates, no randomness, no clock.
 */
export function grahaSignals(chart: NatalChart): GrahaSignal[] {
  const balas = chart.balas ?? grahaBala(chart.placements, (p) => SIGN_KEYS.indexOf(p.sign))
  const balaByGraha = new Map(balas.map((b) => [b.graha, b.percent / 100]))

  const signals = chart.placements.map((placement): GrahaSignal => {
    const house = houseGroupScore(placement.house)
    const parts: StrengthParts = {
      dignity: DIGNITY_SCORE[placement.dignity],
      house: house.score,
      aspect: receptionScore(chart, placement),
      conjunction: conjunctionSupport(chart, placement),
      shadbala: balaByGraha.get(placement.graha) ?? 0,
    }

    // Nodes have no shadbala → drop that weight and renormalise.
    const hasBala = balaByGraha.has(placement.graha)
    const w = { ...WEIGHTS, shadbala: hasBala ? WEIGHTS.shadbala : 0 }
    const totalW = w.dignity + w.house + w.drishti + w.shadbala
    const score = round(
      100 *
        ((parts.dignity * w.dignity +
          parts.house * w.house +
          parts.aspect * w.drishti +
          parts.shadbala * w.shadbala) /
          totalW)
    )

    const reasons: string[] = []
    // `placement.sign` is the machine key (`pisces`, `cancer`); interpolating it
    // would print English in the middle of a Persian sentence. `getRashi` is
    // the same lookup `synthesis.ts` uses, so there is no second naming rule.
    reasons.push(
      `${DIGNITY_FA[placement.dignity]} — ${faNum(round(parts.dignity * 100))}٪ در برج ${getRashi(placement.sign).fa}`
    )
    reasons.push(`${house.fa} — خانه‌ی ${faNum(placement.house)}، ${faNum(round(parts.house * 100))}٪`)
    if (parts.aspect > 0.05) {
      reasons.push(`دریافت دید — ${faNum(round(parts.aspect * 100))}٪`)
    }
    if (hasBala) {
      reasons.push(`شدت شدبالا — ${faNum(round(parts.shadbala * 100))}٪ از حداکثر`)
    }

    return { graha: placement.graha, score, parts, placement, reasons }
  })

  return signals.sort((a, b) => b.score - a.score || a.graha.localeCompare(b.graha))
}

/**
 * How well a graha is supported by tight conjunctions.
 * `conjunctionStrength` already handles the wrap-around between signs and
 * returns 0 outside the orb, so no pre-filter is applied here.
 */
function conjunctionSupport(chart: NatalChart, placement: PlanetPlacement): number {
  const signIndexOf = (p: PlanetPlacement) => SIGN_KEYS.indexOf(p.sign)
  let total = 0
  for (const other of chart.placements) {
    if (other.graha === placement.graha) continue
    total += conjunctionStrength(placement, other, signIndexOf)
  }
  return clamp01(total)
}
