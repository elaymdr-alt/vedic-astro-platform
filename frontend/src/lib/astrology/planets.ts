import type { Graha, GrahaKey, SignKey } from "./types"

/**
 * The nine Grahas — seven visible shukra grahas plus the two lunar nodes
 * (chhaya grahas). Orbital periods are in Earth days.
 */
export const GRAHAS: Graha[] = [
  {
    key: "sun",
    fa: "خورشید",
    en: "Sun",
    glyph: "☉",
    kind: "planet",
    significates: ["هویت", "اراده", "پدر", "سلطه‌گری"],
    keyword: "من و رهبری",
    description:
      "خورشید قلب چارت است. نشان می‌دهد فرد برای چه چیزی در زندگی انرژی می‌گیرد و دنبال چه نوع شناخته‌شدنی است.",
    orbitalPeriod: 365.25,
    accent: "chart-2",
  },
  {
    key: "moon",
    fa: "ماه",
    en: "Moon",
    glyph: "☽",
    kind: "planet",
    significates: ["ذهن", "احساس", "مادر", "امنیت درونی"],
    keyword: "احساس و ذهن",
    description:
      "ماه در طالع‌بینی ودایی «نشان رِده» است: سریع‌ترین و شخصی‌ترین بخش چارت که میل و نوسان درونی فرد را نشان می‌دهد.",
    orbitalPeriod: 27.32,
    accent: "chart-6",
  },
  {
    key: "mars",
    fa: "مریخ",
    en: "Mars",
    glyph: "♂",
    kind: "planet",
    significates: ["اراده", "خشم", "برادر", "جسم"],
    keyword: "انگیزه و عمل",
    description:
      "مریخ نیروی محرک است؛ نشان می‌دهد فرد چگونه برای هدف‌هایش می‌جنگد و خشم را چگونه تخلیه می‌کند.",
    orbitalPeriod: 687,
    accent: "chart-4",
  },
  {
    key: "mercury",
    fa: "عطارد",
    en: "Mercury",
    glyph: "☿",
    kind: "planet",
    significates: ["ذهن", "گفتار", "تحصیل", "تجارت"],
    keyword: "فکر و کلام",
    description:
      "عطارد سیاره‌ی یادگیری و تبادل است؛ کیفیت تحلیل، نوشتن، آموزش و روابط کاری فرد را نشان می‌دهد.",
    orbitalPeriod: 88,
    accent: "chart-3",
  },
  {
    key: "jupiter",
    fa: "مشتری",
    en: "Jupiter",
    glyph: "♃",
    kind: "planet",
    significates: ["شکوفایی", "پدر", "شاخه‌ی دانش", "معنویت"],
    keyword: "گسترش و بخت",
    description:
      "مشتری بزرگ‌ترین نیروی رشد چارت است؛ جایگاهش کیفیت فرصت، آموزش و باورهای زندگی را مشخص می‌کند.",
    orbitalPeriod: 4332.6,
    accent: "chart-5",
  },
  {
    key: "venus",
    fa: "زهره",
    en: "Venus",
    glyph: "♀",
    kind: "planet",
    significates: ["عشق", "زیبایی", "لذت", "دارایی"],
    keyword: "عشق و ارزش",
    description:
      "زهره کیفیت رابطه و آنچه فرد را در زندگی دوست دارد را نشان می‌دهد؛ از روابط تا پول و زیبایی‌شناسی.",
    orbitalPeriod: 224.7,
    accent: "chart-6",
  },
  {
    key: "saturn",
    fa: "زحل",
    en: "Saturn",
    glyph: "♄",
    kind: "planet",
    significates: ["زمان", "ساختار", "انضباط", "پیری"],
    keyword: "ساختن و زمان",
    description:
      "زحل معلم چارت است؛ جایگاهش سخت‌ترین درسی را نشان می‌دهد که فرد باید با صبر یاد بگیرد.",
    orbitalPeriod: 10759,
    accent: "chart-8",
  },
  {
    key: "rahu",
    fa: "راهو",
    en: "Rahu",
    glyph: "☊",
    kind: "shadow",
    significates: ["اشتیاق", "آینده‌نگری", "تجربه", "ناآرامی"],
    keyword: "اشتیاق بی‌پایان",
    description:
      "راهو سایه‌ی شمالی است؛ کشش و وسواسی که فرد را به سمت تجربه‌های ناآشنا می‌برد.",
    orbitalPeriod: 6798,
    accent: "chart-7",
  },
  {
    key: "ketu",
    fa: "کیتو",
    en: "Ketu",
    glyph: "☋",
    kind: "shadow",
    significates: ["رهایی", "معنویت", "گذشته", "بی‌نیازی"],
    keyword: "رها شدن",
    description:
      "کیتو سایه‌ی جنوبی است؛ نقطه‌ای از بی‌نیازی که فرد در زندگی دنبالش می‌گردد.",
    orbitalPeriod: 6798,
    accent: "chart-9",
  },
]

const GRAHA_BY_KEY = new Map<GrahaKey, Graha>(GRAHAS.map((g) => [g.key, g]))

export function getGraha(key: GrahaKey): Graha {
  const g = GRAHA_BY_KEY.get(key)
  if (!g) throw new Error(`Unknown graha: ${key}`)
  return g
}

export function grahaFa(key: GrahaKey): string {
  return getGraha(key).fa
}

/** Each graha's own sign(s) — used for dignity calculations. */
export const OWN_SIGNS: Record<GrahaKey, SignKey[]> = {
  sun: ["leo"],
  moon: ["cancer"],
  mars: ["aries", "scorpio"],
  mercury: ["gemini", "virgo"],
  jupiter: ["sagittarius", "pisces"],
  venus: ["taurus", "libra"],
  saturn: ["capricorn", "aquarius"],
  rahu: [],
  ketu: [],
}

/** Exaltation / debilitation signs — Rahu/Ketu are opposite (5th from exalt). */
export const EXALTED_SIGNS: Partial<Record<GrahaKey, SignKey>> = {
  sun: "aries",
  moon: "taurus",
  mars: "capricorn",
  mercury: "virgo",
  jupiter: "cancer",
  venus: "pisces",
  saturn: "libra",
  rahu: "taurus",
  ketu: "scorpio",
}

/** Moolatrikona ranges in degrees within the exaltation sign. */
export const MOOLATRIKONA: Partial<Record<GrahaKey, [number, number]>> = {
  sun: [0, 20],
  moon: [4, 30],
  mars: [0, 12],
  mercury: [16, 20],
  jupiter: [0, 10],
  venus: [0, 15],
  saturn: [0, 20],
}

export function isExalted(g: GrahaKey, sign: SignKey): boolean {
  return EXALTED_SIGNS[g] === sign
}

export function isDebilitated(g: GrahaKey, sign: SignKey): boolean {
  const exalt = EXALTED_SIGNS[g]
  if (!exalt) return false
  // Nodes are debilitated 7th from exalt; planets 7th from exalt as well
  const exaltIndex = exaltationsIndex(exalt)
  const signIndex = signIndexOf(sign)
  return (exaltIndex + 6) % 12 === signIndex
}

function exaltationsIndex(sign: SignKey): number {
  return ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"].indexOf(sign)
}

function signIndexOf(sign: SignKey): number {
  return exaltationsIndex(sign)
}
