import type { GrahaKey } from "../types"

/**
 * Gochara Vedha — the classical obstruction rule of Rashi gochara.
 *
 * Each graha has a set of favourable houses *counted from the natal Moon*,
 * and every favourable house is paired with exactly one other house (the
 * "vedha sthana"). If any graha occupies that paired house at the same time,
 * the favourable result of the transit does not arrive — the transit is
 * "pierced" (vedha). Vedha cancels the benefit; it does not convert it into
 * harm.
 *
 * Classical pair table (favourable house → blocking house, from the Moon):
 *
 *   Sun     3←9, 6←12, 10←4, 11←5
 *   Moon    1←5, 3←9, 6←12, 7←2, 10←4, 11←8
 *   Mars    3←12, 6←9, 11←5
 *   Mercury 2←5, 4←3, 6←9, 8←1, 10←7, 11←12
 *   Jupiter 2←12, 5←4, 7←3, 9←10, 11←8
 *   Venus   1←8, 2←7, 3←1, 4←10, 5←9, 8←5, 9←11, 11←6, 12←3
 *   Saturn  3←12, 6←9, 11←5
 *   Rahu    like the Sun    3←9, 6←12, 10←4, 11←5
 *   Ketu    like Saturn     3←12, 6←9, 11←5
 *
 * Two classical exemptions and one general rule for blockers:
 *   • the Sun and Saturn never obstruct each other (father/son),
 *   • the Moon and Mercury never obstruct each other (mother/son),
 *   • the lunar nodes are not counted as blockers at all.
 *
 * Vama vedha (the reverse reading) is also supported: when a graha sits in
 * one of its *unfavourable* houses, and the favourable house paired with it is
 * occupied, the difficult result is likewise held off.
 */

export const GOCHARA_GOOD: Record<GrahaKey, number[]> = {
  sun: [3, 6, 10, 11],
  moon: [1, 3, 6, 7, 10, 11],
  mars: [3, 6, 11],
  mercury: [2, 4, 6, 8, 10, 11],
  jupiter: [2, 5, 7, 9, 11],
  venus: [1, 2, 3, 4, 5, 8, 9, 11, 12],
  saturn: [3, 6, 11],
  rahu: [3, 6, 10, 11],
  ketu: [3, 6, 11],
}

/** [favourable house, house whose occupancy obstructs it] — from the natal Moon. */
export const VEDHA_PAIRS: Record<GrahaKey, [number, number][]> = {
  sun: [[3, 9], [6, 12], [10, 4], [11, 5]],
  moon: [[1, 5], [3, 9], [6, 12], [7, 2], [10, 4], [11, 8]],
  mars: [[3, 12], [6, 9], [11, 5]],
  mercury: [[2, 5], [4, 3], [6, 9], [8, 1], [10, 7], [11, 12]],
  jupiter: [[2, 12], [5, 4], [7, 3], [9, 10], [11, 8]],
  venus: [[1, 8], [2, 7], [3, 1], [4, 10], [5, 9], [8, 5], [9, 11], [11, 6], [12, 3]],
  saturn: [[3, 12], [6, 9], [11, 5]],
  rahu: [[3, 9], [6, 12], [10, 4], [11, 5]],
  ketu: [[3, 12], [6, 9], [11, 5]],
}

/** Pairs of grahas that never obstruct each other (father/son, mother/son). */
export const VEDHA_EXEMPT: [GrahaKey, GrahaKey][] = [["sun", "saturn"], ["moon", "mercury"]]

/** The nodes are shadow grahas — they never act as vedha blockers. */
const BLOCKERS: GrahaKey[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]

export type GocharaVerdict = "good" | "blocked" | "relieved" | "bad"

export interface GocharaRow {
  graha: GrahaKey
  /** House the graha transits, counted from the natal Moon (1–12). */
  house: number
  verdict: GocharaVerdict
  /** The graha piercing (blocking) the transit — blocked/relieved only. */
  blocker?: GrahaKey
  /** Its house from the natal Moon. */
  blockerHouse?: number
}

export const GOCHARA_VERDICT_FA: Record<GocharaVerdict, { fa: string; hint: string }> = {
  good: { fa: "مطلوب", hint: "گذر در خانه‌ی نیک و بدون مانع" },
  blocked: { fa: "وِده (منع)", hint: "خانه‌ی نیک، اما سیاره‌ای در خانه‌ی جفتی مانع آن است" },
  relieved: { fa: "ودهای وارونه", hint: "خانه‌ی دشوار، اما حضور در خانه‌ی جفتی سختی را می‌کاهد" },
  bad: { fa: "دشوار", hint: "گذر در خانه‌ی دشوار از ماه" },
}

export const VERDICT_VALUE: Record<GocharaVerdict, number> = {
  good: 1,          // full benefit
  blocked: 0,       // vedha cancels the benefit entirely
  relieved: 0.5,    // vama vedha holds the difficulty off
  bad: 0,
}

export const GOCHARA_ALL: GrahaKey[] = [
  "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu",
]

/** House (1–12) a transiting longitude occupies, counted from the natal Moon sign. */
export function houseFromMoon(lon: number, moonSignIndex: number): number {
  return ((Math.floor(lon / 30) - moonSignIndex + 12) % 12) + 1
}

/** Whether `blocker` may obstruct `graha` at all (nodes never, the two classical pairs never). */
export function canBlock(graha: GrahaKey, blocker: GrahaKey): boolean {
  if (!BLOCKERS.includes(blocker)) return false
  if (graha === blocker) return false
  return !VEDHA_EXEMPT.some(
    ([a, b]) => (a === graha && b === blocker) || (a === blocker && b === graha)
  )
}

/**
 * All per-graha readings for one day: house from the natal Moon, verdict, and
 * the vedha blocker/reliever when one exists.
 *
 * @param transitLon  sidereal longitude of each transiting graha (all nine)
 * @param moonSignIndex  0-based sign of the *natal* Moon
 */
export function gocharaRows(
  transitLon: Record<GrahaKey, number>,
  moonSignIndex: number
): GocharaRow[] {
  const houseOf: Record<GrahaKey, number> = {} as Record<GrahaKey, number>
  const byHouse: Record<number, GrahaKey[]> = {}
  for (const g of GOCHARA_ALL) {
    const h = houseFromMoon(transitLon[g], moonSignIndex)
    houseOf[g] = h
    ;(byHouse[h] ??= []).push(g)
  }

  const occupantsOf = (house: number): GrahaKey[] => byHouse[house] ?? []

  return GOCHARA_ALL.map((graha) => {
    const house = houseOf[graha]
    const favourable = GOCHARA_GOOD[graha].includes(house)
    if (favourable) {
      const blocker = vedhaBlockerOf(graha, house, occupantsOf)
      return blocker
        ? { graha, house, verdict: "blocked" as const, blocker: blocker.by, blockerHouse: blocker.house }
        : { graha, house, verdict: "good" as const }
    }
    const reliever = vedhaRelieverOf(graha, house, occupantsOf)
    return reliever
      ? { graha, house, verdict: "relieved" as const, blocker: reliever.by, blockerHouse: reliever.house }
      : { graha, house, verdict: "bad" as const }
  })
}

/** The graha piercing a *favourable* transit of `graha` in `house`, if any. */
function vedhaBlockerOf(
  graha: GrahaKey,
  house: number,
  occupantsOf: (house: number) => GrahaKey[]
): { by: GrahaKey; house: number } | null {
  for (const [good, blocking] of VEDHA_PAIRS[graha]) {
    if (good !== house) continue
    for (const b of occupantsOf(blocking)) {
      if (canBlock(graha, b)) return { by: b, house: blocking }
    }
  }
  return null
}

/**
 * Vama vedha: the same pairing read in reverse — a graha sitting in an
 * unfavourable house is relieved when the favourable house paired with that
 * house is occupied by an eligible graha.
 */
function vedhaRelieverOf(
  graha: GrahaKey,
  house: number,
  occupantsOf: (house: number) => GrahaKey[]
): { by: GrahaKey; house: number } | null {
  for (const [good, blocking] of VEDHA_PAIRS[graha]) {
    if (blocking !== house) continue
    for (const b of occupantsOf(good)) {
      if (canBlock(graha, b)) return { by: b, house: good }
    }
  }
  return null
}

/** The per-graha value the reasoning layer weights: 1 / 0.5 / 0 (vedha cancels). */
export function gocharaValue(verdict: GocharaVerdict): number {
  return VERDICT_VALUE[verdict]
}
