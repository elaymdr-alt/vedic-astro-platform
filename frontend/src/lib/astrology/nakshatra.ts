import type { GrahaKey, SignKey } from "./types"

export interface Nakshatra {
  /** 1-based, matching the classical enumeration */
  index: number
  fa: string
  en: string
  /** Traditional emblem */
  symbolFa: string
  lord: GrahaKey
  /** 0-based index into the 360° circle */
  startDeg: number
  spanDeg: number
  keyword: string
}

type Row = [
  fa: string,
  en: string,
  symbolFa: string,
  lord: GrahaKey,
  keyword: string,
]

const NAKSHATRA_ROWS: Row[] = [
  ["آشوینی", "Ashwini", "اسب", "ketu", "شروع و شتاب"],
  ["بهارانی", "Bharani", "یونی", "venus", "تولد و نگه‌داری"],
  ["کریتیکا", "Krittika", "چاقو", "sun", "برش و پالایش"],
  ["روهینی", "Rohini", "ارابه", "moon", "رشد و زیبایی"],
  ["مریگاشیرا", "Mrigashira", "سر گوزن", "mars", "جست‌وجو و شکار"],
  ["آردرا", "Ardra", "اشک", "rahu", "درد و دگرگونی"],
  ["پونارواسو", "Punarvasu", "کمان و تیر", "jupiter", "بازگشت و بهبود"],
  ["پوشیا", "Pushya", "نیلوفر", "saturn", "توانمندی و رشد"],
  ["اشلیشا", "Ashlesha", "مار پیچ", "mercury", "پیچیدگی و حیله"],
  ["مگها", "Magha", "تخت", "ketu", "میراث و نیاکان"],
  ["پوروا فالگونی", "Purva Phalguni", "تاب‌گاه", "venus", "لذت و خلاقیت"],
  ["اوتارا فالگونی", "Uttara Phalguni", "بستر", "sun", "پایبندی به سنت"],
  ["هَستا", "Hasta", "دست", "moon", "مهارت و ساختن"],
  ["چیترا", "Chitra", "نگین درخشان", "mars", "زیبایی‌شناسی و نقش"],
  ["سواتی", "Svati", "برگ", "rahu", "استقلال و بادبانک"],
  ["ویشاکا", "Vishakha", "هاون و کوبه", "jupiter", "اراده و پیگیری"],
  ["آنورادها", "Anuradha", "نیلوفر", "saturn", "وفاداری و موفقیت"],
  ["جیشتا", "Jyeshtha", "چتر", "mercury", "برتری و قدرت"],
  ["مولا", "Mula", "ریشه", "ketu", "ریشه‌کنی و بنیان"],
  ["پوروا آشادا", "Purva Ashadha", "نیب فیل", "venus", "دعوت و اشتیاق"],
  ["اوتارا آشادا", "Uttara Ashadha", "توخالی", "sun", "پیروزی ماندگار"],
  ["شراوانا", "Shravana", "خوشه", "moon", "شنیدن و آموزش"],
  ["دانیشتا", "Dhanishtha", "طبل", "mars", "غنیمت و سفر"],
  ["شاتابیشا", "Shatabhisha", "دایره توخالی", "rahu", "شفا و راز"],
  ["پوروا بادراپادا", "Purva Bhadrapada", "پایه‌ی تابوت", "jupiter", "تقدیر و توانمندی"],
  ["اوتارا بادراپادا", "Uttara Bhadrapada", "بستر", "saturn", "پایداری و نجات"],
  ["رواتی", "Revati", "ماهی", "mercury", "رهایی و سفر دریایی"],
]

const SPAN = 360 / 27

export const NAKSHATRAS: Nakshatra[] = NAKSHATRA_ROWS.map(
  ([fa, en, symbolFa, lord, keyword], i) => ({
    index: i + 1,
    fa,
    en,
    symbolFa,
    lord,
    startDeg: i * SPAN,
    spanDeg: SPAN,
    keyword,
  })
)

/** Pada = 3°20′ of the zodiac, four per nakshatra. */
export const PADA_SPAN = SPAN / 4

/**
 * Resolves nakshatra + pada from an absolute sidereal longitude (0–360°).
 */
export function nakshatraFromLongitude(longitude: number): {
  nakshatra: Nakshatra
  pada: 1 | 2 | 3 | 4
  degreesInNakshatra: number
} {
  const normalized = ((longitude % 360) + 360) % 360
  const index = Math.min(26, Math.floor(normalized / SPAN))
  const nakshatra = NAKSHATRAS[index]
  const within = normalized - nakshatra.startDeg
  const pada = Math.min(4, Math.floor(within / PADA_SPAN) + 1) as 1 | 2 | 3 | 4
  return { nakshatra, pada, degreesInNakshatra: within }
}

const SIGN_KEYS: SignKey[] = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
]

/**
 * The pada's Navamsa sign (D9). Padas are the seed of the nine-fold
 * division, so this is derived rather than looked up.
 */
export function padaNavamsa(
  nakshatraIndex: number,
  pada: 1 | 2 | 3 | 4
): SignKey {
  return SIGN_KEYS[(nakshatraIndex + (pada - 1)) % 12]
}

/** Vimshottari dasha sequence — the 120-year cycle starting from Ketu. */
export const VIMSHOTTARI_ORDER: GrahaKey[] = [
  "ketu",
  "venus",
  "sun",
  "moon",
  "mars",
  "rahu",
  "jupiter",
  "saturn",
  "mercury",
]

/** Years of each Mahadasha in the 120-year cycle. */
export const VIMSHOTTARI_YEARS: Record<GrahaKey, number> = {
  ketu: 7,
  venus: 20,
  sun: 6,
  moon: 10,
  mars: 7,
  rahu: 18,
  jupiter: 16,
  saturn: 19,
  mercury: 17,
}

export const DASA_LABELS: Record<GrahaKey, string> = {
  ketu: "کیتو",
  venus: "زهره",
  sun: "خورشید",
  moon: "ماه",
  mars: "مریخ",
  rahu: "راهو",
  jupiter: "مشتری",
  saturn: "زحل",
  mercury: "عطارد",
}

export const DASA_DESCRIPTIONS: Record<GrahaKey, string> = {
  ketu: "دوره‌ی رها کردن تعلقات و رسیدن به بینش؛ انگیزه‌ی درونی قوی اما بی‌ثباتی.",
  venus: "دوره‌ی آرامش، رابطه و زیبایی؛ فرصت‌های مالی و عاطفی باز می‌شود.",
  sun: "دوره‌ی هویت و اراده؛ جایگاه و رهبری فرد به کانون توجه می‌آید.",
  moon: "دوره‌ی رشد احساسی و ذهنی؛ تغییر مکان یا مسئولیت خانوادگی محتمل است.",
  mars: "دوره‌ی اقدام و رقابت؛ انرژی زیاد اما نیاز به کنترل خشم.",
  rahu: "دوره‌ی تجربه‌ی ناآشنا و نوسان شدید؛ بیشترین بازده از ریسک محتاطانه.",
  jupiter: "دوره‌ی گسترش، آموزش و بخت؛ بهترین زمان برای سرمایه‌گذاری بلندمدت.",
  saturn: "دوره‌ی ساختن و پرداخت بدهی کارما؛ موفقیت با تلاش و صبر می‌آید.",
  mercury: "دوره‌ی ذهن، ارتباط و تجارت؛ چند منبع درآمد هم‌زمان فعال می‌شود.",
}
