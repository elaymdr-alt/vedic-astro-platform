/**
 * Intelligence Engine — evidence-integrity tests.
 *
 * The point of this suite is not coverage for its own sake. It pins the one
 * property that separates this engine from the fabricated numbers it replaced:
 *
 *   every score is a pure function of the evidence printed next to it.
 *
 * If a section can produce a number its own evidence list does not explain,
 * the engine is lying again — so that is asserted directly, per section,
 * against the declared maximum for that section.
 */
import { describe, expect, it } from "vitest"

import { buildNatalChart, DEMO_PROFILE } from "../test-support"
import {
  allEvidence,
  buildIntelligence,
  buildSignals,
  detectPatterns,
  synthesize,
  type SynthesisSection,
} from "."

/** A fixed clock: nothing in this suite may read the ambient date. */
const NOW = new Date("2024-06-15T12:00:00.000Z")

const chart = buildNatalChart(DEMO_PROFILE)
const intel = buildIntelligence(chart, NOW)

/** The declared weight ceiling per section — mirrors `synthesis.ts`. */
const MAXES: Record<SynthesisSection["key"], number> = {
  identity: 4,
  emotion: 3,
  relationship: 3,
  career: 3,
  strengths: 4,
  growth: 5,
  themes: 4,
  chapter: 3,
  influences: 3,
}

const recompute = (s: SynthesisSection) =>
  Math.round(Math.min(1, s.evidence.reduce((t, e) => t + e.weight, 0) / MAXES[s.key]) * 100)

describe("buildSignals — scored, traceable graha strength", () => {
  it("scores all nine grahas and returns them strongest first", () => {
    const { grahas } = intel.signals
    expect(grahas).toHaveLength(9)
    for (let i = 1; i < grahas.length; i++) {
      expect(grahas[i - 1].score).toBeGreaterThanOrEqual(grahas[i].score)
    }
  })

  it("keeps every score inside 0–100 and never produces an empty reason", () => {
    intel.signals.grahas.forEach((g) => {
      expect(g.score).toBeGreaterThanOrEqual(0)
      expect(g.score).toBeLessThanOrEqual(100)
      expect(g.reasons.length).toBeGreaterThan(0)
      g.reasons.forEach((r) => expect(r.trim().length).toBeGreaterThan(0))
      // The five declared components must all be present, so the UI can show
      // the arithmetic instead of a bare score.
      Object.values(g.parts).forEach((v) => {
        expect(Number.isFinite(v)).toBe(true)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      })
    })
  })

  it("names the dominant graha as the actual maximum", () => {
    const best = intel.signals.grahas[0]
    expect(intel.signals.dominant.graha).toBe(best.graha)
    expect(intel.signals.dominant.score).toBe(best.score)
  })

  it("resolves the lagna and tenth lords to real placed grahas", () => {
    const placed = new Set(chart.placements.map((p) => p.graha))
    expect(placed.has(intel.signals.lagnaLord.graha)).toBe(true)
    expect(placed.has(intel.signals.tenthLord.graha)).toBe(true)
  })

  it("balances elements and modalities to 100 percent over all nine grahas", () => {
    for (const group of [intel.signals.elements, intel.signals.modalities]) {
      expect(group.reduce((t, g) => t + g.percent, 0)).toBeCloseTo(100, 1)
      expect(group.reduce((t, g) => t + g.count, 0)).toBe(9)
    }
  })

  it("carries the engine's ashtakavarga bindu through untouched", () => {
    expect(intel.signals.houses).toHaveLength(12)
    intel.signals.houses.forEach((h, i) => {
      expect(h.house).toBe(i + 1)
      expect(h.bindu).toBe(chart.ashtakavarga[i])
      expect(h.score).toBeGreaterThanOrEqual(0)
      expect(h.score).toBeLessThanOrEqual(100)
    })
  })

  it("reports exactly which grahas have no shadbala instead of zeroing them", () => {
    intel.signals.missing.forEach((g) => {
      expect(chart.placements.some((p) => p.graha === g)).toBe(true)
    })
  })

  it("is a pure function of the chart", () => {
    expect(buildSignals(chart)).toEqual(buildSignals(chart))
  })
})

describe("detectPatterns — figures proven from real placements", () => {
  it("only reports grahas and houses that are actually in the chart", () => {
    const placed = new Set(chart.placements.map((p) => p.graha))
    detectPatterns(chart).forEach((p) => {
      expect(p.grahas.length).toBeGreaterThanOrEqual(3)
      p.grahas.forEach((g) => expect(placed.has(g)).toBe(true))
      p.houses.forEach((h) => {
        expect(h).toBeGreaterThanOrEqual(1)
        expect(h).toBeLessThanOrEqual(12)
      })
      p.signs.forEach((s) => expect(chart.placements.some((pp) => pp.sign === s)).toBe(true))
    })
  })

  it("derives every score in range with an explanation attached", () => {
    detectPatterns(chart).forEach((p) => {
      expect(p.score).toBeGreaterThanOrEqual(0)
      expect(p.score).toBeLessThanOrEqual(100)
      expect(p.detail.trim().length).toBeGreaterThan(0)
      expect(p.meaning.trim().length).toBeGreaterThan(0)
      // Geometry-derived figures must never be passed off as classical jyotish.
      expect(["jyotish", "geometry"]).toContain(p.school)
    })
  })

  it("scores a Yod from its own geometry instead of a hardcoded constant", () => {
    const yod = detectPatterns(chart).find((p) => p.key === "yod")
    if (!yod) return
    // Exact 60/150/60 triplicity is the ceiling; any deviation reduces it.
    expect(yod.score).toBeLessThanOrEqual(100)
    expect(yod.score).toBeGreaterThanOrEqual(55)
    // The derivation must quote real sign distances (Persian or ASCII digits).
    expect(yod.detail).toMatch(/[\u06F0-\u06F90-9]/)
  })

  it("returns the same detection on repeated calls", () => {
    expect(detectPatterns(chart)).toEqual(detectPatterns(chart))
  })
})

describe("synthesize — the score-vs-evidence invariant", () => {
  it("emits all nine sections, in order, each fully populated", () => {
    expect(intel.synthesis.map((s) => s.key)).toEqual([
      "identity",
      "emotion",
      "relationship",
      "career",
      "strengths",
      "growth",
      "themes",
      "chapter",
      "influences",
    ])
    intel.synthesis.forEach((s) => {
      expect(s.title.trim().length).toBeGreaterThan(0)
      expect(s.subtitle.trim().length).toBeGreaterThan(0)
      expect(s.summary.trim().length).toBeGreaterThan(0)
      expect(s.evidence.length).toBeGreaterThan(0)
      expect(s.evidence.every((e) => e.label.trim() && e.detail.trim())).toBe(true)
      expect(s.evidence.every((e) => e.weight > 0)).toBe(true)
    })
  })

  it("derives every score from its own evidence weights and declared max", () => {
    intel.synthesis.forEach((s) => {
      expect(s.score).toBe(recompute(s))
    })
  })

  it("keeps levels consistent with the score thresholds", () => {
    intel.synthesis.forEach((s) => {
      const expected = s.score >= 66 ? "high" : s.score >= 40 ? "mid" : "low"
      expect(s.level).toBe(expected)
    })
  })

  it("writes every section in Persian", () => {
    intel.synthesis.forEach((s) => {
      expect(s.summary).toMatch(/[\u0600-\u06FF]/)
      s.evidence.forEach((e) => expect(e.label).toMatch(/[\u0600-\u06FF]/))
    })
  })

  // Raw internal enum keys must never reach the reader. A detail reading
  // «عنصر air / وجه fixed» or «بخت red» is machine data, not Persian prose.
  it("never leaks raw English enum values into evidence or summaries", () => {
    const LEAKS = /\b(fire|earth|air|water|cardinal|fixed|mutable|green|amber|red)\b/
    intel.synthesis.forEach((s) => {
      expect(`${s.key} ${s.summary}`).not.toMatch(LEAKS)
      s.evidence.forEach((e) => {
        expect(`${s.key} ${e.label} ${e.detail}`).not.toMatch(LEAKS)
      })
    })
  })

  it("is deterministic for a fixed clock and does not drift with it", () => {
    const a = synthesize(chart, intel.signals, intel.patterns, intel.relations, NOW)
    const b = synthesize(chart, intel.signals, intel.patterns, intel.relations, NOW)
    expect(a).toEqual(b)

    const later = synthesize(
      chart,
      intel.signals,
      intel.patterns,
      intel.relations,
      new Date("2040-01-01T00:00:00.000Z"),
    )
    // Time-independent sections must not change with the clock.
    expect(later.find((s) => s.key === "identity")).toEqual(
      a.find((s) => s.key === "identity"),
    )
  })

  it("flattens evidence strongest-first for display", () => {
    const flat = allEvidence(intel.synthesis)
    expect(flat.length).toBeGreaterThan(20)
    for (let i = 1; i < flat.length; i++) {
      expect(flat[i - 1].weight).toBeGreaterThanOrEqual(flat[i].weight)
    }
    flat.forEach((e) => expect(e.section.trim().length).toBeGreaterThan(0))
  })
})

describe("buildIntelligence — end to end", () => {
  it("passes the chart through without modifying it", () => {
    expect(intel.chart).toBe(chart)
  })

  it("produces identical output for identical inputs", () => {
    const again = buildIntelligence(chart, NOW)
    expect(again.signals).toEqual(intel.signals)
    expect(again.patterns).toEqual(intel.patterns)
    expect(again.synthesis).toEqual(intel.synthesis)
  })

  it("changes the reading when the birth data changes", () => {
    // Nine hours of birth-time shift moves the lagna, so the whole reading
    // must change — if it did not, the synthesis would be decorative.
    const shifted = buildNatalChart({
      ...DEMO_PROFILE,
      time: "15:42",
      timeKnown: true,
    })
    expect(shifted.lagna).not.toBe(chart.lagna)
    expect(buildIntelligence(shifted, NOW).synthesis).not.toEqual(intel.synthesis)
  })

  it("never exposes a confidence or probability field", () => {
    const json = JSON.stringify(intel)
    expect(json).not.toMatch(/confidence|probability|probabilit/i)
  })

  it("leaks no raw English enum into any user-facing string", () => {
    // The engine's internal keys are English (`element: "fire"`,
    // `modality: "cardinal"`, `fortune: "red"`). Those are fine in code, but a
    // label built by interpolating one reaches the user verbatim — the exact
    // leak fixed via ELEMENT/MODALITY/FORTUNE_LABELS in `synthesis.ts`. This
    // walks *every* Persian string in the payload rather than the synthesis
    // alone, so `patterns.ts` and `reading.ts` are covered too.
    const offenders: string[] = []

    // Only *prose* fields reach the reader. `key`, `kind`, `level`, `grahas`
    // and `signs` are machine discriminators used for lookup and styling, so
    // their English is by design; only interpolated text is the bug.
    const PROSE = new Set(["summary", "subtitle", "label", "detail", "meaning", "reasons"])

    const check = (text: string, path: string): void => {
      // A Latin run of 2+ chars inside a Persian sentence is an untranslated
      // enum (`pisces`, `fire`, `cardinal`), never a legitimate token.
      if (/[A-Za-z]{2,}/.test(text)) offenders.push(`${path}: ${text}`)
    }

    const walk = (node: unknown, path: string): void => {
      if (typeof node === "string") return
      if (Array.isArray(node)) {
        node.forEach((v, i) => walk(v, `${path}[${i}]`))
        return
      }
      if (node && typeof node === "object") {
        for (const [k, v] of Object.entries(node)) {
          const next = `${path}.${k}`
          if (k === "reasons" && Array.isArray(v)) {
            v.forEach((t, i) => typeof t === "string" && check(t, `${next}[${i}]`))
          } else if (PROSE.has(k) && typeof v === "string") {
            check(v, next)
          } else {
            walk(v, next)
          }
        }
      }
    }

    // `chart` is the raw calculation and legitimately carries English keys.
    // `signals` is walked because `GrahaSignal.reasons` is prose built inside
    // `signals.ts` — the layer the synthesis labels do not cover.
    walk({ synthesis: intel.synthesis, patterns: intel.patterns }, "intelligence")
    walk({ signals: intel.signals }, "signals")

    expect(offenders).toEqual([])
  })
})
