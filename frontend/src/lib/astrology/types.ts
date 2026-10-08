/**
 * Core domain types for the Vedic (Jyotish) astrology engine.
 * Everything downstream (UI, API contracts) is typed against these.
 */

import type { CharaKaraka } from "./engine/karaka"
import type { GocharaRow } from "./engine/vedha"

export type { CharaKaraka, GocharaRow }

export type SignKey =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces"

export type GrahaKey =
  | "sun"
  | "moon"
  | "mars"
  | "mercury"
  | "jupiter"
  | "venus"
  | "saturn"
  | "rahu"
  | "ketu"

export type FortuneLevel = "green" | "amber" | "red"

export interface Rashi {
  key: SignKey
  /** Zero-based 0–11, index 0 = Aries */
  index: number
  fa: string
  en: string
  /** Short alternate Persian name, e.g. «اسد / شیر» */
  alias?: string
  /** Zodiac glyph ♈ … ♓ */
  symbol: string
  /** Sanskrit element grouping used across the UI */
  element: "fire" | "earth" | "air" | "water"
  modality: "cardinal" | "fixed" | "mutable"
  lord: GrahaKey
  lordFa: string
  /** Approximate solar date range, for display only */
  dates: string
  keyword: string
  traits: string[]
  /** Tailwind-friendly accent token, e.g. "chart-4" */
  accent: string
}

export interface Graha {
  key: GrahaKey
  fa: string
  en: string
  /** Astronomical symbol: ☉ ☽ ♂ ☿ ♃ ♀ ♄ ☊ ☋ */
  glyph: string
  kind: "planet" | "shadow"
  /** What this graha ultimately governs */
  significates: string[]
  keyword: string
  description: string
  /** Minutes to complete one orbit — drives transit speed visuals */
  orbitalPeriod: number
  accent: string
}

export interface Bhava {
  /** 1-based house number */
  index: number
  fa: string
  en: string
  keyword: string
  description: string
  matters: string[]
  accent: string
}

export interface DivisionalChart {
  /** D1, D2, D9 … D60 */
  code: string
  fa: string
  en: string
  /** How many parts each sign is divided into */
  division: number
  /** Sign that always anchors this chart */
  lord: "sun" | "moon"
  purpose: string
  description: string
  /** Free + paid tier gating, mirrors the reference product */
  tier: "free" | "premium"
}

export interface PlanetPlacement {
  graha: GrahaKey
  /** 1-based sign number, 1 = Aries */
  sign: SignKey
  /** 1-based house number occupied in the Rashi chart */
  house: number
  degree: number
  minute: number
  /** Decan within the sign (0–29°59′) */
  degreeInSign: number
  nakshatra: string
  nakshatraLord: GrahaKey
  pada: 1 | 2 | 3 | 4
  retrograde: boolean
  exalted: boolean
  debilitated: boolean
  /** Own sign / exaltation / debilitation / enemy … */
  dignity: "exalted" | "own" | "friendly" | "neutral" | "enemy" | "debilitated"
  /** House under the chosen bhava system (equals `house` for whole-sign) */
  bhava?: number
  /** Daily motion in degrees (negative = retrograde); drives Cheshta Bala */
  speed?: number
}

export interface BirthProfile {
  name?: string
  /** Gregorian date of birth, ISO `YYYY-MM-DD` */
  date: string
  /** Local birth time, `HH:mm` — empty when "unknown time" */
  time?: string
  timeKnown: boolean
  /** Free-text city; resolved to lat/lng/UTC offset server-side */
  city: string
  latitude?: number
  longitude?: number
  timezone?: string
  gender?: "male" | "female" | "other"
}

export interface FortuneDay {
  date: string
  level: FortuneLevel
  score: number
  headline: string
  advice: string
  /** Short per-domain breakdown */
  areas: { key: string; fa: string; level: FortuneLevel; score: number }[]
  /** Classical gochara verdict per graha (house from natal Moon + vedha state). */
  gochara: GocharaRow[]
}

export interface YogaDosh {
  name: string
  fa: string
  kind: "yoga" | "dosha"
  strength: "strong" | "moderate" | "weak"
  description: string
  /**
   * 0–100 strength derived from the actual chart (dignity, house, aspects) of
   * the grahas carrying the combination. Absent on the static reference list.
   */
  score?: number
}

export interface NatalChart {
  profile: BirthProfile
  /** Ascendant (Lagna) sign — house 1 sign */
  lagna: SignKey
  lagnaDegree: number
  ascendantNakshatra: string
  moonSign: SignKey
  sunSign: SignKey
  placements: PlanetPlacement[]
  /** Ashtakavarga bindu per house, total always 337, average 28 */
  ashtakavarga: number[]
  yogas: YogaDosh[]
  doshas: YogaDosh[]
  /** Jaimini chara karakas (Atmakaraka … Darakaraka), ranked by degree. */
  karakas?: CharaKaraka[]
  /** Vimshottari dasha sequence */
  dashas: { graha: GrahaKey; from: string; to: string; level: FortuneLevel }[]
  /** Yogini dasha cycles (about 108 years) */
  yoginiDashas?: { graha: GrahaKey; from: string; to: string; level: FortuneLevel; name: string }[]
  /** Shadbala components in virupas (max 480 total) */
  balas?: {
    graha: GrahaKey
    uchcha: number
    dig: number
    naisargika: number
    kendradi: number
    /** Kala: Natonnata + Paksha + Ayana */
    kala: number
    /** Kala — day/night strength */
    natonnata: number
    /** Kala — waxing/waning strength */
    paksha: number
    /** Kala — declination strength */
    ayana: number
    /** Motion strength; retrograde grahas peak */
    cheshta: number
    total: number
    percent: number
  }[]
  /** House start longitudes for the chosen house system, and the sidereal angles */
  cusps?: number[]
  angles?: { asc: number; mc: number }
  /** Engine settings used to build this chart */
  settings?: { ayanamsa: string; trueNode: boolean; houseSystem: string }
  mantra: string
  luckyNumber: number
  luckyColor: string
  luckyStone: string
  profession: string
}
