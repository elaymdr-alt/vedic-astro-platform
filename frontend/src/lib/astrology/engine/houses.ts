export type HouseSystem = "whole" | "equal" | "porphyry" | "sripati"

const norm = (x: number) => ((x % 360) + 360) % 360

/**
 * Longitude where each of the 12 houses begins (index 0 = house 1).
 * - whole:    sign boundaries; house 1 = the ascendant's sign (default Jyotish)
 * - equal:    30° houses starting at the ascendant degree
 * - porphyry: quadrants (Asc–IC–Desc–MC) trisected
 * - sripati:  Porphyry cusps taken as house midpoints (bhava madhya)
 */
export function houseCusps(asc: number, mc: number, system: HouseSystem): number[] {
  if (system === "whole") {
    const start = Math.floor(asc / 30) * 30
    return Array.from({ length: 12 }, (_, i) => norm(start + i * 30))
  }
  if (system === "equal") return Array.from({ length: 12 }, (_, i) => norm(asc + i * 30))

  const ic = norm(mc + 180)
  const desc = norm(asc + 180)
  const q1 = norm(ic - asc) / 3 // Asc → IC
  const q2 = norm(desc - ic) / 3 // IC → Desc
  const q3 = norm(mc - desc) / 3 // Desc → MC
  const q4 = norm(asc - mc) / 3 // MC → Asc
  const porphyry = [
    asc, norm(asc + q1), norm(asc + 2 * q1),
    ic, norm(ic + q2), norm(ic + 2 * q2),
    desc, norm(desc + q3), norm(desc + 2 * q3),
    mc, norm(mc + q4), norm(mc + 2 * q4),
  ]
  if (system === "porphyry") return porphyry
  // sripati: house i begins halfway between cusp i-1 and cusp i
  return porphyry.map((c, i) => {
    const prev = porphyry[(i + 11) % 12]
    return norm(prev + norm(c - prev) / 2)
  })
}

/** House number (1–12) containing a longitude, given the house start longitudes. */
export function houseOfLongitude(lon: number, cusps: number[]): number {
  const l = norm(lon)
  for (let i = 0; i < 12; i++) {
    const start = cusps[i]
    const span = norm(cusps[(i + 1) % 12] - start)
    if (norm(l - start) < span) return i + 1
  }
  return 1
}
