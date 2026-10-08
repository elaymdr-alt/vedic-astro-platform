/**
 * Persian locale helpers.
 *
 * Jalali dates are produced with the built-in `fa-IR-u-ca-persian` calendar
 * (full ICU ships with modern browsers and Node ≥ 14) rather than a
 * hand-rolled conversion table, so leap years stay correct for free.
 */

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const

/** Converts every ASCII digit in a string to its Persian counterpart. */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)])
}

/** Converts Persian/Arabic-Indic digits back to ASCII. */
export function toEnglishDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
}

/** Formats a number then renders it with Persian digits. */
export function faNum(n: number, options?: Intl.NumberFormatOptions): string {
  const formatted = new Intl.NumberFormat("en-US", options).format(n)
  return toPersianDigits(formatted)
}

const jalaliFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
})

const jalaliShortFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
})

const gregorianFormatter = new Intl.DateTimeFormat("fa-IR", {
  year: "numeric",
  month: "long",
  day: "numeric",
})

/** e.g. «۱۷ مرداد ۱۴۰۵» */
export function formatJalali(date: Date | string): string {
  return jalaliFormatter.format(toDate(date))
}

/** e.g. «۱۴۰۵/۰۵/۱۷» */
export function formatJalaliShort(date: Date | string): string {
  return jalaliShortFormatter.format(toDate(date))
}

/** e.g. «۱۷ August 2026» */
export function formatGregorian(date: Date | string): string {
  return gregorianFormatter.format(toDate(date))
}

/** Weekday name in Persian, e.g. «یکشنبه» */
export function formatWeekday(date: Date | string): string {
  return new Intl.DateTimeFormat("fa-IR", { weekday: "long" }).format(
    toDate(date)
  )
}

/** Renders a zodiac degree with degrees + minutes, e.g. «۱۴° ۲۳′» */
export function formatDegree(degree: number, minute = 0): string {
  const d = Math.floor(degree)
  const m = Math.round(minute)
  return `${toPersianDigits(d)}° ${toPersianDigits(m)}′`
}

/** Renders a decimal degree inside a sign, e.g. «۱۴٫۳۸°» */
export function formatDecimal(degree: number, digits = 2): string {
  return `${toPersianDigits(degree.toFixed(digits))}°`
}

/** Jalali month names for date inputs and selectors. */
export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const

/** Gregorian month names shown in the birth form. */
export const GREGORIAN_MONTHS = [
  "ژانویه",
  "فوریه",
  "مارس",
  "آوریل",
  "مه",
  "ژوئن",
  "ژوئیه",
  "اوت",
  "سپتامبر",
  "اکتبر",
  "نوامبر",
  "دسامبر",
] as const

/** Common Iranian birth cities for the quick-pick chips. */
export const POPULAR_CITIES = [
  "تهران",
  "مشهد",
  "شیراز",
  "اصفهان",
  "تبریز",
  "کرج",
  "اهواز",
  "قم",
  "کرمانشاه",
  "رشت",
  "یزد",
  "بندرعباس",
] as const

/** Adds `n` days to a date, returning a new Date. */
export function addDays(input: Date | string, n: number): Date {
  const d = toDate(input)
  const copy = new Date(d.getTime())
  copy.setDate(copy.getDate() + n)
  return copy
}

/** ISO `YYYY-MM-DD` value for `<input type="date">`. */
export function toDateInputValue(input: Date | string): string {
  return toDate(input).toISOString().slice(0, 10)
}

function toDate(input: Date | string): Date {
  return input instanceof Date ? input : new Date(input)
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

const JALALI_PARTS = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", {
  timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric",
})

function jalaliOf(ms: number): [number, number, number] {
  const p = Object.fromEntries(
    JALALI_PARTS.formatToParts(new Date(ms)).map((x) => [x.type, parseInt(x.value, 10)])
  )
  return [p.year, p.month, p.day]
}

/** Jalali (Solar Hijri) y/m/d → Gregorian ISO `YYYY-MM-DD`, or null if the date does not exist. */
export function jalaliToIso(jy: number, jm: number, jd: number): string | null {
  if (jm < 1 || jm > 12 || jd < 1 || jd > 31 || jy < 1178) return null
  const base = Date.UTC(jy + 621, 2, 1) // 1 March of the Gregorian year the Jalali year mostly overlaps
  for (let i = -20; i < 400; i++) {
    const ms = base + i * 86_400_000
    const [y, m, d] = jalaliOf(ms)
    if (y === jy && m === jm && d === jd) return new Date(ms).toISOString().slice(0, 10)
  }
  return null
}

/** Gregorian ISO date → [jy, jm, jd]. */
export function isoToJalali(iso: string): [number, number, number] {
  return jalaliOf(Date.parse(`${iso}T12:00:00Z`))
}
