/**
 * Data contract for the Astrology Intelligence Engine.
 *
 * Spec §28 keeps three kinds of data strictly apart, and this file is where
 * that separation is encoded in the type system:
 *
 *   1. CALCULATED  — `NatalChart`, produced by the ephemeris/engine layer.
 *                    Never invented, never approximated.
 *   2. INTERPRETATION — `Evidence` / `Signals` / `DetectedPattern` / `ChartRelation`.
 *                    Rule-based derivations *of* calculated data. Every value
 *                    is produced by a named, testable rule and keeps the
 *                    factors that produced it so the UI can show a WHY.
 *   3. NARRATIVE   — `SynthesisSection.summary` and friends: Persian prose
 *                    assembled from interpretations only. No new facts.
 *
 * There is deliberately **no** free-form "confidence" or "probability" field:
 * an invented 82% cannot be traced to the chart, so the type system refuses to
 * carry one (spec §18/§29).
 */

import type { GrahaKey, NatalChart, PlanetPlacement, SignKey } from "../types"
import type { AspectKind } from "../engine/aspects"

// ── 2 · INTERPRETATION ───────────────────────────────────────────────────────

/** What kind of chart fact produced an interpretation. Drives the WHY chips. */
export type EvidenceKind =
  | "graha"
  | "house"
  | "aspect"
  | "pattern"
  | "element"
  | "modality"
  | "sign"
  | "lord"
  | "dasha"
  | "av"

/**
 * One traceable input to an interpretation. `label` says *what*, `detail`
 * says *how much / how*, and `weight` (0–1) says how much the fact moved the
 * score. Nothing reaches a `SynthesisSection` without evidence attached.
 */
export interface Evidence {
  kind: EvidenceKind
  /** Short Persian label, e.g. «زحل در خانه‌ی ۷». */
  label: string
  /** Persian explanation of the contribution, always naming the real number. */
  detail: string
  /** Contribution to the section score, 0–1. */
  weight: number
}

/** The five inspectable components of a graha's 0–100 strength score. */
export interface StrengthParts {
  dignity: number
  house: number
  aspect: number
  conjunction: number
  shadbala: number
}

export interface GrahaSignal {
  graha: GrahaKey
  /** 0–100, see `signals.ts` for the documented weighting. */
  score: number
  /** Raw 0–1 components, kept so the UI can show the arithmetic. */
  parts: StrengthParts
  placement: PlanetPlacement
  /** Persian sentences explaining the score, strongest factor first. */
  reasons: string[]
}

export interface BalanceSlice {
  key: string
  fa: string
  accent: string
  /** Strength-weighted share, 0–100; the four/every slice sums to 100. */
  percent: number
  /** Raw graha count in this slice (sums to 9 across all slices). */
  count: number
}

export interface HouseEmphasis {
  house: number
  /** 0–100 composite (ashtakavarga + occupancy + angularity). */
  score: number
  /** Sarvashtakavarga bindu straight from the engine — the classical part. */
  bindu: number
  count: number
  fa: string
  keyword: string
}

export interface LordPlacement {
  house: number
  lord: GrahaKey
  /** Where that lord actually sits. */
  lordHouse: number
  lordSign: SignKey
  /** True when the lord occupies its own bhava (a classical dignity bonus). */
  ownBhava: boolean
  strength: number
}

// ── Patterns ─────────────────────────────────────────────────────────────────

export type PatternKey =
  | "stellium"
  | "grand_trine"
  | "t_square"
  | "grand_cross"
  | "yod"
  | "bowl"
  | "seesaw"
  | "locomotion"
  | "kalasarpa"

/**
 * Which tradition the rule comes from. Jyotish patterns are part of this
 * project's own classical base; geometry patterns are ported from the
 * geometric tradition and are labelled as such so nothing is passed off as
 * classical when it is not.
 */
export type PatternSchool = "jyotish" | "geometry"

export type PatternTone = "harmony" | "tension" | "focus" | "spread"

export interface DetectedPattern {
  key: PatternKey
  name: string
  fa: string
  school: PatternSchool
  tone: PatternTone
  grahas: GrahaKey[]
  houses: number[]
  signs: SignKey[]
  /** 0–100, computed from the real geometry + drishti strength. */
  score: number
  /** Astrological meaning of the shape itself. */
  meaning: string
  /** How it tends to express in lived behaviour. */
  expression: string
  /** Exact derivation, e.g. the sign distances that formed the figure. */
  detail: string
}

// ── Relations ────────────────────────────────────────────────────────────────

export interface ChartRelation {
  from: GrahaKey
  to: GrahaKey
  distance: number
  kind: AspectKind
  /** Classical drishti value 0–1. */
  drishti: number
  /** How close to the exact angle, 0–1. */
  tightness: number
  /** drishti × tightness. */
  strength: number
  tone: "harmony" | "friction" | "mixed"
  fa: string
}

// ── 3 · NARRATIVE ────────────────────────────────────────────────────────────

export type SynthesisKey =
  | "identity"
  | "emotion"
  | "relationship"
  | "career"
  | "strengths"
  | "growth"
  | "themes"
  | "chapter"
  | "influences"

export interface SynthesisSection {
  key: SynthesisKey
  title: string
  subtitle: string
  /** 0–100, derived only from the evidence listed below. */
  score: number
  level: "low" | "mid" | "high"
  /** Persian narrative assembled from the interpretations — adds no new facts. */
  summary: string
  evidence: Evidence[]
}

export interface ChartSignals {
  grahas: GrahaSignal[]
  dominant: GrahaSignal
  lagnaLord: GrahaSignal
  tenthLord: GrahaSignal
  elements: BalanceSlice[]
  modalities: BalanceSlice[]
  houses: HouseEmphasis[]
  lords: LordPlacement[]
  missing: string[]
}

export interface ChartIntelligence {
  /** 1 · CALCULATED — the chart this was derived from, unmodified. */
  chart: NatalChart
  signals: ChartSignals
  relations: ChartRelation[]
  patterns: DetectedPattern[]
  synthesis: SynthesisSection[]
}
