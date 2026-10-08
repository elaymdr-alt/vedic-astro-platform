import { getRashi } from "./signs"
import { getGraha, grahaFa } from "./planets"
import { DASA_DESCRIPTIONS } from "./nakshatra"
import { activeDasha } from "./engine/dasha"
import { GOCHARA_VERDICT_FA, type GocharaRow } from "./engine/vedha"
import type {
  FortuneLevel,
  GrahaKey,
  NatalChart,
  PlanetPlacement,
  SignKey,
} from "./types"


export const SIGN_KEYS: SignKey[] = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
]


export const ASHTAKAVARGA_TOTAL = 337
export const ASHTAKAVARGA_AVERAGE = ASHTAKAVARGA_TOTAL / 12 // ≈ 28.08

export const LUCKY: Record<GrahaKey, { number: number; color: string; stone: string; mantra: string }> = {
  sun: { number: 1, color: "نارنجی و طلایی", stone: "یاقوت سرخ", mantra: "اوم سوریایه نمه" },
  moon: { number: 2, color: "سفید و نقره‌ای", stone: "مروارید", mantra: "اوم چاندرایه نمه" },
  mars: { number: 9, color: "سرخ مرجانی", stone: "مرجان", mantra: "اوم مَنگَلایه نمه" },
  mercury: { number: 5, color: "سبز", stone: "زمرد", mantra: "اوم بودهایه نمه" },
  jupiter: { number: 3, color: "زرد و طلایی", stone: "یاقوت زرد", mantra: "اوم گورَوه نمه" },
  venus: { number: 6, color: "سفید صدفی و صورتی", stone: "الماس یا زیرکن", mantra: "اوم شوکرایه نمه" },
  saturn: { number: 8, color: "آبی نفتی و مشکی", stone: "یاقوت کبود", mantra: "اوم شَنایشچَرایه نمه" },
  rahu: { number: 4, color: "خاکستری دودی", stone: "گومد", mantra: "اوم رَهوِه نمه" },
  ketu: { number: 7, color: "قهوه‌ای خاکی", stone: "چشم‌گربه", mantra: "اوم کِتَوه نمه" },
}

export const PROFESSION: Record<GrahaKey, string> = {
  sun: "مدیریت، دولت و رهبری",
  moon: "مراقبت، خدمات و صنایع غذایی",
  mars: "مهندسی، ورزش و کارهای اجرایی",
  mercury: "تجارت، نویسندگی و فناوری",
  jupiter: "مشاوره، آموزش، حقوق و امور مالی",
  venus: "هنر، طراحی و زیبایی",
  saturn: "ساختمان، صنعت و کارهای تخصصی بلندمدت",
  rahu: "فناوری نو، رسانه و کار بین‌المللی",
  ketu: "پژوهش، درمان و معنویت",
}

export function housesWithGrahas(
  chart: NatalChart
): { house: number; grahas: PlanetPlacement[] }[] {
  return Array.from({ length: 12 }, (_, i) => {
    const house = i + 1
    return {
      house,
      grahas: chart.placements.filter((p) => p.house === house),
    }
  })
}

/** The sign occupying each house, starting from the Lagna. */
export function houseSigns(chart: NatalChart): SignKey[] {
  const start = SIGN_KEYS.indexOf(chart.lagna)
  return Array.from({ length: 12 }, (_, i) => SIGN_KEYS[(start + i) % 12])
}

/** A short, plain-language reading of one house. */
export function houseInsight(chart: NatalChart, house: number): string {
  const sign = houseSigns(chart)[house - 1]
  const grahas = chart.placements.filter((p) => p.house === house)
  const rashi = getRashi(sign)

  if (grahas.length === 0) {
    return `خانه‌ی ${house} در برج ${rashi.fa} خالی است؛ حاکمان بر این خانه (${rashi.lordFa}) نقش اصلی را در این حوزه بازی می‌کنند.`
  }

  const names = grahas.map((g) => getGraha(g.graha).fa).join("، ")
  return `خانه‌ی ${house} در برج ${rashi.fa} با ${names} اشغال شده؛ انرژی این خانه مستقیماً از سیارات مستقر در آن می‌آید.`
}

export const FORTUNE_LABELS: Record<FortuneLevel, { fa: string; hint: string }> = {
  green: { fa: "مطلوب", hint: "برو جلو" },
  amber: { fa: "خنثی", hint: "معمولی" },
  red: { fa: "محتاط", hint: "آرام‌تر باش" },
}

/** Re-exports so UI layers can render the gochara verdicts without importing the engine directly. */
export { GOCHARA_VERDICT_FA }
export type { GocharaRow }


/** Short Vimshottari summary (current Mahadasha + Antardasha) for the chart header. */
export function currentDashaSummary(chart: NatalChart): {
  graha: GrahaKey
  period: string
  description: string
} {
  const { maha, antar } = activeDasha(chart)
  const year = (d: string) =>
    new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(new Date(d))
  return {
    graha: maha.graha,
    period: `${year(maha.from)} – ${year(maha.to)}`,
    description:
      DASA_DESCRIPTIONS[maha.graha] +
      (antar ? ` زیردوره‌ی فعلی: ${grahaFa(antar.graha)} تا ${year(antar.to)}.` : ""),
  }
}
