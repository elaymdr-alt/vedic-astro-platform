/**
 * Pattern detection — Phase 1 of the Intelligence Engine.
 *
 * Every pattern here is proven from real longitudes. Nothing is emitted
 * "because it makes the page prettier" (spec §9). Two families are detected:
 *
 *   • GEOMETRY patterns come from exact sign-distance relationships in the
 *     zodiac wheel (120° trines, 90° squares, 60° sextiles …). They are
 *     computed from the difference of sign indices, so the maths is auditable.
 *
 *   • JYOTISH patterns come from this project's own classical base (Chara
 *     Rashi locomotion, Kalasarp occupancy).
 *
 * `school` is carried all the way to the UI so a geometric figure is never
 * presented as if it were a classical Jyotish teaching.
 *
 * Design note: the engine's `aspects.ts` models *classical Graha Drishti*
 * (whole-sign 2nd/4th/7th aspects), which has no 60° or 150° aspect. The
 * geometric family therefore derives its angles from raw sign distance
 * directly rather than pretending to reuse Drishti, and a pattern whose
 * members do not actually see each other is still reported — with its real
 * drishti value attached — instead of being silently dropped.
 */

import { SIGN_KEYS } from "../chart"
import { faNum } from "../format"
import { getRashi } from "../signs"
import { drishtiValue } from "../engine/aspects"
import type { GrahaKey, NatalChart, SignKey } from "../types"
import type { DetectedPattern, PatternKey } from "./types"

/** 0-based sign index of a placement. */
const si = (sign: SignKey) => SIGN_KEYS.indexOf(sign)

/**
 * Circular angular separation in degrees between two placements, 0–180.
 * Uses absolute longitude so it is independent of the zodiac ordering
 * a human happens to read the chart in.
 */
function separation(a: NatalChart["placements"][number], b: NatalChart["placements"][number]): number {
  const raw = Math.abs(si(a.sign) * 30 + a.degreeInSign - (si(b.sign) * 30 + b.degreeInSign))
  return Math.min(raw, 360 - raw)
}

/** All placement pairs sitting `target` degrees apart (± tol), strongest first. */
function pairs(ps: NatalChart["placements"], target: number, tol = 8) {
  const out: [number, number, number][] = []
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const sep = separation(ps[i], ps[j])
      if (Math.abs(sep - target) <= tol) out.push([i, j, sep])
    }
  }
  return out
}

/** A "soft" graha set excludes the lunar nodes for tonal patterns. */
const isBody = (p: { graha: GrahaKey }) => p.graha !== "rahu" && p.graha !== "ketu"

function build(
  members: NatalChart["placements"],
  extra: Omit<DetectedPattern, "grahas" | "houses" | "signs">,
): DetectedPattern {
  return {
    ...extra,
    grahas: members.map((m) => m.graha),
    houses: [...new Set(members.map((m) => m.house))].sort((a, b) => a - b),
    signs: [...new Set(members.map((m) => m.sign))],
  }
}

/** Average classical drishti each member receives from the others. */
function mutualDrishti(members: NatalChart["placements"]): number {
  let total = 0
  let pairs = 0
  for (const m of members) {
    for (const o of members) {
      if (m === o) continue
      const d = (((si(o.sign) - si(m.sign) + 12) % 12) + 1)
      total += drishtiValue(m.graha, d)
      pairs++
    }
  }
  return pairs ? total / pairs : 0
}

/**
 * Detect every pattern the chart actually supports.
 * Returns `[]` rather than a fabricated fallback when a chart shows none.
 */
export function detectPatterns(chart: NatalChart): DetectedPattern[] {
  const found = new Map<PatternKey, DetectedPattern>()
  const add = (p: DetectedPattern) => {
    const prev = found.get(p.key)
    if (!prev || p.score > prev.score) found.set(p.key, p)
  }

  detectStelliums(chart).forEach(add)
  detectTrines(chart).forEach(add)
  detectSquares(chart).forEach(add)
  detectYods(chart).forEach(add)
  detectHemisphere(chart).forEach(add)
  detectLocomotion(chart).forEach(add)
  detectKalasarpa(chart).forEach(add)

  return [...found.values()].sort((a, b) => b.score - a.score)
}
// ── Stellium ─────────────────────────────────────────────────────────────────

/** Three or more grahas inside a single sign — a concentration of weight. */
function detectStelliums(chart: NatalChart): DetectedPattern[] {
  const bySign = new Map<SignKey, NatalChart["placements"]>()
  for (const p of chart.placements) {
    const list = bySign.get(p.sign) ?? []
    list.push(p)
    bySign.set(p.sign, list)
  }

  const out: DetectedPattern[] = []
  for (const [sign, group] of bySign) {
    if (group.length < 3) continue
    const spread = Math.max(...group.map((p) => p.degreeInSign)) - Math.min(...group.map((p) => p.degreeInSign))
    // Tighter clusters score higher: a 4° cluster and a 29° cluster are not equal.
    const tightness = Math.max(0, 1 - spread / 30)
    const score = Math.min(100, Math.round(45 + group.length * 12 + tightness * 20))

    out.push(
      build(group, {
        key: "stellium",
        name: "Stellium",
        fa: `تجمع سیارات در برج ${getRashi(sign).fa}`,
        school: "geometry",
        tone: "focus",
        score,
        meaning: "چند سیاره در یک برج، موضوع آن برج را در چارت پررنگ می‌کند.",
        expression: "انرژی چند گرایش روی هم می‌افتند و آن موضوع به مرکز توجه و هویت فرد می‌آید.",
        detail: `${faNum(group.length)} سیاره در یک برج، با پراکندگی ${faNum(Math.round(spread))} درجه.`,
      })
    )
  }
  return out
}

// ── Grand Trine ──────────────────────────────────────────────────────────────

/** Three grahas mutually ~120° apart — an equilateral figure of one element. */
function detectTrines(chart: NatalChart): DetectedPattern[] {
  const ps = chart.placements.filter(isBody)
  const out: DetectedPattern[] = []
  const seen = new Set<string>()

  for (const [i, j, sepIJ] of pairs(ps, 120)) {
    for (let k = 0; k < ps.length; k++) {
      if (k === i || k === j) continue
      const sepIK = separation(ps[i], ps[k])
      const sepJK = separation(ps[j], ps[k])
      if (Math.abs(sepIK - 120) > 8 || Math.abs(sepJK - 120) > 8) continue

      const members = [ps[i], ps[j], ps[k]]
      const key = members.map((m) => m.graha).sort().join("|")
      if (seen.has(key)) continue
      seen.add(key)

      const drishti = mutualDrishti(members)
      const exactness = 1 - (Math.abs(sepIJ - 120) + Math.abs(sepIK - 120) + Math.abs(sepJK - 120)) / (3 * 8)
      const score = Math.round(Math.min(100, 55 + exactness * 25 + drishti * 20))

      out.push(
        build(members, {
          key: "grand_trine",
          name: "Grand Trine",
          fa: "مثلث بزرگ",
          school: "geometry",
          tone: "harmony",
          score,
          meaning: "سه سیاره در فاصله‌ی نزدیک به ۱۲۰ درجه از هم؛ یک عنصر را کامل می‌کنند.",
          expression:
            "توانایی ذاتی در یک حوزه که وقتی شرایطش فراهم باشد خودبه‌خود جاری می‌شود؛ نقطه‌ی قوت طبیعی.",
          detail: `فاصله‌ها: ${faNum(Math.round(sepIJ))}°، ${faNum(Math.round(sepIK))}°، ${faNum(Math.round(sepJK))}°.`,
        })
      )
    }
  }
  return out
}

// ── Grand Cross / T-Square ───────────────────────────────────────────────────

/**
 * T-Square = a 180° opposition plus a third graha 90° from *both* ends.
 * Grand Cross = two T-Squares sharing the same opposition (four corners).
 * Both are proven from the opposition pair first, then closed outward.
 */
function detectSquares(chart: NatalChart): DetectedPattern[] {
  const ps = chart.placements.filter(isBody)
  const out: DetectedPattern[] = []
  const seen = new Set<string>()

  for (const [i, j, sepIJ] of pairs(ps, 180, 10)) {
    // Every graha sitting 90° from both ends of the opposition.
    const apices = ps
      .map((p, idx) => ({ p, idx }))
      .filter(({ p, idx }) => {
        if (idx === i || idx === j) return false
        return (
          Math.abs(separation(ps[i], p) - 90) <= 10 && Math.abs(separation(ps[j], p) - 90) <= 10
        )
      })

    if (apices.length >= 2) {
      const [a, b] = apices
      const members = [ps[i], ps[j], a.p, b.p]
      const key = members.map((m) => m.graha).sort().join("|")
      if (!seen.has(key)) {
        seen.add(key)
        out.push(
          build(members, {
            key: "grand_cross",
            name: "Grand Cross",
            fa: "صلیب بزرگ",
            school: "geometry",
            tone: "tension",
            score: Math.round(Math.min(100, 70 + mutualDrishti(members) * 20)),
            meaning:
              "چهار سیاره در چهار گوشه‌ی ۹۰ درجه؛ نیروها روبروی هم قرار می‌گیرند و هیچ‌کدام بر دیگری مسلط نیست.",
            expression:
              "فرد میان چهار خواسته یا مسئولیت متضاد گیر می‌کند؛ تعادل مدیریتی و انعطاف در اولویت است.",
            detail: `دو محور مقابل با فاصله‌ی ${faNum(Math.round(sepIJ))}° و دو رأس با زاویه‌ی ۹۰°.`,
          })
        )
      }
    }

    if (apices.length >= 1) {
      const apex = apices[0].p
      const members = [ps[i], ps[j], apex]
      const key = `ts:${members.map((m) => m.graha).sort().join("|")}`
      if (!seen.has(key)) {
        seen.add(key)
        out.push(
          build(members, {
            key: "t_square",
            name: "T-Square",
            fa: "مربع T",
            school: "geometry",
            tone: "tension",
            score: Math.round(Math.min(100, 58 + mutualDrishti(members) * 22)),
            meaning: "دو سیاره در مقابل هم و سیاره‌ی سوم در ۹۰ درجه از هر دو؛ تنش فشارمحور.",
            expression:
              "انرژی از یک نقطه‌ی فشار تخلیه می‌شود؛ آن خانه محور اصلی تنش و رشد است.",
            detail: `محور ${faNum(Math.round(sepIJ))}° و رأس با زاویه‌ی ۹۰° از هر دو.`,
          })
        )
      }
    }
  }
  return out
}

// ── Yod ──────────────────────────────────────────────────────────────────────

/**
 * Yod = "finger of God": two grahas ~60° apart forming a base, with a third
 * ~150° from one and ~90° from the other. Proven by the base pair first.
 */
function detectYods(chart: NatalChart): DetectedPattern[] {
  const ps = chart.placements.filter(isBody)
  const out: DetectedPattern[] = []
  const seen = new Set<string>()

  for (const [i, j, sepIJ] of pairs(ps, 60, 8)) {
    for (let k = 0; k < ps.length; k++) {
      if (k === i || k === j) continue
      const sepIK = separation(ps[i], ps[k])
      const sepJK = separation(ps[j], ps[k])
      const isYod =
        (Math.abs(sepIK - 150) <= 10 && Math.abs(sepJK - 90) <= 10) ||
        (Math.abs(sepJK - 150) <= 10 && Math.abs(sepIK - 90) <= 10)
      if (!isYod) continue

      const members = [ps[i], ps[j], ps[k]]
      const key = members.map((m) => m.graha).sort().join("|")
      if (seen.has(key)) continue
      seen.add(key)

      const apex = members[2]
      // Same derivation shape as the other geometry figures: how exactly the
      // three angles land on 60/150/90, plus how much classical drishti the
      // members actually exchange. Clamped because the yod test allows ±10°
      // while the exactness term is normalised against the ±8° pair tolerance.
      const exactness = Math.max(
        0,
        1 - (Math.abs(sepIJ - 60) + Math.abs(sepIK - 150) + Math.abs(sepJK - 90)) / (3 * 8),
      )
      const score = Math.round(Math.min(100, 55 + exactness * 25 + mutualDrishti(members) * 20))

      out.push(
        build(members, {
          key: "yod",
          name: "Yod",
          fa: "انگشت خدا",
          school: "geometry",
          tone: "focus",
          score,
          meaning: "دو سیاره با زاویه‌ی ۶۰ درجه پایه می‌سازند و سیاره‌ی سوم با زاویه‌ی ۱۵۰ درجه آن را نقطه‌ی تمرکز می‌کند.",
          expression: `تمرکز زندگی به‌طور ناخودآگاه روی موضوع خانه‌ی ${faNum(apex.house)} می‌رود و تا رسیدن به آن، بی‌قراری پابرجاست.`,
          detail: `پایه: ${faNum(Math.round(sepIJ))}° — رأس: ${faNum(Math.round(sepIK))}° و ${faNum(Math.round(sepJK))}°.`,
        })
      )
    }
  }
  return out
}

// ── Bowl / Seesaw (hemisphere charts) ────────────────────────────────────────

/**
 * Both figures are proven on the ecliptic longitudes:
 *   • Bowl   — every graha falls inside one 180° half of the wheel, leaving a
 *              single empty point at the opposite middle (a closed container).
 *   • Seesaw — an axis whose two ends are both empty of grahas, so the wheel
 *              balances on the two sides with an empty corridor between them.
 */
function detectHemisphere(chart: NatalChart): DetectedPattern[] {
  const ps = chart.placements
  const out: DetectedPattern[] = []
  const lon = (p: (typeof ps)[number]) => si(p.sign) * 30 + p.degreeInSign
  const all = ps.map(lon)

  // Bowl: some 180° window contains every graha.
  let bestBowl: { start: number; span: number } | null = null
  for (let start = 0; start < 360; start += 15) {
    const inside = all.every((l) => (l - start + 360) % 360 < 180)
    if (!inside) continue
    const occupied = all.map((l) => (l - start + 360) % 360)
    const span = Math.max(...occupied) - Math.min(...occupied)
    if (!bestBowl || span < bestBowl.span) bestBowl = { start, span }
  }

  if (bestBowl) {
    const gapAt = (bestBowl.start + 180) % 360
    out.push(
      build(ps, {
        key: "bowl",
        name: "Bowl",
        fa: "کاسه",
        school: "geometry",
        tone: "focus",
        score: Math.round(Math.min(100, 50 + (180 - bestBowl.span) / 3.6)),
        meaning: "همه‌ی سیارات در یک نیمه‌ی دایره جمع شده‌اند و یک نقطه‌ی خالی، شکل را می‌بندد.",
        expression:
          "انرژی در یک حوزه جمع می‌شود؛ نقطه‌ی خالی، ورود جهان بیرون به این کاسه است.",
        detail: `بازه‌ی اشغال‌شده ${faNum(Math.round(bestBowl.span))}° از ۱۸۰°؛ خلأ در ${faNum(gapAt)}°.`,
      })
    )
  }

  // Seesaw: an axis whose two ends hold no graha and both halves are populated.
  for (let axis = 0; axis < 360; axis += 15) {
    const ends = [axis, (axis + 180) % 360]
    const near = all.filter((l) =>
      ends.some((e) => Math.min(Math.abs(l - e), 360 - Math.abs(l - e)) < 45)
    )
    if (near.length > 1) continue
    const sides = new Set(all.map((l) => (((l - axis + 360) % 360) < 180 ? 1 : 2)))
    if (sides.size < 2) continue
    out.push(
      build(ps, {
        key: "seesaw",
        name: "Seesaw",
        fa: "ترازو",
        school: "geometry",
        tone: "tension",
        score: Math.round(Math.min(100, 55 + (2 - near.length) * 20)),
        meaning: "نزدیک دو سر یک محور هیچ سیاره‌ای نیست؛ توزیع در دو سوی ترازو متقارن است.",
        expression:
          "فرد مدام میان دو قطب حرکت می‌کند و تعادل میان آن‌ها کار اصلی زندگی اوست.",
        detail: `محور خالی در ${faNum(axis)}°؛ توزیع در دو نیمه‌ی مقابل.`,
      })
    )
    break
  }

  return out
}

// ── Chara Rashi — Locomotion ─────────────────────────────────────────────────

/**
 * Classical Jyotish technique: grahas confined to the four kendras
 * (1 / 4 / 7 / 10) are "running" — a life driven by outward action.
 * Scored by how exclusively the chart is confined to those houses.
 */
function detectLocomotion(chart: NatalChart): DetectedPattern[] {
  const ps = chart.placements
  const inKendra = ps.filter((p) => [1, 4, 7, 10].includes(p.house))
  if (inKendra.length < 4 || inKendra.length === ps.length) return []

  const empties = [1, 4, 7, 10].filter((h) => !ps.some((p) => p.house === h))

  return [
    build(inKendra, {
      key: "locomotion",
      name: "Locomotion (Chara Rashi)",
      fa: "چارا راشی (زندگی در حرکت)",
      school: "jyotish",
      tone: "focus",
      score: Math.round((inKendra.length / ps.length) * 100),
      meaning: "سیارات عمدتاً در چهار خانه‌ی کندرا (۱، ۴، ۷، ۱۰) قرار دارند.",
      expression:
        "زندگی از راه حرکت و کنش بیرونی پیش می‌رود؛ خانه‌های خالی بیشترین فشار را برای فعال‌سازی وارد می‌کنند.",
      detail: `${faNum(inKendra.length)} از ${faNum(ps.length)} سیاره در کندراها؛ خانه‌های خالی: ${empties.map((h) => faNum(h)).join("، ")}.`,
    }),
  ]
}

// ── Kalasarpa ─────────────────────────────────────────────────────────────────

/**
 * Kalasarpa occupancy: every graha lies on one side of the Rahu–Ketu axis.
 * Reported with its true measured share so the reader can judge how lopsided
 * it is, rather than as a flat label.
 */
function detectKalasarpa(chart: NatalChart): DetectedPattern[] {
  const rahu = chart.placements.find((p) => p.graha === "rahu")
  if (!rahu) return []
  const axis = si(rahu.sign) * 30 + rahu.degreeInSign
  const others = chart.placements.filter((p) => p.graha !== "rahu" && p.graha !== "ketu")
  if (others.length === 0) return []

  const upper = others.filter((p) => (si(p.sign) * 30 + p.degreeInSign - axis + 360) % 360 < 180).length
  if (upper !== 0 && upper !== others.length) return []

  return [
    build(chart.placements, {
      key: "kalasarpa",
      name: "Kalasarpa",
      fa: "کال‌سارپ",
      school: "jyotish",
      tone: "focus",
      score: Math.round((Math.max(upper, others.length - upper) / others.length) * 100),
      meaning: "همه‌ی سیارات در یک سوی محور گره‌های ماه قرار گرفته‌اند.",
      expression:
        "کلاسیک‌ها این حالت را نیازمند توجه و پشتیبانی می‌دانند؛ یعنی تمرکز انرژی در یک نیمه از زندگی.",
      detail: `${faNum(Math.max(upper, others.length - upper))} از ${faNum(others.length)} سیاره در یک نیمه‌ی محور گره‌ها.`,
    }),
  ]
}
