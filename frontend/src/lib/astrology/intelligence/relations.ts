/**
 * Relationship / correlation layer.
 *
 * Turns the raw drishti matrix produced by `engine/aspects.ts` into named
 * relationships between the factors the synthesis layer actually reasons
 * about (Sun, Moon, Lagna lord, Venus, Mars, Saturn, 7th and 10th lords).
 *
 * Nothing is invented here either: every `ChartRelation` points back to a real
 * aspect row, and `strength` is that row's own `drishti × tightness`.
 */

import { SIGN_KEYS } from "../chart"
import { grahaFa } from "../planets"
import { getRashi } from "../signs"
import { ASPECT_KIND_FA, grahaAspects } from "../engine/aspects"
import type { GrahaKey, NatalChart } from "../types"
import type { ChartRelation } from "./types"

const round = (n: number) => Math.round(n * 100) / 100

/** Ascendant lord, plus the 7th and 10th lords — the three relationship hubs. */
export function hubGrahas(chart: NatalChart): GrahaKey[] {
  return [
    getRashi(chart.lagna).lord,
    "sun",
    "moon",
    "venus",
    "mars",
    "saturn",
  ]
}

/** The 7th house lord — significator of partnership. */
export function seventhLord(chart: NatalChart): GrahaKey {
  return getRashi(SIGN_KEYS[(SIGN_KEYS.indexOf(chart.lagna) + 6) % 12]).lord
}

/** The 10th house lord — significator of career and public standing. */
export function tenthLord(chart: NatalChart): GrahaKey {
  return getRashi(SIGN_KEYS[(SIGN_KEYS.indexOf(chart.lagna) + 9) % 12]).lord
}

/** Classical tone of a pair: benefics harmonise, malefics intensify. */
function toneOf(from: GrahaKey, to: GrahaKey, distance: number): ChartRelation["tone"] {
  const benefic = (g: GrahaKey) => g === "jupiter" || g === "venus" || g === "moon"
  const malefic = (g: GrahaKey) => g === "mars" || g === "saturn" || g === "rahu" || g === "ketu"
  if (distance === 7) return malefic(from) && benefic(to) ? "mixed" : malefic(from) ? "friction" : "harmony"
  if (benefic(from) && benefic(to)) return "harmony"
  if (malefic(from) && malefic(to)) return "friction"
  return "mixed"
}

const TONE_FA: Record<ChartRelation["tone"], string> = {
  harmony: "هماهنگ‌کننده — این دو گرایش یکدیگر را تقویت می‌کنند.",
  friction: "چالش‌برانگیز — این دو گرایش در جهت‌های متضاد فشار می‌آورند.",
  mixed: "دوگانه — اثر این رابطه بسته به شرایط، مثبت یا منفی می‌شود.",
}

/**
 * All significant relationships between hub grahas, strongest first.
 * `minStrength` filters out the negligible long-range drishti rows.
 */
export function relations(chart: NatalChart, minStrength = 0.25): ChartRelation[] {
  const hubs = new Set(hubGrahas(chart))
  hubs.add(seventhLord(chart))
  hubs.add(tenthLord(chart))

  const rows = grahaAspects(chart.placements, (p) => SIGN_KEYS.indexOf(p.sign))

  return rows
    .filter((a) => a.drishti > 0 && a.from !== a.to)
    .filter((a) => hubs.has(a.from) && hubs.has(a.to))
    .map((a) => ({
      from: a.from,
      to: a.to,
      distance: a.distance,
      kind: a.kind,
      drishti: a.drishti,
      tightness: a.tightness,
      strength: round(a.drishti * a.tightness),
      tone: toneOf(a.from, a.to, a.distance),
      fa: `دید ${ASPECT_KIND_FA[a.kind]} ${grahaFa(a.from)} به ${grahaFa(a.to)} — فاصله‌ی ${a.distance} برج. ${TONE_FA[toneOf(a.from, a.to, a.distance)]}`,
    }))
    .filter((r) => r.strength >= minStrength)
    .sort((x, y) => y.strength - x.strength)
}
