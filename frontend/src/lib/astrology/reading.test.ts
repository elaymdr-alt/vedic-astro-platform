import { describe, expect, it } from "vitest"

import { buildNatalChart, DEMO_PROFILE } from "./test-support"
import { buildReading, DIGNITY_PLAIN, READING_CHAPTERS } from "./reading"

const chart = buildNatalChart(DEMO_PROFILE)
const doc = buildReading(chart)

/** Deep-collect every string in the document. */
function stringsOf(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value)
  else if (Array.isArray(value)) value.forEach((v) => stringsOf(v, out))
  else if (value && typeof value === "object")
    Object.values(value).forEach((v) => stringsOf(v, out))
  return out
}

describe("buildReading — narrative coverage", () => {
  it("exposes every chapter in the navigation, in reading order", () => {
    expect(READING_CHAPTERS.map((c) => c.id)).toEqual([
      "identity",
      "mind",
      "core",
      "houses",
      "grahas",
      "patterns",
      "time",
      "guide",
      "glossary",
    ])
    READING_CHAPTERS.forEach((c) => {
      expect(c.short.trim().length).toBeGreaterThan(0)
      expect(c.title.trim().length).toBeGreaterThan(0)
    })
  })

  it("builds the three hero medallions from lagna, moon and sun", () => {
    expect(doc.hero.medallions.map((m) => m.key)).toEqual(["lagna", "moon", "sun"])
    expect(doc.hero.medallions[0].signKey).toBe(chart.lagna)
    expect(doc.hero.medallions[1].signKey).toBe(chart.moonSign)
    expect(doc.hero.medallions[2].signKey).toBe(chart.sunSign)
    doc.hero.medallions.forEach((m) => expect(m.note.length).toBeGreaterThan(10))
    expect(doc.hero.lede).toContain(DEMO_PROFILE.name!)
  })

  it("explains all twelve houses in order with their real bindu scores", () => {
    expect(doc.houses.items.map((h) => h.house)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ])
    doc.houses.items.forEach((h, i) => {
      expect(h.bindu).toBe(chart.ashtakavarga[i])
      expect(h.matters.length).toBeGreaterThan(0)
      expect(h.line.length).toBeGreaterThan(10)
      expect(["green", "amber", "red"]).toContain(h.tone)
    })
    expect(doc.houses.summary.length).toBeGreaterThan(20)
  })

  it("gives a plain-language voice to all nine grahas", () => {
    expect(doc.grahas.voices.map((v) => v.key)).toEqual([
      "sun",
      "moon",
      "mars",
      "mercury",
      "jupiter",
      "venus",
      "saturn",
      "rahu",
      "ketu",
    ])
    doc.grahas.voices.forEach((v) => {
      expect(v.body.length).toBeGreaterThan(50)
      expect(v.badge.trim().length).toBeGreaterThan(0)
      expect(v.house).toBeGreaterThanOrEqual(1)
      expect(v.house).toBeLessThanOrEqual(12)
    })
  })

  it("keeps at most the three strongest yogas and doshas", () => {
    expect(doc.patterns.yogas.length).toBeLessThanOrEqual(3)
    expect(doc.patterns.doshas.length).toBeLessThanOrEqual(3)
    expect(doc.patterns.note.length).toBeGreaterThan(10)
    ;[...doc.patterns.yogas, ...doc.patterns.doshas].forEach((p) => {
      expect(p.description.length).toBeGreaterThan(5)
      expect(p.strengthLabel.length).toBeGreaterThan(0)
    })
  })

  it("flags exactly one active mahadasha in the timeline", () => {
    expect(doc.time.timeline.length).toBeGreaterThan(0)
    expect(doc.time.timeline.filter((t) => t.active)).toHaveLength(1)
    expect(doc.time.period.trim().length).toBeGreaterThan(0)
    expect(doc.time.description.length).toBeGreaterThan(20)
  })

  it("offers three practical tips and four lucky facts", () => {
    expect(doc.guide.tips).toHaveLength(3)
    expect(doc.guide.facts).toHaveLength(4)
    doc.guide.tips.forEach((t) => expect(t.length).toBeGreaterThan(30))
    expect(doc.guide.mantra.length).toBeGreaterThan(0)
    expect(doc.guide.blessing.length).toBeGreaterThan(10)
  })

  it("glosses the deep terms in simple Persian", () => {
    expect(doc.glossary.length).toBeGreaterThanOrEqual(5)
    doc.glossary.forEach((g) => {
      expect(g.term.trim().length).toBeGreaterThan(0)
      expect(g.body.length).toBeGreaterThan(30)
    })
    const terms = doc.glossary.map((g) => g.term).join(" ")
    expect(terms).toContain("لگنا")
    expect(terms).toContain("داشا")
  })

  it("maps every dignity to a plain-language explanation", () => {
    for (const d of ["exalted", "own", "friendly", "neutral", "enemy", "debilitated"]) {
      expect(DIGNITY_PLAIN[d]?.length).toBeGreaterThan(20)
    }
  })

  it("ships no empty strings anywhere in the document", () => {
    const strings = stringsOf(doc)
    expect(strings.length).toBeGreaterThan(80)
    strings.forEach((s) => expect(s.trim().length).toBeGreaterThan(0))
  })

  it("writes the narrative in Persian", () => {
    const narrative = [
      doc.hero.lede,
      doc.identity.concept,
      doc.mind.concept,
      doc.core.concept,
      doc.houses.concept,
      doc.grahas.concept,
      doc.patterns.concept,
      doc.time.concept,
      doc.guide.concept,
      doc.identity.quote,
      doc.mind.quote,
      doc.core.quote,
      doc.guide.blessing,
      ...doc.identity.paragraphs,
      ...doc.mind.paragraphs,
      ...doc.core.paragraphs,
      ...doc.guide.tips,
      ...doc.grahas.voices.map((v) => v.body),
      ...doc.houses.items.map((h) => h.line),
    ]
    narrative.forEach((s) => expect(s).toMatch(/[\u0600-\u06FF]/))
  })

  it("leaks no raw English enum into the Persian prose", () => {
    // The matching test above only proves *one* Persian character exists, so a
    // sentence like «در برج pisces» sails through it. This one asserts the
    // stronger property directly: no Latin run may appear in reader-facing
    // prose. Machine keys (lagna, grahas, key/tone/…) are excluded — they never
    // reach the UI, so requiring them to be Persian would be noise.
    const LATIN = /[A-Za-z]{2,}/

    // Fields that are styling or styling-adjacent (`accent: "chart-3"`,
    // `badgeTone: "hard"`) are fed to className, never printed. `name` holds the
    // Sanskrit yoga title ("Raja Yoga") which `PatternCard` deliberately shows
    // beside its Persian `fa` in a `dir="ltr"` span — that pairing is the
    // design, not a leak.
    const MACHINE_KEYS = new Set([
      "key", "signKey", "graha", "kind", "level", "id", "from", "to",
      "strength", "house", "type", "scope", "slug",
      "accent", "badgeTone", "glyph", "tone", "name",
    ])
    const PROSE_KEYS = new Set([
      "lede", "concept", "quote", "body", "line", "title", "short", "text",
      "mantra", "blessing", "term", "invalidation", "advice", "headline",
      "fromLabel", "toLabel", "strengthLabel", "description", "summary",
      "fa", "signifies", "meaning", "note",
    ])

    const offenders: string[] = []
    const walk = (node: unknown, path: string): void => {
      if (typeof node === "string") {
        if (LATIN.test(node)) offenders.push(`${path}: ${node}`)
        return
      }
      if (Array.isArray(node)) {
        node.forEach((v, i) => walk(v, `${path}[${i}]`))
        return
      }
      if (node && typeof node === "object") {
        for (const [k, v] of Object.entries(node)) {
          if (MACHINE_KEYS.has(k)) continue
          if (PROSE_KEYS.has(k) && typeof v === "string") {
            if (LATIN.test(v)) offenders.push(`${path}.${k}: ${v}`)
          } else {
            walk(v, `${path}.${k}`)
          }
        }
      }
    }
    walk(doc, "doc")

    expect(offenders).toEqual([])
  })
})
