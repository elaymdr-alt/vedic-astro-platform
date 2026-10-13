import type { Rashi, SignKey } from "./types"

/**
 * The 12 Rashis (zodiac signs). `index` is 0-based and matches the
 * house/sign maths used by the chart wheel.
 */
export const RASHIS: Rashi[] = [
  {
    key: "aries",
    index: 0,
    fa: "حمل",
    en: "Aries",
    symbol: "♈︎",
    element: "fire",
    modality: "cardinal",
    lord: "mars",
    lordFa: "مریخ",
    dates: "۲۱ مارس – ۱۹ آوریل",
    keyword: "آغاز، جسارت، رقابت",
    traits: ["پیشرو", "جسور", "بی‌صبر", "کارآمد"],
    accent: "chart-4",
  },
  {
    key: "taurus",
    index: 1,
    fa: "ثور",
    en: "Taurus",
    symbol: "♉︎",
    element: "earth",
    modality: "fixed",
    lord: "venus",
    lordFa: "زهره",
    dates: "۲۰ آوریل – ۲۱ مه",
    keyword: "ثبات، مادیات، حس زیبایی",
    traits: ["صبور", "وفادار", "عمل‌گرا", "لذت‌جو"],
    accent: "chart-5",
  },
  {
    key: "gemini",
    index: 2,
    fa: "جوزا",
    en: "Gemini",
    symbol: "♊︎",
    element: "air",
    modality: "mutable",
    lord: "mercury",
    lordFa: "عطارد",
    dates: "۲۱ مه – ۲۰ ژوئن",
    keyword: "ارتباط، یادگیری، چندوجهی",
    traits: ["کنجکاو", "خوش‌سخن", "تطبیق‌پذیر", "پراکنده"],
    accent: "chart-3",
  },
  {
    key: "cancer",
    index: 3,
    fa: "سرطان",
    en: "Cancer",
    symbol: "♋︎",
    element: "water",
    modality: "cardinal",
    lord: "moon",
    lordFa: "ماه",
    dates: "۲۱ ژوئن – ۲۲ ژوئیه",
    keyword: "خانه، عاطفه، امنیت",
    traits: ["دلسوز", "حافظ", "شهودی", "منزوی"],
    accent: "chart-6",
  },
  {
    key: "leo",
    index: 4,
    fa: "اسد",
    en: "Leo",
    symbol: "♌︎",
    element: "fire",
    modality: "fixed",
    lord: "sun",
    lordFa: "خورشید",
    dates: "۲۳ ژوئیه – ۲۲ اوت",
    keyword: "هویت، رهبری، درخشش",
    traits: ["باشکوه", "سخاوتمند", "نمایشی", "وفادار"],
    accent: "chart-2",
  },
  {
    key: "virgo",
    index: 5,
    fa: "سنبله",
    en: "Virgo",
    symbol: "♍︎",
    element: "earth",
    modality: "mutable",
    lord: "mercury",
    lordFa: "عطارد",
    dates: "۲۳ اوت – ۲۲ سپتامبر",
    keyword: "دقت، خدمت، تحلیل",
    traits: ["دقیق", "مفید", "کمال‌گرا", "محتاط"],
    accent: "chart-3",
  },
  {
    key: "libra",
    index: 6,
    fa: "میزان",
    en: "Libra",
    symbol: "♎︎",
    element: "air",
    modality: "cardinal",
    lord: "venus",
    lordFa: "زهره",
    dates: "۲۳ سپتامبر – ۲۲ اکتبر",
    keyword: "تعادل، رابطه، زیبایی‌شناسی",
    traits: ["متعادل", "دیپلمات", "خوش‌سلیقه", "منصف"],
    accent: "chart-6",
  },
  {
    key: "scorpio",
    index: 7,
    fa: "عقرب",
    en: "Scorpio",
    symbol: "♏︎",
    element: "water",
    modality: "fixed",
    lord: "mars",
    lordFa: "مریخ",
    dates: "۲۳ اکتبر – ۲۱ نوامبر",
    keyword: "عمق، دگرگونی، رازداری",
    traits: ["عمیق", "متعهد", "جسور", "کنترل‌گر"],
    accent: "chart-4",
  },
  {
    key: "sagittarius",
    index: 8,
    fa: "قوس",
    en: "Sagittarius",
    symbol: "♐︎",
    element: "fire",
    modality: "mutable",
    lord: "jupiter",
    lordFa: "مشتری",
    dates: "۲۲ نوامبر – ۲۱ دسامبر",
    keyword: "گسترش، خوش‌بینی، معنا",
    traits: ["خوش‌بین", "ماجراجو", "فیلسوف", "صادق"],
    accent: "chart-5",
  },
  {
    key: "capricorn",
    index: 9,
    fa: "جدی",
    en: "Capricorn",
    symbol: "♑︎",
    element: "earth",
    modality: "cardinal",
    lord: "saturn",
    lordFa: "زحل",
    dates: "۲۲ دسامبر – ۱۹ ژانویه",
    keyword: "ساختن، مسئولیت، جاه‌طلبی",
    traits: ["منظم", "جاه‌طلب", "واقع‌گرا", "صبور"],
    accent: "chart-8",
  },
  {
    key: "aquarius",
    index: 10,
    fa: "دلو",
    en: "Aquarius",
    symbol: "♒︎",
    element: "air",
    modality: "fixed",
    lord: "saturn",
    lordFa: "زحل",
    dates: "۲۰ ژانویه – ۱۸ فوریه",
    keyword: "آزادی، آینده، جمع‌گرایی",
    traits: ["آزاداندیش", "بشردوستانه", "خلاق", "سرد"],
    accent: "chart-10",
  },
  {
    key: "pisces",
    index: 11,
    fa: "حوت",
    en: "Pisces",
    symbol: "♓︎",
    element: "water",
    modality: "mutable",
    lord: "jupiter",
    lordFa: "مشتری",
    dates: "۱۹ فوریه – ۲۰ مارس",
    keyword: "شهود، همدلی، رهایی",
    traits: ["همدل", "شهودی", "خیال‌پرداز", "بخشنده"],
    accent: "chart-1",
  },
]

const RASHI_BY_KEY = new Map<SignKey, Rashi>(
  RASHIS.map((r) => [r.key, r])
)

const RASHI_BY_INDEX = new Map<number, Rashi>(
  RASHIS.map((r) => [r.index, r])
)

export function getRashi(key: SignKey): Rashi {
  const r = RASHI_BY_KEY.get(key)
  if (!r) throw new Error(`Unknown rashi: ${key}`)
  return r
}

/** Accepts either a SignKey or a 1-based sign number (1 = Aries). */
export function rashiFrom(keyOrNumber: SignKey | number): Rashi {
  if (typeof keyOrNumber === "number") {
    const r = RASHI_BY_INDEX.get(((keyOrNumber - 1) % 12 + 12) % 12)
    if (!r) throw new Error(`Invalid sign number: ${keyOrNumber}`)
    return r
  }
  return getRashi(keyOrNumber)
}

export const ELEMENT_LABELS = {
  fire: { fa: "آتش", accent: "chart-4" },
  earth: { fa: "خاک", accent: "chart-5" },
  air: { fa: "باد", accent: "chart-3" },
  water: { fa: "آب", accent: "chart-10" },
} as const

export const MODALITY_LABELS = {
  cardinal: { fa: "کاردینال", hint: "آغازگر" },
  fixed: { fa: "ثابت", hint: "پایدار" },
  mutable: { fa: "متغیر", hint: "سازگار" },
} as const
