/**
 * Adapter: Python engine output (`/chart/compute`) -> `NatalChart` consumed by
 * the interpretation layer (reading / intelligence / premium report).
 *
 * Positions, ascendant and the birth instant come from the backend (Swiss
 * Ephemeris, Lahiri). Derived layers (dignity, yogas, ashtakavarga, bala,
 * karakas, dashas) are computed here by the pure helpers in `./engine`.
 * Without a birth time (no ascendant/MC) Dig/Natonnata bala stay neutral;
 * houses are Whole Sign only.
 */
import type { ChartResult } from "@/api"
import { LUCKY, PROFESSION, SIGN_KEYS } from "./chart"
import { sarvashtakavarga } from "./engine/ashtakavarga"
import { grahaBala } from "./engine/bala"
import { vimshottari, yoginiDashas } from "./engine/dasha"
import { houseCusps, houseOfLongitude } from "./engine/houses"
import { charaKarakas } from "./engine/karaka"
import { naturalRelation } from "./engine/relations"
import { evaluateYogas } from "./engine/yoga"
import { nakshatraFromLongitude } from "./nakshatra"
import { isDebilitated, isExalted, OWN_SIGNS } from "./planets"
import { getRashi } from "./signs"
import type { BirthProfile, GrahaKey, NatalChart, PlanetPlacement } from "./types"

const GRAHA_KEYS: GrahaKey[] = [
  "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu",
]

/** Julian Day (UT) -> JS Date. */
export function dateFromJulianDay(jd: number): Date {
  return new Date((jd - 2440587.5) * 86_400_000)
}

export function natalChartFromBackend(chart: ChartResult, profile: BirthProfile): NatalChart {
  const lonOf = (g: GrahaKey) => {
    const p = chart.planets.find((x) => x.name.toLowerCase() === g)
    if (!p) throw new Error(`planet missing in backend chart: ${g}`)
    return p
  }

  const lagnaLon = chart.ascendant ? chart.ascendant.longitude : lonOf("moon").longitude
  const lagnaIndex = Math.floor(lagnaLon / 30)
  const lagna = SIGN_KEYS[lagnaIndex]
  const angles =
    chart.ascendant && chart.midheaven
      ? { asc: chart.ascendant.longitude, mc: chart.midheaven.longitude }
      : undefined
  // Whole Sign only; the MC argument is unused by this system.
  const cusps = houseCusps(lagnaLon, angles?.mc ?? (lagnaLon + 270) % 360, "whole")

  const placements: PlanetPlacement[] = GRAHA_KEYS.map((graha) => {
    const bp = lonOf(graha)
    const lon = bp.longitude
    const signIndex = Math.floor(lon / 30)
    const sign = SIGN_KEYS[signIndex]
    const degreeInSign = lon - signIndex * 30
    const { nakshatra, pada } = nakshatraFromLongitude(lon)
    const exalted = isExalted(graha, sign)
    const debilitated = isDebilitated(graha, sign)
    const own = OWN_SIGNS[graha]?.includes(sign) ?? false
    const rel = naturalRelation(graha, getRashi(sign).lord)
    const dignity: PlanetPlacement["dignity"] = exalted
      ? "exalted"
      : debilitated
        ? "debilitated"
        : own
          ? "own"
          : rel === "friendly"
            ? "friendly"
            : rel === "enemy"
              ? "enemy"
              : "neutral"
    return {
      graha,
      sign,
      house: ((signIndex - lagnaIndex + 12) % 12) + 1,
      degree: Math.floor(degreeInSign),
      minute: Math.min(59, Math.floor((degreeInSign % 1) * 60)),
      degreeInSign,
      nakshatra: nakshatra.fa,
      nakshatraLord: nakshatra.lord,
      pada,
      bhava: houseOfLongitude(lon, cusps),
      retrograde: bp.retrograde && graha !== "rahu" && graha !== "ketu",
      exalted,
      debilitated,
      dignity,
      speed: bp.speed,
    }
  })

  const moon = placements[1]
  const sun = placements[0]
  const lagnaLord = getRashi(lagna).lord
  const tenthLord = getRashi(SIGN_KEYS[(lagnaIndex + 9) % 12]).lord
  const lucky = LUCKY[lagnaLord]
  const { yogas, doshas } = evaluateYogas(placements, lagna)
  const birthInstant = dateFromJulianDay(chart.julian_day_ut)
  const moonLon = lonOf("moon").longitude

  return {
    profile,
    lagna,
    lagnaDegree: lagnaLon - lagnaIndex * 30,
    ascendantNakshatra: nakshatraFromLongitude(lagnaLon).nakshatra.fa,
    moonSign: moon.sign,
    sunSign: sun.sign,
    placements,
    ashtakavarga: sarvashtakavarga([
      ...placements.slice(0, 7).map((p) => SIGN_KEYS.indexOf(p.sign)),
      lagnaIndex,
    ]),
    yogas,
    doshas,
    karakas: charaKarakas(placements),
    dashas: vimshottari(moonLon, birthInstant),
    yoginiDashas: yoginiDashas(moonLon, birthInstant),
    balas: grahaBala(placements, (p) => SIGN_KEYS.indexOf(p.sign), angles),
    cusps,
    angles,
    settings: { ayanamsa: "lahiri", trueNode: false, houseSystem: "whole" },
    mantra: lucky.mantra,
    luckyNumber: lucky.number,
    luckyColor: lucky.color,
    luckyStone: lucky.stone,
    profession: PROFESSION[tenthLord],
  }
}
