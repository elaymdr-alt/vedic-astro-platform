/**
 * Premium interpretation — synthesis-based layer over AstrologyAnalysis.
 *
 * Pipeline: FACTS → RELATIONSHIPS → PATTERNS → CONTRADICTIONS →
 * PRIORITIES → SYNTHESIS → HUMAN INTERPRETATION.
 *
 * Every output keeps its evidence. Nothing here invents a placement,
 * an aspect, a date or a transit. Language stays reflective, never
 * deterministic. When data is missing the section says so explicitly.
 */

import { faNum } from "./format"
import { getBhava } from "./houses"
import { getGraha } from "./planets"
import { getRashi } from "./signs"
import type { GrahaKey } from "./types"
import type { AstrologyAnalysis } from "./analysis-schema"
import type { Evidence } from "./intelligence/types"

export type Priority = "major" | "important" | "supporting" | "minor"

export interface CoreTheme {
  id: string
  title: string
  fa: string
  priority: Priority
  score: number
  interpretation: string
  dailyLife: string
  evidence: Evidence[]
}

export interface Contradiction {
  title: string
  factorA: string
  pullA: string
  factorB: string
  pullB: string
  synthesis: string
  dailyLife: string
  reflection: string
}

export interface PracticalInsight {
  area: string
  areaFa: string
  natural: string
  challenge: string
  help: string
  watch: string
  reflection: string
  evidence: Evidence[]
}

export interface StrengthCard {
  title: string
  interpretation: string
  expression: string
  challenge: string
  evidence: Evidence[]
}

export interface GrowthCard {
  pattern: string
  manifestation: string
  risk: string
  opportunity: string
  reflection: string
  evidence: Evidence[]
}

export interface LifeArea {
  key: string
  fa: string
  icon: string
  summary: string
  detail: string
  dailyLife: string
  reflection: string
  score: number
  priority: Priority
  evidence: Evidence[]
}

export interface ExecutiveSummary {
  pattern: string
  signature: string
  topThemes: string[]
  topStrength: string
  topGrowth: string
}

export interface PremiumReport {
  executive: ExecutiveSummary
  themes: CoreTheme[]
  contradictions: Contradiction[]
  strengths: StrengthCard[]
  growth: GrowthCard[]
  areas: LifeArea[]
  quality: { sections: number; evidenceCount: number; coverage: string }
}

const PRIORITY_RANK: Record<Priority, number> = { major: 0, important: 1, supporting: 2, minor: 3 }
const prio = (score: number): Priority =>
  score >= 66 ? "major" : score >= 45 ? "important" : score >= 25 ? "supporting" : "minor"

function ev(kind: Evidence["kind"], label: string, detail: string, weight: number): Evidence {
  const w = Math.min(1, Math.max(0, weight))
  return { kind, label, detail, weight: Math.round(w * 100) / 100 }
}

const GRAHA_FOCUS: Record<GrahaKey, string> = {
  sun: "اراده و مسیر", moon: "جهان درون", mars: "انگیزه و عمل",
  mercury: "ذهن و کلام", jupiter: "گسترش و بخت", venus: "عشق و پیوند",
  saturn: "صبر و ساختار", rahu: "کشش ناآشنا", ketu: "بی‌نیازی",
};

/** 3–5 core life themes, merged across grahas/houses/aspects (dedup by concept). */
function extractThemes(a: AstrologyAnalysis): CoreTheme[] {
  const { signals } = a.intelligence;
  const out: CoreTheme[] = [];
  const seen = new Set<string>();
  const push = (id: string, title: string, fa: string, score: number,
    interpretation: string, dailyLife: string, evidence: Evidence[]) => {
    if (seen.has(title) || evidence.length === 0) return;
    seen.add(title);
    out.push({ id, title, fa, priority: prio(score), score, interpretation, dailyLife, evidence });
  };

  const ll = signals.lagnaLord;
  push("lagna-drive", "سکان هدایت زندگی",
    `${a.dominants.lagnaLordFa} در خانه‌ی ${faNum(ll.placement.house)}`,
    Math.round(ll.score * 0.9 + 10),
    `حاکم صعود (${a.dominants.lagnaLordFa}) در خانه‌ی ${faNum(ll.placement.house)} (${getBhava(ll.placement.house).fa}) نشسته؛ مسیر رشد این چارت از دروازه‌ی «${getBhava(ll.placement.house).keyword}» می‌گذرد.`,
    `در روزمره وقتی سر دوراهی می‌مانی، ناخودآگاه به سمت «${getBhava(ll.placement.house).keyword}» برمی‌گردی — آنجا انرژی‌ات طبیعی‌تر جریان دارد.`,
    [ev("lord", `حاکم صعود: ${a.dominants.lagnaLordFa}`, `خانه‌ی ${faNum(ll.placement.house)} — قدرت ${faNum(ll.score)} از ۱۰۰`, ll.score / 100)]);

  const moon = a.planets.find((p) => p.graha === "moon")!;
  const moonSig = signals.grahas.find((g) => g.graha === "moon")!;
  push("emotional-security", "امنیت عاطفی",
    `ماه در ${moon.signFa} · خانه‌ی ${faNum(moon.house)}`, moonSig.score,
    `ماه در برج ${moon.signFa} و خانه‌ی ${faNum(moon.house)} (${moon.houseFa}) است؛ آرامش درونی‌ات به «${getBhava(moon.house).keyword}» گره خورده است.`,
    `ممکن است وقتی «${getBhava(moon.house).keyword}» به‌هم می‌ریزد، خواب و تمرکزت هم به‌هم بریزد — و با مرتب شدنش، ذهنت آرام شود.`,
    [ev("graha", `ماه در ${moon.signFa}`, `خانه‌ی ${faNum(moon.house)} — قدرت ${faNum(moonSig.score)} از ۱۰۰`, moonSig.score / 100)]);

  const dom = signals.dominant;
  if (dom.graha !== "moon" && dom.graha !== a.dominants.lagnaLord) {
    push("dominant-drive", "نیروی غالب چارت",
      `${getGraha(dom.graha).fa} — قوی‌ترین نیرو`, dom.score,
      `${getGraha(dom.graha).fa} با امتیاز ${faNum(dom.score)} از ۱۰۰ قوی‌ترین نیروی چارت است (${getRashi(dom.placement.sign).fa}، خانه‌ی ${faNum(dom.placement.house)})؛ لحن غالب شخصیت از «${GRAHA_FOCUS[dom.graha]}» می‌آید.`,
      `در تصمیم‌های مهم، الگوی «${GRAHA_FOCUS[dom.graha]}» بلندتر از بقیه‌ی انگیزه‌ها شنیده می‌شود.`,
      [ev("graha", `نیروی غالب: ${getGraha(dom.graha).fa}`, `خانه‌ی ${faNum(dom.placement.house)} — ${faNum(dom.score)} از ۱۰۰`, dom.score / 100)]);
  }
  return out;
}

/** Relationship + career themes. */
function extractBondThemes(a: AstrologyAnalysis): CoreTheme[] {
  const { signals } = a.intelligence;
  const out: CoreTheme[] = [];
  const venus = a.planets.find((p) => p.graha === "venus")!;
  const venusSig = signals.grahas.find((g) => g.graha === "venus")!;
  const seventh = a.planets.filter((p) => p.house === 7);
  const relEv: Evidence[] = [
    ev("graha", `زهره در ${venus.signFa}`, `خانه‌ی ${faNum(venus.house)} — قدرت ${faNum(venusSig.score)} از ۱۰۰`, venusSig.score / 100),
  ];
  if (seventh.length > 0) relEv.push(ev("house", `خانه‌ی هفتم: ${seventh.map((p) => p.fa).join("، ")}`, `${faNum(seventh.length)} سیاره در خانه‌ی شراکت`, 0.5));
  const relScore = Math.round((venusSig.score + (seventh.length ? 60 : 30)) / 2);
  out.push({
    id: "relationship", title: "پیوند و رابطه",
    fa: `زهره در ${venus.signFa}${seventh.length ? ` · ${faNum(seventh.length)} سیاره در خانه‌ی هفتم` : ""}`,
    priority: prio(relScore), score: relScore,
    interpretation: `الگوی رابطه از زهره در ${venus.signFa} (خانه‌ی ${faNum(venus.house)}) خوانده می‌شود${seventh.length ? ` و ${seventh.map((p) => p.fa).join(" و ")} در خانه‌ی هفتم آن را پررنگ کرده‌اند` : " و چون خانه‌ی هفتم خالی است، سبک حاکم هفتم راهنماست"}؛ نیاز عاطفی‌ات با «${getBhava(venus.house).keyword}» پیوند خورده است.`,
    dailyLife: `در رابطه ممکن است وقتی «${getBhava(venus.house).keyword}» میان شما مشترک و روشن باشد احساس امنیت کنی — و با مبهم شدنش، فاصله بگیری.`,
    evidence: relEv,
  });

  const tenth = a.planets.filter((p) => p.house === 10);
  const saturnSig = signals.grahas.find((g) => g.graha === "saturn")!;
  const careerEv: Evidence[] = [
    ev("lord", `حاکم دهم: ${getGraha(signals.tenthLord.graha).fa}`, `قدرت ${faNum(signals.tenthLord.score)} از ۱۰۰`, signals.tenthLord.score / 100),
    ev("graha", "زحل (ساختار)", `قدرت ${faNum(saturnSig.score)} از ۱۰۰`, saturnSig.score / 100),
  ];
  if (tenth.length > 0) careerEv.push(ev("house", `خانه‌ی دهم: ${tenth.map((p) => p.fa).join("، ")}`, "حضور مستقیم در خانه‌ی کار", 0.6));
  const carScore = Math.round((signals.tenthLord.score + saturnSig.score) / 2);
  out.push({
    id: "career", title: "مسیر کاری",
    fa: `حاکم دهم: ${getGraha(signals.tenthLord.graha).fa}${tenth.length ? ` · ${faNum(tenth.length)} سیاره در خانه‌ی دهم` : ""}`,
    priority: prio(carScore), score: carScore,
    interpretation: `مسیر حرفه‌ای از حاکم دهم (${getGraha(signals.tenthLord.graha).fa}، ${faNum(signals.tenthLord.score)}) و زحل (${faNum(saturnSig.score)}) خوانده می‌شود؛ رشد کاری‌ات بیشتر از جنس «ساختن تدریجی» است تا جهش ناگهانی.`,
    dailyLife: "در محیط کاری وقتی نقش و مسئولیتت روشن باشد و نتیجه‌ی کارت دیده شود، عملکردت بهتر است؛ ابهام در جایگاه انرژی‌ات را کم می‌کند.",
    evidence: careerEv,
  });
  return out;
}

/** Element-imbalance theme — only when a real imbalance exists. */
function extractElementTheme(a: AstrologyAnalysis): CoreTheme[] {
  const els = [...a.intelligence.signals.elements].sort((x, y) => y.percent - x.percent);
  if (els[0].percent - els[els.length - 1].percent < 25) return [];
  const score = Math.min(90, els[0].percent + 40);
  return [{
    id: "element-tone", title: `غالب بودن عنصر ${els[0].fa}`,
    fa: `${faNum(els[0].count)} از ۹ سیاره`, priority: prio(score), score,
    interpretation: `عنصر ${els[0].fa} با ${faNum(els[0].count)} سیاره لحن غالب چارت است و عنصر ${els[els.length - 1].fa} با ${faNum(els[els.length - 1].count)} سیاره کم‌رنگ‌تر؛ یک سبک واکنش برایت طبیعی و سبک مقابل نیازمند تمرین آگاهانه است.`,
    dailyLife: `در فشار، الگوی «${els[0].fa}» تندتر می‌شود — همان واکنش آشنایی که همیشه اول سراغت می‌آید.`,
    evidence: [ev("element", `عنصر غالب: ${els[0].fa}`, `${faNum(els[0].count)} از ۹ سیاره — سهم ${faNum(els[0].percent)}٪`, els[0].percent / 100)],
  }];
}

/** Contradiction engine — surfaces real tensions instead of hiding them. */
function extractContradictions(a: AstrologyAnalysis): Contradiction[] {
  const out: Contradiction[] = [];
  const moon = a.planets.find((p) => p.graha === "moon")!;
  const sun = a.planets.find((p) => p.graha === "sun")!;
  if (moon.sign !== sun.sign) {
    out.push({
      title: "کشاکش میان نیاز درونی و اراده‌ی بیرونی",
      factorA: `ماه در ${moon.signFa}`,
      pullA: `نیاز به «${getRashi(moon.sign).keyword}»`,
      factorB: `خورشید در ${sun.signFa}`,
      pullB: `اراده‌ی «${getRashi(sun.sign).keyword}»`,
      synthesis: `در این چارت هم‌زمان دو کشش واقعی دیده می‌شود: جهان درون (${moon.signFa}) و هسته‌ی اراده (${sun.signFa}) اولویت‌های متفاوتی دارند. این تضاد نشانه‌ی خرابی نیست؛ نشانه‌ی عمق است — و مدیریت آگاهانه می‌خواهد.`,
      dailyLife: "ممکن است در بعضی موقعیت‌ها بین «آنچه آرامم می‌کند» و «آنچه باید انجام دهم» احساس کشمکش کنی؛ مثلاً دلت استراحت بخواهد اما اراده‌ات تو را به جلو هل بدهد.",
      reflection: "آخرین باری که بین نیاز درونت و وظیفه‌ی بیرونت گیر کردی، کدام را انتخاب کردی — و هزینه‌اش چه بود؟",
    });
  }
  const saturn = a.planets.find((p) => p.graha === "saturn")!;
  const jupiter = a.planets.find((p) => p.graha === "jupiter")!;
  const expansion = [5, 9, 11].includes(jupiter.house);
  const caution = [6, 8, 12].includes(saturn.house);
  if (expansion && caution) {
    out.push({
      title: "کشاکش میان گسترش و احتیاط",
      factorA: `مشتری در خانه‌ی ${faNum(jupiter.house)}`,
      pullA: "کشش به رشد، ریسک و فرصت‌های بزرگ",
      factorB: `زحل در خانه‌ی ${faNum(saturn.house)}`,
      pullB: "نیاز به احتیاط، صبر و ساختن تدریجی",
      synthesis: "هم‌زمان اشتیاق گسترش و نیاز به احتیاط در چارت دیده می‌شود؛ ریتم درست برای تو «جهش حساب‌شده» است — نه سکون کامل، نه پرش بی‌محاسبه.",
      dailyLife: "ممکن است برای یک فرصت بزرگ هم‌زمان هیجان‌زده و مضطرب شوی؛ یک صدا می‌گوید «برو» و صدای دیگر می‌گوید «صبر کن».",
      reflection: "کدام تصمیم‌های گذشته‌ات از عجله آسیب دیدند و کدام از تأخیر بیش از حد؟",
    });
  }
  const venus = a.planets.find((p) => p.graha === "venus")!;
  if (venus.house === 12 || venus.house === 8) {
    out.push({
      title: "کشاکش میان نیاز به پیوند و نیاز به خلوت",
      factorA: `زهره در خانه‌ی ${faNum(venus.house)} (${venus.houseFa})`,
      pullA: "میل عمیق به صمیمیت و پیوند",
      factorB: "ماهیت درون‌گرای همین خانه",
      pullB: "نیاز به خلوت و فضای تنفسی",
      synthesis: "الگوی رابطه هم‌زمان صمیمیت عمیق و فضای شخصی می‌خواهد؛ شریک مناسب کسی است که هر دو را بفهمد — نه فقط یکی را.",
      dailyLife: "ممکن است بعد از یک صمیمیت عمیق، ناگهان نیاز به فاصله پیدا کنی؛ این عقب‌نشینی به معنای سرد شدن نیست.",
      reflection: "در رابطه‌های گذشته، چقدر از فاصله‌گرفتن‌هایت سوءتفاهم شده است؟",
    });
  }
  return out.slice(0, 3);
}

/** Strengths — title + interpretation + expression + challenge, all evidenced. */
function extractStrengths(a: AstrologyAnalysis): StrengthCard[] {
  const { signals } = a.intelligence;
  return signals.grahas.slice(0, 3).map((s) => {
    const focus = GRAHA_FOCUS[s.graha];
    return {
      title: `${getGraha(s.graha).fa} قدرتمند — ${focus}`,
      interpretation: `${getGraha(s.graha).fa} با امتیاز ${faNum(s.score)} از ۱۰۰ در ${getRashi(s.placement.sign).fa} و خانه‌ی ${faNum(s.placement.house)} نشسته؛ این الگو می‌تواند باعث شود در شرایطی که دیگران راه‌حل‌های معمول را می‌بینند، تو در حوزه‌ی «${focus}» گزینه‌های متفاوتی را بررسی کنی.`,
      expression: `در عمل: ${s.reasons[0] ?? ""} — این توانایی در روزمره به شکل پیگیری و ابتکار در «${getBhava(s.placement.house).keyword}» دیده می‌شود.`,
      challenge: "اگر فشار برای نتیجه گرفتن زیاد شود، همین نقطه‌ی قوت می‌تواند به تصمیم‌گیری عجولانه تبدیل شود؛ مکث آگاهانه، نگه‌دارنده‌ی آن است.",
      evidence: [
        ev("graha", `${getGraha(s.graha).fa} در ${getRashi(s.placement.sign).fa}`, `خانه‌ی ${faNum(s.placement.house)} — قدرت ${faNum(s.score)} از ۱۰۰`, s.score / 100),
      ],
    };
  });
}

/** Growth areas — from the weakest signals + dusthana occupancy + doshas. */
function extractGrowth(a: AstrologyAnalysis): GrowthCard[] {
  const { signals } = a.intelligence;
  const out: GrowthCard[] = [];
  const weak = [...signals.grahas].sort((x, y) => x.score - y.score)[0];
  out.push({
    pattern: `${getGraha(weak.graha).fa} کم‌فروغ — نیازمند توجه آگاهانه`,
    manifestation: `${getGraha(weak.graha).fa} با امتیاز ${faNum(weak.score)} از ۱۰۰ در ${getRashi(weak.placement.sign).fa} و خانه‌ی ${faNum(weak.placement.house)} نشسته؛ در حوزه‌ی «${GRAHA_FOCUS[weak.graha]}» ممکن است انرژی‌ات دیرتر روشن شود یا به حمایت بیرونی نیاز داشته باشی.`,
    risk: "نادیده گرفتن این حوزه می‌تواند آن را به نقطه‌ی فشار مزمن تبدیل کند — جایی که همیشه «بعداً» به آن می‌رسی.",
    opportunity: `رشد از مسیر کوچک و پیوسته می‌آید: هر هفته یک گام مشخص در «${getBhava(weak.placement.house).keyword}» — نه انقلاب یک‌شبه.`,
    reflection: `در حوزه‌ی «${GRAHA_FOCUS[weak.graha]}» چه کمک یا ساختاری می‌تواند انرژی‌ات را جبران کند؟`,
    evidence: [ev("graha", `${getGraha(weak.graha).fa} در ${getRashi(weak.placement.sign).fa}`, `قدرت ${faNum(weak.score)} از ۱۰۰`, weak.score / 100)],
  });
  const dosha = a.chart.doshas[0];
  if (dosha) {
    out.push({
      pattern: `${dosha.fa} — الگوی چالشی چارت`,
      manifestation: `${dosha.description} قدرت این الگو ${dosha.score !== undefined ? `${faNum(dosha.score)} از ۱۰۰` : dosha.strength} ارزیابی شده است.`,
      risk: "اگر این الگو نادیده گرفته شود، در دوره‌های فشار (مثل گذرهای دشوار زحل) پررنگ‌تر می‌شود.",
      opportunity: "شناخت الگو، نیمی از مدیریتش است؛ با رصد دوره‌های فعال، می‌توانی از قبل برایش برنامه داشته باشی.",
      reflection: "این الگو در سال گذشته کجاها خودش را نشان داد — و چه چیزی کمک کرد؟",
      evidence: [ev("pattern", dosha.fa, dosha.description, (dosha.score ?? 50) / 100)],
    });
  }
  return out.slice(0, 2);
}




const AREA_ICONS: Record<string, string> = {
  relationships: "❤️", career: "💼", money: "💰", mind: "🧠",
  family: "🏠", growth: "🌱", creativity: "🎨", exploration: "🌍",
};

type AreaInput = {
  key: string; fa: string; score: number; summary: string;
  detail: string; dailyLife: string; reflection: string; evidence: Evidence[];
};

function extractAreas(a: AstrologyAnalysis): LifeArea[] {
  const { signals } = a.intelligence;
  const sig = (g: GrahaKey) => signals.grahas.find((s) => s.graha === g)!;
  const inHouse = (h: number) => a.planets.filter((p) => p.house === h);
  const v = sig("venus"), m7 = inHouse(7);
  const s10 = signals.tenthLord, sa = sig("saturn");
  const j = sig("jupiter"), h2 = inHouse(2), h11 = inHouse(11);
  const me = sig("mercury"), mo = sig("moon"), h3 = inHouse(3);
  const h4 = inHouse(4), h5 = inHouse(5), h9 = inHouse(9), h12 = inHouse(12);
  const gro = Math.round(signals.grahas.reduce((s, g) => s + g.score, 0) / signals.grahas.length);
  const rel = Math.round((v.score + (m7.length ? 65 : 35)) / 2);
  const car = Math.round((s10.score + sa.score) / 2);
  const mon = Math.round((j.score * 0.5 + (h2.length + h11.length > 0 ? 65 : 35) * 0.5));
  const mind = Math.round((me.score * 0.5 + mo.score * 0.3 + (h3.length ? 70 : 40) * 0.2));
  const fam = Math.round((mo.score * 0.6 + (h4.length ? 70 : 40) * 0.4));
  const cre = Math.round((v.score * 0.4 + j.score * 0.3 + (h5.length ? 70 : 40) * 0.3));
  const exp = Math.round((j.score * 0.5 + (h9.length + h12.length > 0 ? 65 : 40) * 0.5));
  const inputs: AreaInput[] = [
    { key: "relationships", fa: "روابط", score: rel,
      summary: `الگوی پیوند از زهره در ${getRashi(v.placement.sign).fa} خوانده می‌شود.`,
      detail: m7.length ? `${m7.map((p) => p.fa).join(" و ")} در خانه‌ی هفتم‌اند؛ روابط صحنه‌ی اصلی رشد توست.` : "خانه‌ی هفتم خالی است؛ کیفیت رابطه بیشتر از سبک حاکم هفتم می‌آید.",
      dailyLife: "در رابطه وقتی احساس امنیت داری که انتظارات روشن و مشترک باشند.",
      reflection: "در رابطه‌های مهم زندگی‌ات، چه الگویی تکرار شده است؟",
      evidence: [ev("graha", `زهره در ${getRashi(v.placement.sign).fa}`, `قدرت ${faNum(v.score)} از ۱۰۰`, v.score / 100)] },

    { key: "money", fa: "پول و منابع", score: mon,
      summary: `جریان مالی از مشتری (${faNum(j.score)}) و خانه‌های دوم و یازدهم خوانده می‌شود.`,
      detail: h2.length + h11.length > 0 ? "خانه‌های مالی اشغال‌اند؛ پول از مسیر فعالیت مستقیم می‌آید." : "خانه‌های مالی خالی‌اند؛ درآمد بیشتر از مهارت و حاکمان این خانه‌ها می‌آید.",
      dailyLife: "تصمیم‌های مالی‌ات وقتی بهترند که عجله نکنی و یک شب فاصله بگذاری.",
      reflection: "بزرگ‌ترین نشت مالی زندگی‌ات کجاست؟",
      evidence: [ev("graha", "مشتری (فراوانی)", `قدرت ${faNum(j.score)} از ۱۰۰`, j.score / 100)] },
    { key: "mind", fa: "ذهن و گفت‌وگو", score: mind,
      summary: `عطارد (${faNum(me.score)}) و ماه (${faNum(mo.score)}) سبک ذهنی‌ات را می‌سازند.`,
      detail: h3.length ? "خانه‌ی سوم اشغال است؛ ارتباط و مهارت عملی نقطه‌ی قوت توست." : "خانه‌ی سوم خالی است؛ عمق بیشتر از گستردگی برایت کار می‌کند.",
      dailyLife: "در گفت‌وگوهای مهم اول گوش می‌دهی و بعد با یک جمع‌بندی دقیق وارد می‌شوی.",
      reflection: "وقتی ذهنت شلوغ است، چه چیزی واقعاً آرامت می‌کند؟",
      evidence: [ev("graha", `عطارد در ${getRashi(me.placement.sign).fa}`, `قدرت ${faNum(me.score)} از ۱۰۰`, me.score / 100)] },
    { key: "family", fa: "خانواده و ریشه", score: fam,
      summary: "ریشه و خانه از ماه و خانه‌ی چهارم خوانده می‌شود.",
      detail: h4.length ? `${h4.map((p) => p.fa).join(" و ")} در خانه‌ی چهارم‌اند؛ خانواده صحنه‌ی پررنگی است.` : "خانه‌ی چهارم خالی است؛ «خانه» برایت بیشتر حس است تا مکان.",
      dailyLife: "آرامش خانه مستقیم روی خواب و تمرکزت اثر می‌گذارد.",
      reflection: "«خانه» برای تو یعنی چه — مکان، آدم‌ها، یا حس؟",
      evidence: [ev("graha", "ماه (ریشه)", `قدرت ${faNum(mo.score)} از ۱۰۰`, mo.score / 100)] },
    { key: "growth", fa: "رشد فردی", score: gro,
      summary: "میانگین قدرت کل چارت، زمینه‌ی رشد توست.",
      detail: gro >= 60 ? "پشتوانه‌ی کلی چارت قوی است؛ رشد از گسترش می‌آید." : gro >= 40 ? "پشتوانه متوسط است؛ رشد به تلاش آگاهانه بستگی دارد." : "پشتوانه کم‌مقدار است؛ رشد از صبر و گام‌های کوچک می‌آید.",
      dailyLife: "هر هفته یک گام کوچک و مشخص، بیشتر از انقلاب‌های یک‌شبه جواب می‌دهد.",
      reflection: "یک سال پیش کجا بودی و حالا کجایی؟",
      evidence: [ev("element", "پشتوانه‌ی کلی نقشه", `میانگین ${faNum(signals.grahas.length)} سیاره: ${faNum(gro)} از ۱۰۰`, gro / 100)] },
    { key: "creativity", fa: "خلاقیت", score: cre,
      summary: "خلاقیت از زهره، مشتری و خانه‌ی پنجم خوانده می‌شود.",
      detail: h5.length ? `${h5.map((p) => p.fa).join(" و ")} در خانه‌ی پنجم‌اند؛ خلق کردن برایت طبیعی است.` : "خانه‌ی پنجم خالی است؛ خلاقیت‌ات بیشتر کاربردی است تا نمایشی.",
      dailyLife: "ایده‌هایت وقتی بهترند که سریع یادداشت شوند.",
      reflection: "آخرین چیزی که با ذوق خلق کردی چه بود؟",
      evidence: [ev("house", "خانه‌ی پنجم", h5.length ? `${h5.map((p) => p.fa).join("، ")} در آن است` : "خالی — حاکمش راهنماست", h5.length ? 0.7 : 0.3)] },
    { key: "exploration", fa: "سفر و معنا", score: exp,
      summary: "افق و معنا از مشتری و خانه‌های نهم و دوازدهم خوانده می‌شود.",
      detail: h9.length + h12.length > 0 ? "خانه‌های سفر و معنا فعال‌اند؛ جابه‌جایی برایت شارژکننده است." : "خانه‌های سفر آرام‌اند؛ معنای تو بیشتر در عمق روزمره است تا دوردست.",
      dailyLife: "سفر — حتی کوتاه — زاویه‌ی دیدت را تازه می‌کند.",
      reflection: "کدام سفر بیشترین تغییر را در تو ساخت؟",
      evidence: [ev("graha", "مشتری (معنا)", `قدرت ${faNum(j.score)} از ۱۰۰`, j.score / 100)] },
  ];
  return inputs
    .map((i) => ({ ...i, icon: AREA_ICONS[i.key], priority: prio(i.score) as LifeArea["priority"] }))
    .sort((x, y) => PRIORITY_RANK[x.priority] - PRIORITY_RANK[y.priority] || y.score - x.score);
}

/** Assembles the full premium report. Pure — no I/O, no clock. */
export function buildPremiumReport(a: AstrologyAnalysis): PremiumReport {
  const themes = [...extractThemes(a), ...extractBondThemes(a), ...extractElementTheme(a)]
    .sort((x, y) => PRIORITY_RANK[x.priority] - PRIORITY_RANK[y.priority] || y.score - x.score)
    .slice(0, 5);
  const contradictions = extractContradictions(a);
  const strengths = extractStrengths(a);
  const growth = extractGrowth(a);
  const areas = extractAreas(a);
  const evidenceCount =
    themes.reduce((n, t) => n + t.evidence.length, 0) +
    strengths.reduce((n, s) => n + s.evidence.length, 0) +
    growth.reduce((n, g) => n + g.evidence.length, 0) +
    areas.reduce((n, r) => n + r.evidence.length, 0);

  return {
    executive: {
      pattern: `الگوی کلی این چارت «${a.dominants.grahaFa}محور» است — ${a.dominants.grahaFa} با ${faNum(a.dominants.grahaScore)} از ۱۰۰ قوی‌ترین نیروست و حاکم صعود (${a.dominants.lagnaLordFa}) در خانه‌ی ${faNum(a.dominants.lagnaLordHouse)} مسیر رشد را تعیین می‌کند.`,
      signature: `امضای چارت: صعود ${getRashi(a.chart.lagna).fa} · ماه ${a.dominants.moonSignFa} · خورشید ${a.dominants.sunSignFa} · عنصر غالب ${a.dominants.elementTopFa} · پررنگ‌ترین خانه: ${a.dominants.houseTopFa} (${faNum(a.dominants.houseTopBindu)} بندو).`,
      topThemes: themes.slice(0, 3).map((t) => t.title),
      topStrength: strengths[0]?.title ?? "اطلاعات کافی برای این تفسیر وجود ندارد.",
      topGrowth: growth[0]?.pattern ?? "اطلاعات کافی برای این تفسیر وجود ندارد.",
    },
    themes, contradictions, strengths, growth, areas,
    quality: {
      sections: 5,
      evidenceCount,
      coverage: a.meta.dataQuality === "full"
        ? "پوشش کامل — ساعت تولد ثبت شده و همه‌ی لایه‌ها محاسبه شدند."
        : "پوشش ماه‌محور — ساعت تولد ثبت نشده؛ تفسیر صعود و زوایا با احتیاط خوانده شود.",
    },
  };
}

