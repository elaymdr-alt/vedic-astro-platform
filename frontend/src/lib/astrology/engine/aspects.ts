import type { GrahaKey, PlanetPlacement } from "../types"

/**
 * Graha Drishti — the classical planetary aspects of Jyotish.
 *
 * Every graha casts a full aspect (purna drishti) on the 7th sign from it, and
 * three grahas add extra full aspects:
 *   • Mars     → 4th and 8th
 *   • Jupiter  → 5th and 9th
 *   • Saturn   → 3rd and 10th
 *   • Rahu/Ketu→ 5th, 7th and 9th (the standard node convention)
 *
 * Every other sign receives a *partial* aspect (sphuta drishti): 1/4 on the 3rd
 * and 10th, 1/2 on the 5th and 9th, 3/4 on the 4th and 8th. A graha's own
 * special houses always upgrade the value to a full aspect.
 *
 * Aspect strength used across the engine combines the drishti value with a
 * `tightness` factor that falls off as the actual longitude separation moves
 * away from the exact aspect angle.
 */

export const ASPECT_GRAHAS: GrahaKey[] = [
  "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu",
]

/** The two lunar nodes — always exactly opposite, so their mutual drishti carries no information and is never emitted. */
const NODES: GrahaKey[] = ["rahu", "ketu"]

/** Houses (1 = the graha's own sign) receiving a FULL aspect from each graha. */
export const FULL_ASPECT_HOUSES: Record<GrahaKey, number[]> = {
  sun: [7],
  moon: [7],
  mercury: [7],
  venus: [7],
  mars: [4, 7, 8],
  jupiter: [5, 7, 9],
  saturn: [3, 7, 10],
  rahu: [5, 7, 9],
  ketu: [5, 7, 9],
}

/** Partial (sphuta) drishti value for the remaining sign distances, 0–1. */
const PARTIAL_ASPECT: Record<number, number> = {
  3: 0.25, 10: 0.25,
  5: 0.5, 9: 0.5,
  4: 0.75, 8: 0.75,
  7: 1,
}

export type AspectKind = "full" | "three-quarter" | "half" | "quarter" | "none"

export interface GrahaAspect {
  from: GrahaKey
  to: GrahaKey
  /** 1-based sign distance counted from `from` to `to` (1 = same sign). */
  distance: number
  kind: AspectKind
  /** Classical drishti value of the aspect, 0–1. */
  drishti: number
  /** How close the aspect is to its exact angle, 0–1 (1 = perfectly exact). */
  tightness: number
  /** drishti × tightness — what the reasoning layer weighs. */
  strength: number
  /** True when both grahas share a sign. */
  conjunct: boolean
}

const arc = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

const kindOf = (value: number): AspectKind =>
  value >= 1 ? "full" : value >= 0.75 ? "three-quarter" : value >= 0.5 ? "half" : value > 0 ? "quarter" : "none"

/** Sign distance (1–12) counted from sign index `a` to sign index `b`. */
export function signDistance(fromIndex: number, toIndex: number): number {
  return ((toIndex - fromIndex + 12) % 12) + 1
}

/** Classical drishti value a graha casts on a sign distance, 0–1. */
export function drishtiValue(from: GrahaKey, distance: number): number {
  if (FULL_ASPECT_HOUSES[from].includes(distance)) return 1
  return PARTIAL_ASPECT[distance] ?? 0
}

const lonOf = (p: PlanetPlacement, signIndexOf: (p: PlanetPlacement) => number) =>
  signIndexOf(p) * 30 + p.degreeInSign

/**
 * All pairwise aspects among the grahas of a chart. `signIndexOf` maps a
 * placement to its 0-based sign (the engine passes `SIGN_KEYS.indexOf(p.sign)`).
 */
export function grahaAspects(
  placements: PlanetPlacement[],
  signIndexOf: (p: PlanetPlacement) => number
): GrahaAspect[] {
  const out: GrahaAspect[] = []
  for (const a of placements) {
    for (const b of placements) {
      if (a.graha === b.graha) continue
      // Rahu and Ketu are always 180° apart: the node↔node aspect exists by
      // construction in every chart, so it says nothing and would always
      // render as a full 100% aspect. Skip both directions.
      if (NODES.includes(a.graha) && NODES.includes(b.graha)) continue
      const distance = signDistance(signIndexOf(a), signIndexOf(b))
      const value = drishtiValue(a.graha, distance)
      if (value <= 0) continue
      const ideal = (distance - 1) * 30
      const sep = arc(lonOf(a, signIndexOf), lonOf(b, signIndexOf))
      const tightness = 1 - Math.min(1, Math.abs(sep - ideal) / 30)
      out.push({
        from: a.graha,
        to: b.graha,
        distance,
        kind: kindOf(value),
        drishti: value,
        tightness: Math.round(tightness * 100) / 100,
        strength: Math.round(value * tightness * 100) / 100,
        conjunct: distance === 1,
      })
    }
  }
  return out.sort((x, y) => y.strength - x.strength)
}

/** All aspects received by one graha. */
export function aspectsOn(
  graha: GrahaKey,
  placements: PlanetPlacement[],
  signIndexOf: (p: PlanetPlacement) => number
): GrahaAspect[] {
  return grahaAspects(placements, signIndexOf).filter((a) => a.to === graha)
}

/** Default orb (°) inside which two grahas count as tightly conjunct. */
export const DEFAULT_CONJUNCTION_ORB = 8

/**
 * Degree-based conjunction (yuti in the tight sense). Classical yoga rules work
 * on same-sign occupation; this is the *strength* signal layered on top so the
 * reasoning engine can distinguish a 1° conjunction from a 29° one.
 */
export function conjunctionStrength(
  a: PlanetPlacement,
  b: PlanetPlacement,
  signIndexOf: (p: PlanetPlacement) => number,
  orb: number = DEFAULT_CONJUNCTION_ORB
): number {
  const sep = arc(lonOf(a, signIndexOf), lonOf(b, signIndexOf))
  if (sep >= orb) return 0
  return Math.round((1 - sep / orb) * 100) / 100
}

/** True when two placements are conjunct within `orb` degrees. */
export function isConjunct(
  a: PlanetPlacement,
  b: PlanetPlacement,
  signIndexOf: (p: PlanetPlacement) => number,
  orb: number = DEFAULT_CONJUNCTION_ORB
): boolean {
  return conjunctionStrength(a, b, signIndexOf, orb) > 0
}

export const ASPECT_KIND_FA: Record<AspectKind, string> = {
  full: "کامل",
  "three-quarter": "سه‌چهارم",
  half: "نیم",
  quarter: "یک‌چهارم",
  none: "بدون",
}
