import type { Bhava } from "./types"

/**
 * The 12 Bhavas (houses). Index is 1-based and always measured
 * counter-clockwise from the Lagna (Ascendant).
 */
export const BHAVAS: Bhava[] = [
  {
    index: 1,
    fa: "خانه‌ی تن",
    en: "House of Self",
    keyword: "شخصیت و ظاهر",
    description:
      "خانه‌ی اول نقطه‌ی شروع هر چارت است؛ نشان می‌دهد فرد با چه انرژی وارد جهان می‌شود و دیگران او را چگونه می‌بینند.",
    matters: ["شخصیت", "سلامت عمومی", "بدن و ظاهر", "شروع زندگی"],
    accent: "chart-2",
  },
  {
    index: 2,
    fa: "خانه‌ی دارایی",
    en: "House of Wealth",
    keyword: "پول و منابع",
    description:
      "خانه‌ی دوم انبار دارایی‌های فرد را نشان می‌دهد: درآمد، پس‌انداز، خانواده و توانایی ساختن ثروت در طول عمر.",
    matters: ["پول و درآمد", "خانواده", "گفتار", "ارزش‌های شخصی"],
    accent: "chart-5",
  },
  {
    index: 3,
    fa: "خانه‌ی شجاعت",
    en: "House of Courage",
    keyword: "جسارت و ارتباط",
    description:
      "خانه‌ی سوم ناحیه‌ی ابراز و ارتباط است: شجاعت، مهارت‌های عملی، نوشتن، و رابطه با خواهر و برادر.",
    matters: ["شجاعت", "مهارت‌ها", "سفر کوتاه", "خواهر و برادر"],
    accent: "chart-4",
  },
  {
    index: 4,
    fa: "خانه‌ی آرامش",
    en: "House of Home",
    keyword: "خانه و خانواده",
    description:
      "خانه‌ی چهارم ریشه‌های فرد است: خانه، خانواده، مادر، و آنچه به او حس «خانه» می‌دهد.",
    matters: ["خانه", "مادر", "ملک", "آرامش درونی"],
    accent: "chart-10",
  },
  {
    index: 5,
    fa: "خانه‌ی فرزند",
    en: "House of Children",
    keyword: "خلاقیت و فرزند",
    description:
      "خانه‌ی پنجم ناحیه‌ی خلاقیت، توانایی باروری و رابطه‌ی فرد با کودکان و شاگردان است.",
    matters: ["فرزندان", "خلاقیت", "عمل نیک", "رابطه با فرزندان"],
    accent: "chart-3",
  },
  {
    index: 6,
    fa: "خانه‌ی دشمن",
    en: "House of Conflict",
    keyword: "چالش و سلامت",
    description:
      "خانه‌ی ششم روبه‌رو با روزمرگی، بیماری، تعارض و بدهی‌هاست؛ جایی که فرد رشد می‌کند که با سختی‌ها روبه‌رو می‌شود.",
    matters: ["بیماری", "دشمنان", "بدهی", "خدمات و روتین"],
    accent: "chart-8",
  },
  {
    index: 7,
    fa: "خانه‌ی ازدواج",
    en: "House of Partnership",
    keyword: "شراکت و ازدواج",
    description:
      "خانه‌ی هفتم تیپ شریک زندگی و کیفیت روابط بلندمدت را نشان می‌دهد — کلیدی‌ترین خانه برای سازگاری.",
    matters: ["ازدواج", "شراکت", "رابطه‌ی کاری", "پیمان‌ها"],
    accent: "chart-6",
  },
  {
    index: 8,
    fa: "خانه‌ی دگرگونی",
    en: "House of Transformation",
    keyword: "بحران و بازپالایی",
    description:
      "خانه‌ی هشتم ناحیه‌ی مرگ و بازتولد است؛ درباره‌ی بحران‌هایی که فرد را دگرگون می‌کنند و منابع مشترک با دیگران.",
    matters: ["بحران", "ارث", "موضوعات تابو", "تحول عمیق"],
    accent: "chart-1",
  },
  {
    index: 9,
    fa: "خانه‌ی سفر",
    en: "House of Journey",
    keyword: "معنا و سفر بلند",
    description:
      "خانه‌ی نهم گستره‌ی دنیا و معنای زندگی است: سفر بلند، دانش بالا، اخلاق و رابطه با باورها.",
    matters: ["سفر", "دانش بالا", "معنویت", "شانس و بخت"],
    accent: "chart-5",
  },
  {
    index: 10,
    fa: "خانه‌ی شهرت",
    en: "House of Career",
    keyword: "کار و شهرت",
    description:
      "خانه‌ی دهم مسیر حرفه‌ای و جایگاه اجتماعی فرد را نشان می‌دهد؛ آنچه جامعه او را با آن می‌شناسد.",
    matters: ["شغل", "شهرت", "دستاورد", "رابطه با منابع بالا"],
    accent: "chart-7",
  },
  {
    index: 11,
    fa: "خانه‌ی برد",
    en: "House of Gains",
    keyword: "دستاورد و آرزو",
    description:
      "خانه‌ی یازدهم جای تحقق آرزوها و سود بلندمدت است؛ همچنین شبکه‌ی اجتماعی و راهنمایان فرد.",
    matters: ["سود", "شبکه", "آرزوها", "برادر بزرگ‌تر"],
    accent: "chart-3",
  },
  {
    index: 12,
    fa: "خانه‌ی رهایی",
    en: "House of Liberation",
    keyword: "هزینه و رهایی",
    description:
      "خانه‌ی دوازدهم پایان و رهاست: رها شدن از وابستگی‌ها، هزینه‌ها، پناهگاه درونی و سکوت.",
    matters: ["هزینه", "رهایی", "تنهایی", "آگاهی درونی"],
    accent: "chart-9",
  },
]

const BHAVA_BY_INDEX = new Map<number, Bhava>(
  BHAVAS.map((b) => [b.index, b])
)

export function getBhava(index: number): Bhava {
  const b = BHAVA_BY_INDEX.get(((index - 1) % 12 + 12) % 12 + 1)
  if (!b) throw new Error(`Invalid bhava index: ${index}`)
  return b
}
