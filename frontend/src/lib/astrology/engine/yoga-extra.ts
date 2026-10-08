import type { GrahaKey, PlanetPlacement, SignKey, YogaDosh } from "../types"
import { getRashi } from "../signs"

const KENDRA = [1, 4, 7, 10]
const DUSTHANA = [6, 8, 12]
const BENEFICS: GrahaKey[] = ["jupiter", "venus", "mercury"]
const REAL: GrahaKey[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]

/**
 * The subset of the evaluation context these extra combinations need. `yoga.ts`
 * passes its richer context — structural typing keeps the two in sync.
 */
export interface ExtraCtx {
  p: Record<GrahaKey, PlanetPlacement>
  lagna: SignKey
  fromMoon: (g: GrahaKey) => number
  lordOf: (h: number) => GrahaKey
  same: (a: GrahaKey, b: GrahaKey) => boolean
}

const dispositor = (c: ExtraCtx, g: GrahaKey) => getRashi(c.p[g].sign).lord

const y = (
  name: string, fa: string, kind: "yoga" | "dosha", strength: YogaDosh["strength"], description: string
): YogaDosh => ({ name, fa, kind, strength, description })

/** Additional classical combinations, each with a real placement test. */
export const EXTRA: { def: YogaDosh; test: (c: ExtraCtx) => boolean; planets: (c: ExtraCtx) => GrahaKey[] }[] = [
  {
    def: y("Viparita Raja Yoga", "یوگای ویپاریتا راجا", "yoga", "strong",
      "حاکم یکی از خانه‌های ۶، ۸ یا ۱۲ در یکی از همین خانه‌ها نشسته است؛ در سنت کلاسیک موفقیت از دل دشواری و شکست رقبا."),
    test: (c) => DUSTHANA.some((h) => DUSTHANA.includes(c.p[c.lordOf(h)].house)),
    planets: (c) => DUSTHANA.map((h) => c.lordOf(h)).filter((g) => DUSTHANA.includes(c.p[g].house)),
  },
  {
    def: y("Parivartana Yoga", "یوگای پاریوارتانا (تبادل برج)", "yoga", "strong",
      "دو سیاره در برج یکدیگر نشسته‌اند؛ پیوندی دوطرفه میان دو حوزه‌ی زندگی که هر دو را تقویت می‌کند."),
    test: (c) =>
      REAL.some((a) => REAL.some((b) => a < b && dispositor(c, a) === b && dispositor(c, b) === a)),
    planets: (c) => {
      const out: GrahaKey[] = []
      for (const a of REAL)
        for (const b of REAL)
          if (a < b && dispositor(c, a) === b && dispositor(c, b) === a) out.push(a, b)
      return [...new Set(out)]
    },
  },
  {
    def: y("Adhi Yoga", "یوگای آدی", "yoga", "moderate",
      "حداقل دو سیاره‌ی نیکو (مشتری، زهره، عطارد) در خانه‌های ۶، ۷ یا ۸ از ماه؛ نشانه‌ی توان رهبری و مقاومت."),
    test: (c) => BENEFICS.filter((g) => [6, 7, 8].includes(c.fromMoon(g))).length >= 2,
    planets: (c) => BENEFICS.filter((g) => [6, 7, 8].includes(c.fromMoon(g))),
  },
  {
    def: y("Sunapha Yoga", "یوگای سونافا", "yoga", "moderate",
      "سیاره‌ای (غیر از خورشید) در خانه‌ی دوم از ماه؛ ثروت‌اندوزی از تلاش خود فرد."),
    test: (c) => REAL.some((g) => g !== "sun" && g !== "moon" && c.fromMoon(g) === 2),
    planets: (c) => REAL.filter((g) => g !== "sun" && g !== "moon" && c.fromMoon(g) === 2),
  },
  {
    def: y("Anapha Yoga", "یوگای آنافا", "yoga", "moderate",
      "سیاره‌ای (غیر از خورشید) در خانه‌ی دوازدهم از ماه؛ شخصیت جذاب و آرامش درونی."),
    test: (c) => REAL.some((g) => g !== "sun" && g !== "moon" && c.fromMoon(g) === 12),
    planets: (c) => REAL.filter((g) => g !== "sun" && g !== "moon" && c.fromMoon(g) === 12),
  },
  {
    def: y("Durudhara Yoga", "یوگای دُرودهارا", "yoga", "strong",
      "سیارات در هر دو سوی ماه (خانه‌های ۲ و ۱۲ از ماه)؛ پشتوانه‌ی مالی و حمایت اطرافیان."),
    test: (c) =>
      REAL.some((g) => g !== "sun" && g !== "moon" && c.fromMoon(g) === 2) &&
      REAL.some((g) => g !== "sun" && g !== "moon" && c.fromMoon(g) === 12),
    planets: (c) => REAL.filter((g) => g !== "sun" && g !== "moon" && [2, 12].includes(c.fromMoon(g))),
  },
  {
    def: y("Amala Yoga", "یوگای آمالا", "yoga", "moderate",
      "تنها سیارات نیکو در خانه‌ی دهم؛ شهرت و رفتار پاک در کار."),
    test: (c) => {
      const tenth = REAL.filter((g) => c.p[g].house === 10)
      return tenth.length > 0 && tenth.every((g) => BENEFICS.includes(g) || g === "moon")
    },
    planets: (c) => REAL.filter((g) => c.p[g].house === 10),
  },
  {
    def: y("Saraswati Yoga", "یوگای ساراسواتی", "yoga", "strong",
      "مشتری، زهره و عطارد در خانه‌های ۱، ۲، ۴، ۵، ۷، ۹ یا ۱۰ و مشتری قدرتمند؛ دانش، هنر و بیان."),
    test: (c) =>
      BENEFICS.every((g) => [1, 2, 4, 5, 7, 9, 10].includes(c.p[g].house)) &&
      (c.p.jupiter.dignity === "own" || c.p.jupiter.dignity === "exalted"),
    planets: () => [...BENEFICS],
  },
  {
    def: y("Lakshmi Yoga", "یوگای لاکشمی", "yoga", "strong",
      "حاکم خانه‌ی نهم در برج خود یا شرف و در کندرا/تریکونا؛ برکت و ثروت پایدار."),
    test: (c) => {
      const g = c.lordOf(9)
      const q = c.p[g]
      return [1, 4, 5, 7, 9, 10].includes(q.house) && (q.dignity === "own" || q.dignity === "exalted")
    },
    planets: (c) => [c.lordOf(9)],
  },
  {
    def: y("Neecha Bhanga Raja Yoga", "یوگای نیچا بهنگا راجا", "yoga", "strong",
      "سیاره‌ی هبوط‌یافته‌ای که حاکم برجش در کندرا از لگنا یا ماه است؛ ضعف اولیه به قدرت تبدیل می‌شود."),
    test: (c) =>
      REAL.some((g) => {
        if (!c.p[g].debilitated) return false
        const d = dispositor(c, g)
        return KENDRA.includes(c.p[d].house) || KENDRA.includes(c.fromMoon(d))
      }),
    planets: (c) =>
      REAL.filter((g) => {
        if (!c.p[g].debilitated) return false
        const d = dispositor(c, g)
        return KENDRA.includes(c.p[d].house) || KENDRA.includes(c.fromMoon(d))
      }),
  },
  {
    def: y("Guru Chandala Dosha", "دوشای گورو چاندالا", "dosha", "moderate",
      "پیوستگی مشتری و راهو؛ تعارض میان آموزه‌های سنتی و راه‌های نو."),
    test: (c) => c.same("jupiter", "rahu"),
    planets: () => ["jupiter", "rahu"],
  },
  {
    def: y("Grahan Dosha", "دوشای گرهن (کسوف/خسوف)", "dosha", "moderate",
      "خورشید یا ماه همبرج با راهو یا کتو؛ تلاطم در اعتمادبه‌نفس یا احساسات."),
    test: (c) =>
      c.same("sun", "rahu") || c.same("sun", "ketu") || c.same("moon", "rahu") || c.same("moon", "ketu"),
    planets: (c) => {
      const lum: GrahaKey[] = []
      if (c.same("sun", "rahu") || c.same("sun", "ketu")) lum.push("sun")
      if (c.same("moon", "rahu") || c.same("moon", "ketu")) lum.push("moon")
      if (c.same("sun", "rahu") || c.same("moon", "rahu")) lum.push("rahu")
      if (c.same("sun", "ketu") || c.same("moon", "ketu")) lum.push("ketu")
      return [...new Set(lum)]
    },
  },
  {
    def: y("Angarak Dosha", "دوشای آنگارک", "dosha", "moderate",
      "پیوستگی مریخ و راهو؛ تندی و تصمیم‌های آنی که نیاز به مهار دارد."),
    test: (c) => c.same("mars", "rahu"),
    planets: () => ["mars", "rahu"],
  },
  {
    def: y("Vish Yoga", "دوشای ویش", "dosha", "moderate",
      "پیوستگی ماه و زحل؛ سنگینی روحی و نیاز به مراقبت از خلق‌وخو."),
    test: (c) => c.same("moon", "saturn"),
    planets: () => ["moon", "saturn"],
  },
]
