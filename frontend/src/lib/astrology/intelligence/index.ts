/**
 * Personal AI Astrology Intelligence — public entry point.
 *
 * One call turns a `NatalChart` (pure calculation) into a `ChartIntelligence`:
 *   signals  → scored, traceable graha strength + chart-wide balance
 *   patterns → detected figures, each proven from actual placements
 *   relations→ the drishti matrix between the chart's hub grahas
 *   synthesis→ nine Persian narrative sections, each with its own evidence list
 *
 * `now` is passed in explicitly so nothing reads the clock implicitly.
 */

import type { GrahaKey, NatalChart } from "../types"
import { SIGN_KEYS } from "../chart"
import { getRashi } from "../signs"
import { detectPatterns } from "./patterns"
import { relations } from "./relations"
import {
  elementBalance,
  grahaSignals,
  houseEmphasis,
  lordPlacements,
  modalityBalance,
} from "./signals"
import { synthesize } from "./synthesis"
import type { ChartIntelligence, ChartSignals, GrahaSignal } from "./types"

export * from "./types"
export { detectPatterns } from "./patterns"
export { relations, hubGrahas, seventhLord, tenthLord } from "./relations"
export {
  grahaSignals,
  elementBalance,
  modalityBalance,
  houseEmphasis,
  lordPlacements,
  WEIGHTS,
  DIGNITY_SCORE,
} from "./signals"
export { synthesize, allEvidence } from "./synthesis"

/**
 * The chart's dominant graha = highest strength score. `grahaSignals` already
 * returns strongest-first, so this is the explicit, deterministic form of that
 * ordering rather than a second, competing rule.
 */
function dominantOf(grahas: GrahaSignal[]): GrahaSignal {
  return [...grahas].sort((a, b) => b.score - a.score)[0]
}

function required(grahas: GrahaSignal[], key: GrahaKey): GrahaSignal {
  const found = grahas.find((g) => g.graha === key)
  if (found) return found
  throw new Error(`buildIntelligence: required graha "${key}" is missing from the chart`)
}

/** House-significator lookup: which graha rules the Nth bhava. */
function lordOf(chart: NatalChart, house: number): GrahaKey {
  const start = SIGN_KEYS.indexOf(chart.lagna)
  return getRashi(SIGN_KEYS[(start + house - 1) % 12]).lord
}

/**
 * The scored signals for one chart, including the two significators the
 * narrative layer always needs. `missing` names exactly what the engine could
 * not account for — grahas with no shadbala, in practice the nodes, whose
 * weights are renormalised rather than silently zeroed.
 */
export function buildSignals(chart: NatalChart): ChartSignals {
  const grahas = grahaSignals(chart)
  const withBala = new Set((chart.balas ?? []).map((b) => b.graha))

  return {
    grahas,
    dominant: dominantOf(grahas),
    lagnaLord: required(grahas, getRashi(chart.lagna).lord),
    tenthLord: required(grahas, lordOf(chart, 10)),
    elements: elementBalance(chart, grahas),
    modalities: modalityBalance(chart, grahas),
    houses: houseEmphasis(chart),
    lords: lordPlacements(chart, grahas),
    missing: chart.placements.filter((p) => !withBala.has(p.graha)).map((p) => p.graha),
  }
}

export function buildIntelligence(chart: NatalChart, now: Date = new Date()): ChartIntelligence {
  const signals = buildSignals(chart)
  const patterns = detectPatterns(chart)
  const rels = relations(chart)

  return {
    chart,
    signals,
    relations: rels,
    patterns,
    synthesis: synthesize(chart, signals, patterns, rels, now),
  }
}
