/**
 * Synthesis — the narrative layer of the Intelligence Engine.
 *
 * Rules of this file:
 *   • Every section's score is the sum of its own `Evidence` weights against a
 *     declared maximum. Remove the evidence and the score moves — that is the
 *     test that proves no number here is decorative.
 *   • Summaries restate the evidence in Persian. They never introduce a fact
 *     that is not already in the evidence list.
 *   • Language stays probabilistic and reflective. No deterministic
 *     predictions, no claims about death, illness, or guaranteed events.
 *   • There is deliberately no "confidence" or "probability" output. The old
 *     fabricated 82٪ / ۸۰٪ figures are gone by design — the type contract in
 *     `./types.ts` refuses to carry such a field.
 */

import { faNum, formatJalali } from "../format"
import { grahaFa } from "../planets"
import { ELEMENT_LABELS, getRashi, MODALITY_LABELS } from "../signs"
import { FORTUNE_LABELS } from "../chart"
import { activeDasha } from "../engine/dasha"
import type { GrahaKey, NatalChart } from "../types"
import type {
  BalanceSlice,
  ChartRelation,
  ChartSignals,
  DetectedPattern,
  Evidence,
  EvidenceKind,
  GrahaSignal,
  SynthesisSection,
} from "./types"
import { seventhLord } from "./relations"

const round = (n: number) => Math.round(n * 10) / 10
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
/** A 0–100 chart score as a 0–1 evidence weight. */
const pct = (score: number) => clamp01(score / 100)

function ev(kind: EvidenceKind, label: string, detail: string, weight: number): Evidence {
  return { kind, label, detail, weight: round(clamp01(weight) * 100) / 100 }
}

/**
 * Score = weighted evidence, capped by a declared maximum.
 * The maximum is passed in explicitly so the scale of each section is visible
 * and two sections are never silently compared on different denominators.
 */
function scoreFrom(evidence: Evidence[], max: number): number {
  const sum = evidence.reduce((s, e) => s + e.weight, 0)
  return Math.round(Math.min(1, sum / max) * 100)
}

/**
 * Evidence that turned out to carry no weight must never reach the UI.
 *
 * A chip reading «دید معناداری ثبت نشد» with weight 0 is not evidence — it is
 * the *absence* of evidence, and listing it beside real chips implies the same
 * kind of support while contributing nothing to the score. Callers pass such
 * placeholders through `ev(...)` and `dropNulls` strips them before the score
 * is computed, so a section can only ever list facts that moved its number.
 */
function dropNulls(evidence: Evidence[]): Evidence[] {
  return evidence.filter((e) => e.weight > 0)
}

const level = (score: number): SynthesisSection["level"] =>
  score >= 66 ? "high" : score >= 40 ? "mid" : "low"

/**
 * Builds the section. Filtering happens here, once, so that the `evidence`
 * the UI shows is exactly the list the score was computed from — a zero-weight
 * placeholder can never be stored, and `scoreFrom` above already ignores it.
 */
function section(
  key: SynthesisSection["key"],
  title: string,
  subtitle: string,
  score: number,
  evidence: Evidence[],
  summary: string,
): SynthesisSection {
  return {
    key,
    title,
    subtitle,
    score,
    level: level(score),
    summary,
    evidence: dropNulls(evidence),
  }
}

/** Lookup by graha key; the charts that lack one simply score it as absent. */
function sigOf(s: ChartSignals, graha: GrahaKey): GrahaSignal | undefined {
  return s.grahas.find((g) => g.graha === graha)
}

/** A balance slice's share, as a 0–1 weight — a 25% element is a quarter. */
function sliceWeight(slice: BalanceSlice): number {
  return round(clamp01(slice.percent / 100))
}

function topSlice(slices: BalanceSlice[]): BalanceSlice {
  return [...slices].sort((a, b) => b.percent - a.percent)[0]
}

function bottomSlice(slices: BalanceSlice[]): BalanceSlice {
  return [...slices].sort((a, b) => a.percent - b.percent)[0]
}

/** Either direction of a pair counts — drishti is symmetrical in practice. */
function relationBetween(
  rels: ChartRelation[],
  a: GrahaKey,
  b: GrahaKey,
): ChartRelation | undefined {
  return rels.find((r) => (r.from === a && r.to === b) || (r.from === b && r.to === a))
}

/** House emphasis score (0–100) for the nth bhava, 0 when out of range. */
function houseScore(s: ChartSignals, house: number): number {
  return s.houses.find((h) => h.house === house)?.score ?? 0
}

/** One Persian clause naming a graha's real placement, never an invented one. */
function at(sig: GrahaSignal | undefined): string {
  if (!sig) return "در جایگاهی ثبت‌نشده"
  return `در ${getRashi(sig.placement.sign).fa}`
}
// ── 1 · هویت نقشه ────────────────────────────────────────────────────────────

function coreIdentity(chart: NatalChart, s: ChartSignals): SynthesisSection {
  const lagna = getRashi(chart.lagna)
  const lagnaLord = s.lagnaLord
  const dominant = s.dominant
  const topElement = topSlice(s.elements)
  const topModality = topSlice(s.modalities)
  const avHouses = [...s.houses].sort((a, b) => b.bindu - a.bindu).slice(0, 3)

  const evidence: Evidence[] = [
    ev("sign", `لگن: ${lagna.fa}`, `عنصر ${ELEMENT_LABELS[lagna.element].fa} / وجه ${MODALITY_LABELS[lagna.modality].fa} — ${lagna.keyword}`, 1),
    ev("lord", `لرد لگن: ${grahaFa(lagnaLord.graha)}`, `${at(lagnaLord)} — قدرت ${faNum(lagnaLord.score)} از ۱۰۰`, pct(lagnaLord.score)),
    ev("graha", `گرایش غالب: ${grahaFa(dominant.graha)}`, `${at(dominant)} — قدرت ${faNum(dominant.score)} از ۱۰۰`, pct(dominant.score)),
    ev("element", `عنصر غالب: ${topElement.fa}`, `سهم ${faNum(topElement.percent)} درصد از ${faNum(topElement.count)} سیاره`, sliceWeight(topElement)),
    ev("modality", `وجه غالب: ${topModality.fa}`, `سهم ${faNum(topModality.percent)} درصد از ${faNum(topModality.count)} سیاره`, sliceWeight(topModality)),
    ev("av", `خانه‌های پربیندو: ${avHouses.map((h) => faNum(h.house)).join("، ")}`, avHouses.map((h) => `خانه‌ی ${faNum(h.house)} با ${faNum(h.bindu)} بیندو`).join("؛ "), clamp01(avHouses[0].bindu / 48)),
  ]

  const score = scoreFrom(evidence, 4)

  return section(
    "identity",
    "هویت نقشه",
    "لگن، لرد آن، گرایش غالب و توزیع عناصر",
    score,
    evidence,
    `لگن در ${lagna.fa} با عنصر ${ELEMENT_LABELS[lagna.element].fa} و وجه ${MODALITY_LABELS[lagna.modality].fa}، قاب کلی این نقشه را می‌سازد و لرد آن ${grahaFa(lagnaLord.graha)} ${at(lagnaLord)} با قدرت ${faNum(lagnaLord.score)} تعیین می‌کند انرژی نقشه از کجا مدیریت شود. ` +
      `غالب‌ترین سیاره ${grahaFa(dominant.graha)} ${at(dominant)} است و عنصر ${topElement.fa} با سهم ${faNum(topElement.percent)} درصد بیشترین پشتوانه را می‌دهد. ` +
      (score >= 66
        ? "این نقشه یک جهت‌گیری روشن دارد؛ بیشتر موقعیت‌ها را می‌شود با همان نقطه‌ی قوت توضیح داد."
        : score >= 40
          ? "نقشه جهت‌دار اما منعطف است؛ بسته به شرایط، خودش را نشان می‌دهد."
          : "پراکندگی بالاست؛ نقشه بیشتر از یک محور، مجموعه‌ای از گرایش‌های هم‌وزن است."),
  )
}

// ── 2 · الگوی احساسی ─────────────────────────────────────────────────────────

function emotionalPattern(s: ChartSignals, rels: ChartRelation[]): SynthesisSection {
  const moon = sigOf(s, "moon")
  const moonSign = moon ? getRashi(moon.placement.sign) : null
  const moonRels = rels.filter((r) => r.from === "moon" || r.to === "moon")
  const support = clamp01(moonRels.reduce((sum, r) => sum + r.strength, 0))
  const moonHouse = moon ? houseScore(s, moon.placement.house) : 0

  const evidence: Evidence[] = [
    ev("graha", "ماه", `${at(moon)} — قدرت ${faNum(moon?.score ?? 0)} از ۱۰۰`, pct(moon?.score ?? 0)),
    ev("sign", `ماه در ${moonSign?.fa ?? "برج ثبت‌نشده"}`, `${moonSign?.keyword ?? "—"} — عنصر ${ELEMENT_LABELS[moonSign?.element ?? "fire"].fa} / وجه ${MODALITY_LABELS[moonSign?.modality ?? "cardinal"].fa}`, 1),
    ev("house", "خانه‌ی ماه", `تمرکز ${faNum(moonHouse)} از ۱۰۰ در خانه‌ی ${faNum(moon?.placement.house ?? 0)}`, pct(moonHouse)),
    ev("aspect", "دید دریافتی ماه", moonRels.length ? moonRels.map((r) => `${grahaFa(r.from === "moon" ? r.to : r.from)} با شدت ${faNum(r.strength * 100)} درصد`).join("، ") : "هیچ دید معناداری ثبت نشد", support),
  ]

  const score = scoreFrom(evidence, 3)

  return section(
    "emotion",
    "الگوی احساسی",
    "ماه، خانه‌ی آن و کیفیت دید دریافتی",
    score,
    evidence,
    `ماه ${at(moon)} با قدرت ${faNum(moon?.score ?? 0)} از ۱۰۰ در ${moonSign?.fa ?? "برج ثبت‌نشده"} پاسخ هیجانی این نقشه را می‌سازد. ` +
      (support >= 0.5
        ? `دید ${faNum(moonRels.length)} گره به ماه با شدت مجموع ${faNum(support * 100)} درصد آن را تا حدی پایدار می‌کند و معمولاً درون‌تر آدم می‌شود.`
        : `ماه با شدت دیدریافتی ${faNum(support * 100)} درصد، واکنش‌های هیجانی را کمتر قابل پیش‌بینی می‌کند. `) +
      (score >= 66
        ? "پایه‌ی احساسی نقشه محکم است."
        : score >= 40
          ? "احساسات بیشتر از راه رفتار و تجربه شکل می‌گیرند تا از راه تصمیم آگاهانه."
          : "حساسیت احساسی بالاست و به‌سختی مهار می‌شود."),
  )
}
// ── 3 · الگوی رابطه ──────────────────────────────────────────────────────────

function relationshipPattern(chart: NatalChart, s: ChartSignals, rels: ChartRelation[]): SynthesisSection {
  const s7 = seventhLord(chart)
  const venus = sigOf(s, "venus")
  const lord7 = sigOf(s, s7)
  const h7 = houseScore(s, 7)
  const vsSat = relationBetween(rels, "venus", "saturn")
  const vsMar = relationBetween(rels, "venus", "mars")
  const rel = (r: ChartRelation | undefined) =>
    r ? `فاصله‌ی ${faNum(r.distance)} برج، شدت ${faNum(r.strength * 100)} درصد` : "دید معناداری ثبت نشد"

  const evidence: Evidence[] = [
    ev("graha", "زهره", `${at(venus)} — قدرت ${faNum(venus?.score ?? 0)} از ۱۰۰`, pct(venus?.score ?? 0)),
    ev("lord", `لرد خانه‌ی ۷: ${grahaFa(s7)}`, `${at(lord7)} — قدرت ${faNum(lord7?.score ?? 0)} از ۱۰۰`, pct(lord7?.score ?? 0)),
    ev("house", "تمرکز خانه‌ی ۷", `امتیاز ${faNum(h7)} از ۱۰۰`, pct(h7)),
    ev("aspect", "زهره – زحل", rel(vsSat), vsSat?.strength ?? 0),
    ev("aspect", "زهره – مریخ", rel(vsMar), vsMar?.strength ?? 0),
  ]

  const score = scoreFrom(evidence, 3)

  return section(
    "relationship",
    "الگوی رابطه",
    "زهره، لرد خانه‌ی هفتم و کیفیت دید میان آن‌ها",
    score,
    evidence,
    `زهره ${at(venus)} با قدرت ${faNum(venus?.score ?? 0)} و لرد خانه‌ی هفتم ${grahaFa(s7)} با ${faNum(lord7?.score ?? 0)}، دو ستون اصلی رابطه در این نقشه‌اند. ` +
      (vsSat
        ? `دید زهره–زحل با شدت ${faNum(vsSat.strength * 100)} درصد معمولاً به رابطه‌ها جدیت و تأخیر می‌آورد. `
        : "دید معناداری میان زهره و زحل ثبت نشده؛ رابطه‌ها بیشتر بر پایه‌ی گرم‌شدن پیش می‌روند تا تعهد. ") +
      (score >= 66
        ? "ظرفیت رابطه‌ی پایدار در این نقشه بالاست."
        : score >= 40
          ? "کیفیت رابطه بیشتر به شرایط بیرونی گره خورده تا به آمادگی درونی."
          : "رابطه برای این نقشه حوزه‌ی پرتنشی است و معمولاً نیاز به آگاهی و صبر دارد."),
  )
}
// ── 4 · الگوی حرفه‌ای ────────────────────────────────────────────────────────

function careerPattern(s: ChartSignals): SynthesisSection {
  const s10 = s.tenthLord
  const sun = sigOf(s, "sun")
  const merc = sigOf(s, "mercury")
  const h10 = houseScore(s, 10)

  const evidence: Evidence[] = [
    ev("house", "تمرکز خانه‌ی ۱۰", `امتیاز ${faNum(h10)} از ۱۰۰`, pct(h10)),
    ev("lord", `لرد خانه‌ی ۱۰: ${grahaFa(s10.graha)}`, `${at(s10)} — قدرت ${faNum(s10.score)} از ۱۰۰`, pct(s10.score)),
    ev("graha", "خورشید", `${at(sun)} — نشانه‌ی جایگاه عمومی`, pct(sun?.score ?? 0)),
    ev("graha", "عطارد", `${at(merc)} — نشانه‌ی تحلیل و بیان`, pct(merc?.score ?? 0)),
  ]

  const score = scoreFrom(evidence, 3)

  return section(
    "career",
    "الگوی حرفه‌ای",
    "خانه‌ی دهم، لرد آن، خورشید و عطارد",
    score,
    evidence,
    `لرد خانه‌ی دهم ${grahaFa(s10.graha)} ${at(s10)} با قدرت ${faNum(s10.score)} مسیر رسمی کار را نشان می‌دهد و خورشید با ${faNum(sun?.score ?? 0)} میزان راحتی در فضای عمومی را. ` +
      (merc && merc.score >= 60
        ? `عطارد با ${faNum(merc.score)} نشان می‌دهد کارِ فکری و ارتباطی برای این نقشه ساده‌تر از کارِ صرفاً اجرایی است.`
        : `عطارد با ${faNum(merc?.score ?? 0)} نشان می‌دهد کارهای ترکیبی، یعنی مهارت به‌علاوه‌ی ارتباط، گیرایه‌تر است. `) +
      (score >= 66
        ? "ساختار شغلی روشنی پشت این نقشه دیده می‌شود."
        : score >= 40
          ? "مسیر شغلی بیشتر واکنشی و بر پایه‌ی فرصت‌هاست."
          : "تعریف شغلی هنوز شکل نگرفته و با آزمون و تجربه روشن می‌شود."),
  )
}
// ── 5 · نقاط قوت ─────────────────────────────────────────────────────────────

function strengths(s: ChartSignals): SynthesisSection {
  const top = s.grahas.slice(0, 3)
  const bestElement = topSlice(s.elements)
  const bestModality = topSlice(s.modalities)

  const evidence: Evidence[] = [
    ...top.map((g) =>
      ev("graha", `${grahaFa(g.graha)} — ${faNum(g.score)} از ۱۰۰`, `${at(g)} — ${g.reasons[0] ?? "بدون دلیل ثبت‌شده"}`, pct(g.score)),
    ),
    ev("element", `عنصر غالب: ${bestElement.fa}`, `سهم ${faNum(bestElement.percent)} درصد از ${faNum(bestElement.count)} سیاره`, sliceWeight(bestElement)),
    ev("modality", `وجه غالب: ${bestModality.fa}`, `سهم ${faNum(bestModality.percent)} درصد از ${faNum(bestModality.count)} سیاره`, sliceWeight(bestModality)),
  ]

  const score = scoreFrom(evidence, 4)

  return section(
    "strengths",
    "نقاط قوت",
    "سه گرایش با بالاترین امتیاز و تعادل عنصری",
    score,
    evidence,
    `برترین سیارات نقشه ${top.map((g) => grahaFa(g.graha)).join("، ")} هستند و عنصر ${bestElement.fa} با سهم ${faNum(bestElement.percent)} درصد بیشترین پشتیبانی را می‌دهد. ` +
      (score >= 66
        ? "این نقطه‌های قوت معمولاً همان چیزی هستند که دیگران در شما زودتر می‌بینند."
        : score >= 40
          ? "قوت‌ها پراکنده‌اند؛ هیچ‌کدام به‌تنهایی تکیه‌گاه محکمی نمی‌سازند."
          : "این نقشه بیشتر از آن‌که بر نقطه‌ی قوت تکیه کند، از ترکیب چند توانایی متوسط بهره می‌برد."),
  )
}

// ── 6 · زمینه‌های رشد ────────────────────────────────────────────────────────

function growthAreas(s: ChartSignals): SynthesisSection {
  const bottom = [...s.grahas].sort((a, b) => a.score - b.score).slice(0, 3)
  const weakElement = bottomSlice(s.elements)
  const weakModality = bottomSlice(s.modalities)
  const saturn = sigOf(s, "saturn")

  const evidence: Evidence[] = [
    ...bottom.map((g) =>
      ev("graha", `${grahaFa(g.graha)} — ${faNum(g.score)} از ۱۰۰`, `${at(g)} — ${g.reasons[g.reasons.length - 1] ?? "بدون دلیل ثبت‌شده"}`, pct(100 - g.score)),
    ),
    ev("element", `کم‌سهم‌ترین عنصر: ${weakElement.fa}`, `سهم ${faNum(weakElement.percent)} درصد از ${faNum(weakElement.count)} سیاره`, sliceWeight(weakElement)),
    ev("modality", `کم‌سهم‌ترین وجه: ${weakModality.fa}`, `سهم ${faNum(weakModality.percent)} درصد از ${faNum(weakModality.count)} سیاره`, sliceWeight(weakModality)),
  ]
  if (saturn) {
    evidence.push(
      ev("graha", "زحل — معلم نقشه", `${at(saturn)} — قدرت ${faNum(saturn.score)} از ۱۰۰`, pct(100 - saturn.score)),
    )
  }

  const score = scoreFrom(evidence, 5)

  return section(
    "growth",
    "زمینه‌های رشد",
    "کم‌قدرت‌ترین سیارات و کم‌پشتوانه‌ترین عنصرها",
    score,
    evidence,
    `کم‌امتیازترین سیارات نقشه ${bottom.map((g) => grahaFa(g.graha)).join("، ")} هستند و عنصر ${weakElement.fa} کمترین پشتیبانی را دارد. ` +
      (score >= 66
        ? "این‌ها بدنه‌ی اصلی کار زندگی‌اند؛ تقریباً همه‌ی رشد از همین ناحیه می‌آید."
        : score >= 40
          ? "کمبودها مشخص و قابل کار هستند، اما پراکنده‌اند و یک برنامه‌ی واحد جواب نمی‌دهد."
          : "نقشه متعادل است؛ کمبودها بیشتر از نوع تنظیم‌اند نه ضعف بنیادی."),
  )
}
// ── 7 · مضامین اصلی زندگی ───────────────────────────────────────────────────

function lifeThemes(s: ChartSignals, patterns: DetectedPattern[]): SynthesisSection {
  const top = [...s.houses].sort((a, b) => b.score - a.score).slice(0, 3)
  const strong = patterns.filter((p) => p.score >= 50)
  const avgPattern = patterns.length
    ? Math.round(patterns.reduce((sum, p) => sum + p.score, 0) / patterns.length)
    : 0

  const evidence: Evidence[] = [
    ...top.map((h) =>
      ev("house", `خانه‌ی ${faNum(h.house)} — ${h.fa}`, `${h.keyword} — امتیاز ${faNum(h.score)} از ۱۰۰، ${faNum(h.count)} سیاره، ${faNum(h.bindu)} بیندو`, pct(h.score)),
    ),
    ev("pattern", "الگوهای هندسی تأییدشده", strong.length ? strong.map((p) => `${p.fa} با ${faNum(p.score)} از ۱۰۰`).join("، ") : "الگوی برجسته‌ای در هندسه‌ی نقشه دیده نشد", clamp01(strong.length / 3)),
    ev("pattern", "کیفیت الگوهای یافت‌شده", `میانگین امتیاز ${faNum(avgPattern)} از ۱۰۰`, pct(avgPattern)),
  ]

  const score = scoreFrom(evidence, 4)

  return section(
    "themes",
    "مضامین اصلی زندگی",
    "خانه‌های پرمایه و الگوهای تکرارشونده",
    score,
    evidence,
    `خانه‌های ${top.map((h) => faNum(h.house)).join("، ")} بیشترین تمرکز را دارند و کلاسیک‌ها همین‌ها را موضوع‌های اصلی زندگی می‌نامند. ` +
      (strong.length
        ? `الگوهای ${strong.map((p) => p.fa).join("، ")} نشان می‌دهند این مضامین چطور خودشان را تکرار می‌کنند.`
        : "هندسه‌ی نقشه الگوی تکراری برجسته‌ای نشان نمی‌دهد؛ تکرار بیشتر از راه خانه‌ها و سیارات است تا شکل‌های هندسی. ") +
      (score >= 66
        ? "موضوع‌های زندگی فشرده و روشن‌اند."
        : score >= 40
          ? "موضوع‌ها پراکنده‌اند و نیازمند اولویت‌بندی آگاهانه‌اند."
          : "پراکندگی بالاست؛ انرژی نقشه بیشتر بین چند موضوع کوچک می‌چرخد."),
  )
}
// ── 8 · فصل کنونی زندگی ─────────────────────────────────────────────────────

function currentChapter(chart: NatalChart, s: ChartSignals, now: Date): SynthesisSection {
  const { maha, antar } = activeDasha(chart, now)
  const md = sigOf(s, maha.graha)
  const ant = antar ? sigOf(s, antar.graha) : undefined
  const lordStrength = (md?.score ?? 0) / 2 + (ant?.score ?? 0) / 2
  const mdHouse = md ? houseScore(s, md.placement.house) : 0

  const evidence: Evidence[] = [
    ev("dasha", "دوره‌ی بزرگ ماه", `${grahaFa(maha.graha)} — تا ${formatJalali(maha.to)} — بخت ${FORTUNE_LABELS[maha.level].fa}`, pct(md?.score ?? 0)),
    ev("dasha", "دوره‌ی داخلی سیاره", antar ? `${grahaFa(antar.graha)} — تا ${formatJalali(antar.to)} — بخت ${FORTUNE_LABELS[antar.level].fa}` : "دوره‌ی داخلی فعالی یافت نشد", pct(ant?.score ?? 0)),
    ev("graha", "قدرت گره‌ی حاکم", `${at(md)} — میانگین دو گره ${faNum(lordStrength)} از ۱۰۰`, pct(lordStrength)),
    ev("house", "خانه‌ی گره‌ی حاکم", `خانه‌ی ${faNum(md?.placement.house ?? 0)} — تمرکز ${faNum(mdHouse)} از ۱۰۰`, pct(mdHouse)),
  ]

  const score = scoreFrom(evidence, 3)

  return section(
    "chapter",
    "فصل کنونی زندگی",
    "دوره‌ی ماه بر پایه‌ی تاریخ امروز",
    score,
    evidence,
    `دوره‌ی بزرگ ${grahaFa(maha.graha)} تا ${formatJalali(maha.to)}${antar ? ` با دوره‌ی داخلی ${grahaFa(antar.graha)} تا ${formatJalali(antar.to)}` : ""} در جریان است و گره‌ی حاکم در خانه‌ی ${faNum(md?.placement.house ?? 0)} نقشه نشسته است. ` +
      (lordStrength >= 60
        ? "چون گره‌ی حاکم در این نقشه قدرت خوبی دارد، این دوره معمولاً پنجره‌ای رو به جلو باز می‌کند."
        : "قدرت گره‌ی حاکم پایین است؛ کار در این دوره بیشتر از درون پیش می‌رود تا از بیرون."),
  )
}
// ── 9 · تأثیرات مهم کنونی ───────────────────────────────────────────────────

function currentInfluences(chart: NatalChart, s: ChartSignals, rels: ChartRelation[], now: Date): SynthesisSection {
  const { maha, antar } = activeDasha(chart, now)
  const md = sigOf(s, maha.graha)
  const ant = antar ? sigOf(s, antar.graha) : undefined
  const linked = rels.filter((r) => r.from === maha.graha || r.to === maha.graha)
  const avgSignal = s.grahas.length
    ? Math.round(s.grahas.reduce((sum, g) => sum + g.score, 0) / s.grahas.length)
    : 0

  const evidence: Evidence[] = [
    ev("dasha", `گره‌ی بزرگ: ${grahaFa(maha.graha)}`, md ? `${at(md)} — قدرت ${faNum(md.score)} از ۱۰۰` : "جايگاهی ثبت نشد", pct(md?.score ?? 0)),
    ev("dasha", antar ? `گره‌ی داخلی: ${grahaFa(antar.graha)}` : "گره‌ی داخلی", ant ? `${at(ant)} — قدرت ${faNum(ant.score)} از ۱۰۰` : "دوره‌ی داخلی فعالی یافت نشد", pct(ant?.score ?? 0)),
    ev("aspect", "پیوندهای گره‌ی بزرگ", linked.length ? `${faNum(linked.length)} رابطه‌ی معنادار — ${linked.slice(0, 3).map((r) => `${grahaFa(r.from)}↔${grahaFa(r.to)} با شدت ${faNum(r.strength * 100)} درصد`).join("، ")}` : "رابطه‌ی بیرونی برجسته‌ای ندارد", clamp01(linked.length / 3)),
    ev("element", "پشتوانه‌ی کلی نقشه", `میانگین امتیاز ${faNum(s.grahas.length)} سیاره ${faNum(avgSignal)} از ۱۰۰`, pct(avgSignal)),
  ]

  const score = scoreFrom(evidence, 3)

  return section(
    "influences",
    "تأثیرات مهم کنونی",
    "گره‌های فعال، پیوندها و پشتوانه‌ی کلی نقشه",
    score,
    evidence,
    `گره‌های ${grahaFa(maha.graha)}${antar ? ` و ${grahaFa(antar.graha)}` : ""} کنوناً بیشترین اثر را بر ریتم روزانه می‌گذارند. ` +
      (linked.length
        ? `${faNum(linked.length)} رابطه‌ی فعال حال‌وهوای این دوره را شکل می‌دهد. `
        : "این گره‌ها پیوند بیرونی کمی دارند؛ اثرشان بیشتر درونی و شخصی است تا محیطی. ") +
      (score >= 66
        ? "پشتوانه‌ی نقشه برای این دوره قوی است."
        : score >= 40
          ? "پشتوانه متوسط است؛ نتیجه بیشتر به تلاش فردی بستگی دارد."
          : "پشتوانه‌ی نقشه برای این دوره کم‌مقدار است و تحمل بیشتری لازم دارد."),
  )
}
// ── Entry point ──────────────────────────────────────────────────────────────

/**
 * Builds the nine narrative sections. `now` is an explicit parameter so the
 * time-dependent sections are testable and never secretly read the clock.
 */
export function synthesize(
  chart: NatalChart,
  signals: ChartSignals,
  patterns: DetectedPattern[],
  rels: ChartRelation[],
  now: Date,
): SynthesisSection[] {
  return [
    coreIdentity(chart, signals),
    emotionalPattern(signals, rels),
    relationshipPattern(chart, signals, rels),
    careerPattern(signals),
    strengths(signals),
    growthAreas(signals),
    lifeThemes(signals, patterns),
    currentChapter(chart, signals, now),
    currentInfluences(chart, signals, rels, now),
  ]
}

/** Flat, UI-ready evidence list across every section, strongest first. */
export function allEvidence(sections: SynthesisSection[]): (Evidence & { section: string })[] {
  return sections
    .flatMap((s) => s.evidence.map((e) => ({ ...e, section: s.title })))
    .sort((a, b) => b.weight - a.weight)
}
