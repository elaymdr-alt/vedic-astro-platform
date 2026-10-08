import type { GrahaKey } from "../types"

/**
 * Parashari Bhinnashtakavarga. Each row lists, for one of the 8 contributors
 * (Sun…Saturn, Lagna), the houses counted from that contributor that receive a
 * bindu. Row totals per planet: 48 49 39 54 56 52 39 = 337.
 */
type Row = number[]
const BAV: Record<string, Row[]> = {
  sun: [[1,2,4,7,8,9,10,11],[3,6,10,11],[1,2,4,7,8,9,10,11],[3,5,6,9,10,11,12],[5,6,9,11],[6,7,12],[1,2,4,7,8,9,10,11],[3,4,6,10,11,12]],
  moon: [[3,6,7,8,10,11],[1,3,6,7,10,11],[2,3,5,6,9,10,11],[1,3,4,5,7,8,10,11],[1,4,7,8,10,11,12],[3,4,5,7,9,10,11],[3,5,6,11],[3,6,10,11]],
  mars: [[3,5,6,10,11],[3,6,11],[1,2,4,7,8,10,11],[3,5,6,11],[6,10,11,12],[6,8,11,12],[1,4,7,8,9,10,11],[1,3,6,10,11]],
  mercury: [[5,6,9,11,12],[2,4,6,8,10,11],[1,2,4,7,8,9,10,11],[1,3,5,6,9,10,11,12],[6,8,11,12],[1,2,3,4,5,8,9,11],[1,2,4,7,8,9,10,11],[1,2,4,6,8,10,11]],
  jupiter: [[1,2,3,4,7,8,9,10,11],[2,5,7,9,11],[1,2,4,7,8,10,11],[1,2,4,5,6,9,10,11],[1,2,3,4,7,8,10,11],[2,5,6,9,10,11],[3,5,6,12],[1,2,4,5,6,7,9,10,11]],
  venus: [[8,11,12],[1,2,3,4,5,8,9,11,12],[3,5,6,9,11,12],[3,5,6,9,11],[5,8,9,10,11],[1,2,3,4,5,8,9,10,11],[3,4,5,8,9,10,11],[1,2,3,4,5,8,9,11]],
  saturn: [[1,2,4,7,8,10,11],[3,6,11],[3,5,6,10,11,12],[6,8,9,10,11,12],[5,6,11,12],[6,11,12],[3,5,6,11],[1,3,4,6,10,11]],
}

export const ASHTAKAVARGA_PLANETS: GrahaKey[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]

/** Maximum bindus a single sign can hold in a Bhinnashtakavarga (one per contributor). */
export const BAV_MAX_PER_SIGN = 8

const binduBySign = (planet: GrahaKey, signs: number[]): number[] => {
  const bySign = new Array(12).fill(0)
  BAV[planet].forEach((houses, c) => {
    for (const h of houses) bySign[(signs[c] + h - 1) % 12]++
  })
  return bySign
}

/**
 * @param signs 0-based sign index of [sun, moon, mars, mercury, jupiter, venus, saturn, lagna]
 * @returns Sarvashtakavarga bindus per house (house 1 = lagna). Sums to 337.
 */
export function sarvashtakavarga(signs: number[]): number[] {
  const bySign = new Array(12).fill(0)
  for (const rows of Object.values(BAV)) {
    rows.forEach((houses, c) => {
      for (const h of houses) bySign[(signs[c] + h - 1) % 12]++
    })
  }
  return Array.from({ length: 12 }, (_, i) => bySign[(signs[7] + i) % 12])
}

/**
 * Bhinnashtakavarga per planet: bindus of each graha in every *sign*
 * (indexed 0 = Aries … 11 = Pisces). Each row sums to the planet's classical
 * total (48/49/39/54/56/52/39), which is what drives transit scoring.
 */
export function bhinnashtakavarga(signs: number[]): Record<GrahaKey, number[]> {
  const out = {} as Record<GrahaKey, number[]>
  for (const planet of ASHTAKAVARGA_PLANETS) out[planet] = binduBySign(planet, signs)
  return out
}

/** One planet's BAV, re-indexed so entry 0 is the lagna's sign (house view). */
export function bavByHouse(planet: GrahaKey, signs: number[]): number[] {
  const bySign = binduBySign(planet, signs)
  return Array.from({ length: 12 }, (_, i) => bySign[(signs[7] + i) % 12])
}
