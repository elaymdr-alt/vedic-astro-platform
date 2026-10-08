/**
 * AstrologyAnalysis — ONE SOURCE OF TRUTH for Interpreter + UI.
 *
 * NatalChart → buildAnalysis → AstrologyAnalysis → interpreter + UI.
 * Only facts the engine really computed may appear here. Anything the
 * engine cannot produce is listed in `meta.unavailable` — never invented.
 */

import { SIGN_KEYS } from "./chart"
import { getBhava } from "./houses"
import { getGraha } from "./planets"
import { getRashi } from "./signs"
import { activeDashaChain } from "./engine/dasha"
import { grahaAspects } from "./engine/aspects"
import { buildIntelligence, type ChartIntelligence } from "./intelligence"
import type { GrahaKey, NatalChart, PlanetPlacement, SignKey } from "./types"

export const ANALYSIS_SCHEMA_VERSION = "1.0.0"

export interface EngineCapability {
  key: string
  fa: string
  status: "computed" | "derived" | "unavailable"
  source: string
}

export const ENGINE_COVERAGE: EngineCapability[] = [
  { key: "placements", fa: "جایگاه نه گرها", status: "computed", source: "ephemeris: sidereal longitudes (Lahiri default)" },
  { key: "signs", fa: "برج و نکشتر و پادا", status: "computed", source: "chart.ts + nakshatra.ts (27 nakshatras)" },
  { key: "houses", fa: "دوازده خانه", status: "computed", source: "engine/houses.ts — whole/equal/porphyry/sripati" },
  { key: "angles", fa: "صعود و میدهون", status: "computed", source: "ephemeris.siderealAngles — only when time known" },
  { key: "dignity", fa: "شرف / هبوط / حاکمیت", status: "computed", source: "planets.ts + natural relations" },
  { key: "aspects", fa: "دید سیارات (دریشتی)", status: "computed", source: "engine/aspects.ts — Drishti + tightness" },
  { key: "yogas", fa: "یوگا و دوشا با امتیاز", status: "derived", source: "engine/yoga.ts — rule-based 0–100" },
  { key: "shadbala", fa: "شدبالا", status: "computed", source: "engine/bala.ts — max 480 virupa" },
  { key: "ashtakavarga", fa: "اشتاکاورگا", status: "computed", source: "engine/ashtakavarga.ts — total 337" },
  { key: "karakas", fa: "کاراکاهای چارا", status: "computed", source: "engine/karaka.ts — degree-ranked" },
  { key: "dashas", fa: "داشای ویمشوتری و یوگینی", status: "computed", source: "engine/dasha.ts from Moon longitude" },
  { key: "gochara", fa: "گذر روزانه با وده", status: "computed", source: "engine/vedha.ts from natal Moon" },
  { key: "saturn-phases", fa: "فازهای زحل", status: "computed", source: "engine/gochara.ts — 30y scan" },
  { key: "patterns", fa: "الگوهای هندسی و جیوتیش", status: "derived", source: "intelligence/patterns.ts" },
  { key: "compatibility", fa: "سازگاری اشتاکوتا", status: "computed", source: "engine/compat.ts — 36-point moon score" },
  { key: "divisional", fa: "چارت‌های تقسیمی", status: "computed", source: "divisional.ts — signs only" },
  { key: "progressions", fa: "پروگرشن", status: "unavailable", source: "not implemented — no progression solver" },
  { key: "returns", fa: "بازگشت خورشیدی/ماهی", status: "unavailable", source: "not implemented — no return solver" },
  { key: "synastry", fa: "سینستری کامل", status: "unavailable", source: "only Ashtakoota moon score exists" },
  { key: "composite", fa: "چارت ترکیبی", status: "unavailable", source: "not implemented" },
  { key: "astrocartography", fa: "آستروکارتی", status: "unavailable", source: "not implemented" },
  { key: "combustion", fa: "احتراق و جنگ سیارات", status: "unavailable", source: "no combustion/avastha rules yet" },
]

export interface PlanetFact extends PlanetPlacement {
  lon: number
  signIndex: number
  fa: string
  glyph: string
  signFa: string
  houseFa: string
  bhava: number
}

export interface AspectFact {
  from: GrahaKey
  to: GrahaKey
  fromFa: string
  toFa: string
  distance: number
  kindFa: string
  drishti: number
  tightness: number
  strength: number
  conjunct: boolean
  tone: "harmony" | "friction" | "mixed"
  fa: string
}

export interface Dominants {
  graha: GrahaKey
  grahaFa: string
  grahaScore: number
  lagnaLord: GrahaKey
  lagnaLordFa: string
  lagnaLordHouse: number
  moonSign: SignKey
  moonSignFa: string
  sunSign: SignKey
  sunSignFa: string
  elementTop: string
  elementTopFa: string
  modalityTop: string
  modalityTopFa: string
  houseTop: number
  houseTopFa: string
  houseTopBindu: number
}

export interface TimingFact {
  maha: GrahaKey
  mahaFa: string
  mahaFrom: string
  mahaTo: string
  antar: GrahaKey | null
  antarFa: string | null
  chain: { graha: GrahaKey; fa: string }[]
}

export interface AnalysisMeta {
  schemaVersion: string
  timeKnown: boolean
  dataQuality: "full" | "moon-only"
  ayanamsa: string
  houseSystem: string
  trueNode: boolean
  unavailable: EngineCapability[]
  warnings: string[]
}

export interface AstrologyAnalysis {
  meta: AnalysisMeta
  chart: NatalChart
  planets: PlanetFact[]
  aspects: AspectFact[]
  dominants: Dominants
  timing: TimingFact
  intelligence: ChartIntelligence
}

const BENEFICS: GrahaKey[] = ["jupiter", "venus", "moon", "mercury"]
const MALEFICS: GrahaKey[] = ["mars", "saturn", "rahu", "ketu", "sun"]

function toneOf(from: GrahaKey, to: GrahaKey): AspectFact["tone"] {
  if (BENEFICS.includes(from) && BENEFICS.includes(to)) return "harmony"
  if (MALEFICS.includes(from) && MALEFICS.includes(to)) return "friction"
  return "mixed"
}

const KIND_FA: Record<string, string> = {
  full: "کامل",
  "three-quarter": "سه‌چهارم",
  half: "نیم",
  quarter: "یک‌چهارم",
  none: "بدون",
}

/** NatalChart → normalized, UI-ready, fully traceable analysis. Pure. */
export function buildAnalysis(chart: NatalChart, now: Date = new Date()): AstrologyAnalysis {
  const signIndexOf = (p: PlanetPlacement) => SIGN_KEYS.indexOf(p.sign)

  const planets: PlanetFact[] = chart.placements.map((p) => {
    const signIndex = signIndexOf(p)
    return {
      ...p,
      bhava: p.bhava ?? p.house,
      lon: signIndex * 30 + p.degreeInSign,
      signIndex,
      fa: getGraha(p.graha).fa,
      glyph: getGraha(p.graha).glyph,
      signFa: getRashi(p.sign).fa,
      houseFa: getBhava(p.house).fa,
    }
  })

  const aspects: AspectFact[] = grahaAspects(chart.placements, signIndexOf).map((a) => ({
    from: a.from,
    to: a.to,
    fromFa: getGraha(a.from).fa,
    toFa: getGraha(a.to).fa,
    distance: a.distance,
    kindFa: KIND_FA[a.kind] ?? a.kind,
    drishti: a.drishti,
    tightness: a.tightness,
    strength: a.strength,
    conjunct: a.conjunct,
    tone: toneOf(a.from, a.to),
    fa: `دید ${KIND_FA[a.kind] ?? a.kind} ${getGraha(a.from).fa} به ${getGraha(a.to).fa}`,
  }))

  const intelligence = buildIntelligence(chart, now)
  const { signals } = intelligence

  const lagnaLordKey = getRashi(chart.lagna).lord
  const lagnaLordP = chart.placements.find((p) => p.graha === lagnaLordKey)!
  const topHouse = [...signals.houses].sort((a, b) => b.score - a.score)[0]
  const topEl = [...signals.elements].sort((a, b) => b.percent - a.percent)[0]
  const topMod = [...signals.modalities].sort((a, b) => b.percent - a.percent)[0]

  const chain = activeDashaChain(chart, now)

  const warnings: string[] = []
  if (!chart.profile.timeKnown) {
    warnings.push("ساعت تولد ثبت نشده؛ صعود از ماه تولد (چاندرا لگنا) گرفته شده و زوایا خنثی‌اند.")
  }

  return {
    meta: {
      schemaVersion: ANALYSIS_SCHEMA_VERSION,
      timeKnown: chart.profile.timeKnown,
      dataQuality: chart.profile.timeKnown ? "full" : "moon-only",
      ayanamsa: chart.settings?.ayanamsa ?? "lahiri",
      houseSystem: chart.settings?.houseSystem ?? "whole",
      trueNode: chart.settings?.trueNode ?? false,
      unavailable: ENGINE_COVERAGE.filter((c) => c.status === "unavailable"),
      warnings,
    },
    chart,
    planets,
    aspects,
    dominants: {
      graha: signals.dominant.graha,
      grahaFa: getGraha(signals.dominant.graha).fa,
      grahaScore: signals.dominant.score,
      lagnaLord: lagnaLordKey,
      lagnaLordFa: getGraha(lagnaLordKey).fa,
      lagnaLordHouse: lagnaLordP.house,
      moonSign: chart.moonSign,
      moonSignFa: getRashi(chart.moonSign).fa,
      sunSign: chart.sunSign,
      sunSignFa: getRashi(chart.sunSign).fa,
      elementTop: topEl.key,
      elementTopFa: topEl.fa,
      modalityTop: topMod.key,
      modalityTopFa: topMod.fa,
      houseTop: topHouse.house,
      houseTopFa: topHouse.fa,
      houseTopBindu: topHouse.bindu,
    },
    timing: {
      maha: chain[0]?.graha ?? "sun",
      mahaFa: chain[0] ? getGraha(chain[0].graha).fa : "—",
      mahaFrom: chain[0]?.from ?? "",
      mahaTo: chain[0]?.to ?? "",
      antar: chain[1]?.graha ?? null,
      antarFa: chain[1] ? getGraha(chain[1].graha).fa : null,
      chain: chain.map((d) => ({ graha: d.graha, fa: getGraha(d.graha).fa })),
    },
    intelligence,
  }
}

