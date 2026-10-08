import type { GrahaKey, PlanetPlacement } from "../types"

/**
 * Graha Bala — the six classical Shadbala components that can be derived from
 * a chart: Sthana (Uchcha + Kendradi), Dig, Kala (Natonnata + Paksha + Ayana),
 * Cheshta and Naisargika. Each component is measured in virupas with a
 * theoretical maximum of 60, so the scale tops out at 480.
 *
 * Saptavargaja / Ojhayugma / Drekkana (the remaining Sthana sub-components) and
 * the Tribhaga / Varsha-Masa-Dina-Hora parts of Kala are intentionally not
 * included; everything that IS included is computed exactly.
 */
export const BALA_PLANETS: GrahaKey[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]

/** Theoretical maximum of our six components (6 × 60 virupas). */
export const BALA_TOTAL_MAX = 480

/** Deep-debilitation longitudes (°). */
const DEBILITATION: Record<string, number> = {
  sun: 190, moon: 213, mars: 298, mercury: 345, jupiter: 275, venus: 177, saturn: 20,
}
const NAISARGIKA: Record<string, number> = {
  sun: 60, moon: 51.43, venus: 42.86, jupiter: 34.29, mercury: 25.71, mars: 17.14, saturn: 8.57,
}
/** Weakest point of the Dig bala: house cusp where the planet has zero directional strength. */
const DIG_WEAK_HOUSE: Record<string, 1 | 4 | 7 | 10> = {
  jupiter: 7, mercury: 7, sun: 4, mars: 4, saturn: 1, moon: 10, venus: 10,
}

/** Benefics gain Paksha Bala directly, malefics receive its complement. */
const PAKSHA_BENEFIC: GrahaKey[] = ["moon", "mercury", "jupiter", "venus"]
/** Kala (Natonnata): day-strong grahas peak at noon, night-strong at midnight. */
const DAY_STRONG: GrahaKey[] = ["sun", "jupiter", "venus"]
/** Kala (Ayana): grahas that gain strength with northern declination. */
const NORTH_STRONG: GrahaKey[] = ["sun", "mars", "jupiter", "venus"]
const SOUTH_STRONG: GrahaKey[] = ["moon", "saturn"]

const OBLIQUITY = 23.439291
/** Mean daily motion (°/day) — the reference for Cheshta Bala. */
const MEAN_DAILY: Record<string, number> = {
  sun: 0.9856, moon: 13.176, mars: 0.524, mercury: 1.383, jupiter: 0.083, venus: 1.602, saturn: 0.0335,
}

const arc = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const r1 = (n: number) => Math.round(n * 10) / 10
const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

export interface BalaRow {
  graha: GrahaKey
  uchcha: number
  dig: number
  naisargika: number
  kendradi: number
  /** Kala — day/night strength */
  natonnata: number
  /** Kala — waxing/waning strength */
  paksha: number
  /** Kala — declination strength */
  ayana: number
  /** Kala total (Natonnata + Paksha + Ayana, max 180) */
  kala: number
  /** Motion strength; retrograde grahas peak (approximate) */
  cheshta: number
  /** Sum in virupas (max 480) */
  total: number
  /** 0–100 for display */
  percent: number
}

/**
 * @param angles ascendant and midheaven longitudes (sidereal); omit when the
 *  birth time is unknown — Dig and Natonnata Bala are then neutralised.
 */
export function grahaBala(
  placements: PlanetPlacement[],
  signIndexOf: (p: PlanetPlacement) => number,
  angles?: { asc: number; mc: number }
): BalaRow[] {
  const lonOf = (g: GrahaKey) => {
    const p = placements.find((x) => x.graha === g)
    return p ? signIndexOf(p) * 30 + p.degreeInSign : 0
  }
  const sunLon = lonOf("sun")
  const moonLon = lonOf("moon")
  const elong = ((moonLon - sunLon) % 360 + 360) % 360
  const pakshaFraction = elong <= 180 ? elong / 180 : (360 - elong) / 180
  const dayFraction = angles ? (180 - arc(sunLon, angles.mc)) / 180 : 0.5

  return BALA_PLANETS.map((graha) => {
    const p = placements.find((x) => x.graha === graha)!
    const lon = signIndexOf(p) * 30 + p.degreeInSign

    const uchcha = arc(lon, DEBILITATION[graha]) / 3

    let dig = 30
    if (angles) {
      const cusp: Record<1 | 4 | 7 | 10, number> = {
        1: angles.asc, 4: (angles.mc + 180) % 360, 7: (angles.asc + 180) % 360, 10: angles.mc,
      }
      dig = arc(lon, cusp[DIG_WEAK_HOUSE[graha]]) / 3
    }

    // Kendradi uses the bhava of the selected house system (equals whole-sign
    // houses when that system is chosen).
    const h = p.bhava ?? p.house
    const kendradi = [1, 4, 7, 10].includes(h) ? 60 : [2, 5, 8, 11].includes(h) ? 30 : 15
    const naisargika = NAISARGIKA[graha]

    const natonnata =
      graha === "mercury" ? 60 : DAY_STRONG.includes(graha) ? 60 * dayFraction : 60 * (1 - dayFraction)
    const paksha = PAKSHA_BENEFIC.includes(graha) ? 60 * pakshaFraction : 60 * (1 - pakshaFraction)

    const decl = deg(Math.asin(Math.sin(rad(lon)) * Math.sin(rad(OBLIQUITY))))
    const ayana =
      graha === "mercury" ? 60
        : NORTH_STRONG.includes(graha) ? 30 * (1 + decl / OBLIQUITY)
        : SOUTH_STRONG.includes(graha) ? 30 * (1 - decl / OBLIQUITY)
        : 30

    // Retrograde motion scores highest (60), fast direct motion lowest.
    const cheshta =
      p.speed === undefined
        ? 30
        : p.speed < 0
          ? 60
          : clamp(60 - 30 * (p.speed / MEAN_DAILY[graha]), 0, 60)

    const kala = natonnata + paksha + ayana
    const total = uchcha + dig + naisargika + kendradi + kala + cheshta
    return {
      graha,
      uchcha: r1(uchcha),
      dig: r1(dig),
      naisargika,
      kendradi,
      natonnata: r1(natonnata),
      paksha: r1(paksha),
      ayana: r1(ayana),
      kala: r1(kala),
      cheshta: r1(cheshta),
      total: r1(total),
      percent: Math.round((total / BALA_TOTAL_MAX) * 100),
    }
  })
}
