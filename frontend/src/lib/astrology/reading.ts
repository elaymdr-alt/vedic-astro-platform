/**
 * Reading builder — turns a computed NatalChart into a structured,
 * plain-Persian narrative for the /reading page.
 *
 * Pure data + copy only (no JSX, no I/O) so tests can assert narrative
 * coverage: every sign gets bespoke wording, all 12 houses and 9 grahas
 * are always explained, and no string ships empty.
 */
import { currentDashaSummary, houseSigns } from "./chart"
import { faNum } from "./format"
import { getBhava } from "./houses"
import { NAKSHATRAS } from "./nakshatra"
import { getGraha } from "./planets"
import { ELEMENT_LABELS, getRashi, MODALITY_LABELS } from "./signs"
import type {
  FortuneLevel,
  GrahaKey,
  NatalChart,
  Rashi,
  SignKey,
  YogaDosh,
} from "./types"

// ── Chapter navigation ─────────────────────────────────────────────────────

export interface ReadingChapterMeta {
  /** Anchor id in the page */
  id: string
  num: string
  /** Short label for the sticky pill nav */
  short: string
  eyebrow: string
  title: string
}

export const READING_CHAPTERS: ReadingChapterMeta[] = [
  { id: "identity", num: "۱", short: "شناخت خود", eyebrow: "لگنا · درِ ورودی", title: "تو کیستی؟" },
  { id: "mind", num: "۲", short: "جهان درون", eyebrow: "ماه · ذهن و احساس", title: "ذهن و احساس‌ات چطور کار می‌کند" },
  { id: "core", num: "۳", short: "اراده", eyebrow: "خورشید · هسته", title: "اراده و مسیر زندگی" },
  { id: "houses", num: "۴", short: "خانه‌ها", eyebrow: "بهاوا · نقشه", title: "دوازده حوزه‌ی زندگی" },
  { id: "grahas", num: "۵", short: "سیارات", eyebrow: "گراه‌ها · نیروها", title: "صدای نه نیروی درونی تو" },
  { id: "patterns", num: "۶", short: "الگوها", eyebrow: "یوگا و دوشا", title: "الگوهای قوت و چالش" },
  { id: "time", num: "۷", short: "زمان", eyebrow: "داشا · تقویم", title: "الان در کدام فصل زندگی‌ای؟" },
  { id: "guide", num: "۸", short: "راهنما", eyebrow: "کاربردی", title: "راهنمای عملی تو" },
  { id: "glossary", num: "۹", short: "واژه‌نامه", eyebrow: "از عمیق تا ساده", title: "مفاهیم عمیق، به زبان ساده" },
]

// ── Document shape ─────────────────────────────────────────────────────────

export interface Medallion {
  key: "lagna" | "moon" | "sun"
  label: string
  hint: string
  signKey: SignKey
  signFa: string
  symbol: string
  accent: string
  keyword: string
  note: string
}

export interface ElementBar {
  key: Rashi["element"]
  fa: string
  count: number
  percent: number
}

export interface HouseItem {
  house: number
  fa: string
  keyword: string
  matters: string[]
  signFa: string
  signSymbol: string
  accent: string
  lordFa: string
  planets: { fa: string; glyph: string; accent: string }[]
  occupied: boolean
  line: string
  bindu: number
  tone: "green" | "amber" | "red"
}

export interface GrahaVoice {
  analysis?: string
  example?: string
  action?: string

  key: GrahaKey
  fa: string
  glyph: string
  accent: string
  signFa: string
  house: number
  houseFa: string
  badge: string
  badgeTone: "good" | "soft" | "hard"
  body: string
}

export interface PatternItem {
  name: string
  fa: string
  kind: "yoga" | "dosha"
  strengthLabel: string
  score?: number
  description: string
}

export interface TimelineItem {
  graha: GrahaKey
  fa: string
  glyph: string
  accent: string
  fromLabel: string
  toLabel: string
  level: FortuneLevel
  active: boolean
}

export interface SectionContent {
  concept: string
  paragraphs: string[]
  analysis?: string
  example?: string
  action?: string
}


/**
 * The narrative summary block of the reading page.
 *
 * This type carries **no confidence or probability field** — that is deliberate.
 * The old `confidenceOverall: 82`, a fixed `[88, 81, 79, 85, 80]` breakdown and
 * 80/15/5% scenario probabilities were invented numbers with nothing behind
 * them. Quantitative, traceable output now lives in `./intelligence`, where
 * every score is the sum of its own evidence weights.
 */
export interface IntelligenceDoc {
  status: string
  bias: string
  trend: string
  conflicts: { title: string; desc: string; resolution: string }[]
  storySequence: { step: string; label: string; detail: string }[]
  /** What would change this reading — stated as a chart fact, not a forecast. */
  invalidation: string
  watchpoints: string[]
}

export interface ReadingDoc {
  hero: { lede: string; medallions: Medallion[] }
  executive: {
    coreStrength: string
    mentalPeace: string
    weeklyAction: string
  }
  intelligence: IntelligenceDoc
  identity: {
    concept: string
    paragraphs: string[]
    quote: string
    traits: string[]
    elements: ElementBar[]
    karaka: string | null
    analysis?: string
    example?: string
    action?: string
  }
  mind: {
    concept: string
    paragraphs: string[]
    quote: string
    nakName: string
    nakLord: string
    nakSymbol: string
    nakKeyword: string
    nakPada: number
    analysis?: string
    example?: string
    action?: string
  }
  core: {
    concept: string
    paragraphs: string[]
    quote: string
    analysis?: string
    example?: string
    action?: string
  }
  houses: { concept: string; items: HouseItem[]; summary: string; avNote: string }
  grahas: { concept: string; voices: GrahaVoice[] }
  patterns: {
    concept: string
    yogas: PatternItem[]
    doshas: PatternItem[]
    note: string
  }
  time: {
    concept: string
    explain: string
    period: string
    description: string
    timeline: TimelineItem[]
  }
  guide: {
    concept: string
    tips: string[]
    facts: { label: string; value: string }[]
    mantra: string
    blessing: string
  }
  glossary: { term: string; body: string }[]
}

/** Logical reasoning for house placements */
const HOUSE_ANALYSIS: Record<number, string> = {
  1: "تمرکز تمام نیروهای حیاتی بر روی 'خود' و تصویر شخصی؛ شما موتور محرک محیط هستید.",
  2: "گره خوردن امنیت روانی به داشته‌های مادی و کلام؛ کلمات شما ارزش تولید می‌کنند.",
  3: "ذهن جستجوگر و دست‌های توانا؛ مهارت‌های ارتباطی پل پیروزی شماست.",
  4: "قلب شما در خانه و ریشه‌ها می‌تپد؛ آرامش درونی پیش‌نیاز هر موفقیت بیرونی است.",
  5: "خلاقیت و ابراز وجود از طریق قلب؛ شما برای خلق کردن و شادی به دنیا آمده‌اید.",
  6: "نظم‌دهی به آشفتگی‌ها؛ قدرت شما در حل مسائل روزمره و غلبه بر موانع است.",
  7: "آینه شدن در دیگران؛ رشد شما از طریق تعادل در روابط و شراکت‌ها رخ می‌دهد.",
  8: "عبور از پوسته‌ها و رسیدن به مغز؛ شما قدرت درک نادیدنی‌ها و تحول عمیق را دارید.",
  9: "جستجوی معنا در افق‌های دور؛ باورها و دانش کلان، قطب‌نمای حرکت شماست.",
  10: "ایستادن در اوج؛ هویت شما با تأثیرگذاری اجتماعی و مسئولیت‌پذیری تعریف می‌شود.",
  11: "پیوند با شبکه جهانی؛ آرزوهای شما از مسیر همکاری‌های گروهی محقق می‌شود.",
  12: "رها کردن برای به دست آوردن؛ قدرت شما در خلوت، معنویت و درک پایان‌هاست.",
}

/** Everyday life examples for house placements */
const HOUSE_EXAMPLE: Record<number, string> = {
  1: "وقتی وارد اتاقی می‌شوید، دیگران آگاهانه یا ناآگاهانه منتظر واکنش یا تایید شما می‌مانند.",
  2: "حتی یک خرید کوچک یا یک گفتگوی ساده مالی، تاثیر مستقیمی بر اعتماد به نفس آن روز شما دارد.",
  3: "احتمالاً همیشه چند تب باز در مرورگر دارید یا در حال یادگیری یک مهارت فنی جدید هستید.",
  4: "یک تغییر دکوراسیون کوچک در اتاق شخصی‌تان، می‌تواند کل انرژی کاری هفته‌تان را تغییر دهد.",
  5: "در بازی با کودکان یا انجام پروژه‌های هنری، گذر زمان را کاملاً فراموش می‌کنید.",
  6: "برخلاف دیگران، از دیدن لیست کارهای انباشته شده نمی‌ترسید و از تیک زدن آن‌ها لذت می‌برید.",
  7: "بیشتر از اینکه به خودتان فکر کنید، به این فکر می‌کنید که چطور با پارتنر یا همکارتان هماهنگ شوید.",
  8: "علاقه عجیبی به کشف رازها، روانشناسی عمیق یا حتی مسائل ماورایی و مالی دیگران دارید.",
  9: "در لحظات سخت، به جای جزئیات، به 'تصویر بزرگتر' و فلسفه زندگی پناه می‌برید.",
  10: "حتی در یک مهمانی دوستانه، ناخودآگاه نقش سازمان‌دهنده و مدیر را بر عهده می‌گیرید.",
  11: "بهترین ایده‌هایتان زمانی به ذهن‌تان می‌رسد که در یک گروه یا انجمن در حال تبادل نظر هستید.",
  12: "گاهی نیاز دارید چند روزی ناپدید شوید و در تنهایی خودتان شارژ شوید تا بتوانید به دنیا برگردید.",
}

/** Practical decision-making advice */
const HOUSE_ACTION: Record<number, string> = {
  1: "در تصمیم‌گیری‌ها، اولویت را به رشد شخصی بدهید؛ اگر شما خوب باشید، همه چیز خوب می‌شود.",
  2: "قبل از خریدهای بزرگ، از خود بپرسید: آیا این به ارزش‌های درونی من اضافه می‌کند یا فقط یک مسکن است؟",
  3: "اگر در پروژه‌ای گیر کردید، با نوشتن یا مشورت با برادر/خواهر یا نزدیکان، گره را باز کنید.",
  4: "هر وقت احساس آشفتگی کردید، اول محیط فیزیکی خانه‌تان را پاکسازی کنید؛ معجزه می‌کند.",
  5: "تصمیماتی که بوی ریسک خلاقانه و شادی می‌دهند را به منطق خشک و حساب‌گرانه ترجیح دهید.",
  6: "به جای کارهای بزرگ و ناگهانی، روی عادت‌های کوچک روزانه و چک‌آپ‌های سلامتی تمرکز کنید.",
  7: "در قراردادها و روابط، به دنبال معامله 'برد-برد' باشید؛ هرگونه خودخواهی به ضرر شما تمام می‌شود.",
  8: "از تغییرات بزرگ نترسید؛ هر 'پایانی' در زندگی شما مقدمه یک تولد باشکوه‌تر است.",
  9: "همیشه یک استاد یا منبع الهام داشته باشید؛ یادگیری مداوم، اضطراب شما را درمان می‌کند.",
  10: "در مسیر شغلی، مسئولیتی را بپذیرید که به شما اقتدار می‌دهد، نه فقط درآمد مالی.",
  11: "شبکه‌سازی کنید؛ پاسخ سوالات شما در دست افرادی است که هنوز آن‌ها را ملاقات نکرده‌اید.",
  12: "بخشی از درآمد یا زمان خود را صرف کارهای خیرخواهانه یا مدیتیشن کنید تا جریان برکت قطع نشود.",
}

// ── Bespoke copy tables (one line per sign) ────────────────────────────────

/** How the world meets you — the Lagna's first impression. */
const LAGNA_ESSENCE: Record<SignKey, string> = {
  aries: "پیشرو و بی‌واسطه وارد می‌شوی؛ جسارت شروع کردن را داری و بی‌معطلی دست به کار می‌زنی.",
  taurus: "محکم و صبور وارد می‌شوی؛ آرامشی آرام و قابل‌اتکا با خودت می‌آوری.",
  gemini: "چابک و کنجکاو وارد می‌شوی؛ بلدی حرف دل آدم‌ها را بیرون بکشی و وصلشان کنی.",
  cancer: "دل‌سوز و محافظ وارد می‌شوی؛ بلافاصله حس «خانه» و امنیت می‌دهی.",
  leo: "باشکوه و سخاوتمند وارد می‌شوی؛ جاذبه‌ی مرکز بودن را داری و دیگران دورت جمع می‌شوند.",
  virgo: "دقیق و آرام وارد می‌شوی؛ نظم و سلیقه‌ات در جزئیات دیده می‌شود.",
  libra: "متعادل و خوش‌سلیقه وارد می‌شوی؛ هنرت ساختن پل میان آدم‌ها و ایده‌هاست.",
  scorpio: "عمیق و مصمم وارد می‌شوی؛ از حرف‌های سطحی رد می‌شوی و چشم‌ها را به خودت خیره می‌کنی.",
  sagittarius: "خوش‌بین و گشاده‌رو وارد می‌شوی؛ بزرگ فکر کردن و آزاد بودن امضای توست.",
  capricorn: "منظم و جدی وارد می‌شوی؛ همان انرژی‌ای که باعث می‌شود آدم‌ها به قولت تکیه کنند.",
  aquarius: "آزاداندیش و بشردوست وارد می‌شوی؛ اول از همه دنیا را یک قدم بهتر می‌بینی.",
  pisces: "همدل و شهودی وارد می‌شوی؛ بی‌کلام می‌فهمی و فضا را نرم می‌کنی.",
}

/** What your Moon needs to feel safe — the emotional baseline. */
const MOON_NEED: Record<SignKey, string> = {
  aries: "وقتی استقلال و حق انتخاب داشته باشی، ذهنت آرام می‌شود.",
  taurus: "ثبات، روال تکراری و لحظه‌های ساده‌ی خوش‌بختی برایت کافی است.",
  gemini: "حرف زدن، تنوع، و اینکه کسی واقعاً حرفت را بفهمد.",
  cancer: "احساس تعلق داشتن؛ خانه، خانواده و آغوش‌های بلند.",
  leo: "دیده شدن و تعریف صمیمی؛ تو هم در عوض دیگران را گرم می‌کنی.",
  virgo: "تمیزی، نظم و اینکه کارهایت به سرانجام برسد.",
  libra: "آرامش رابطه؛ گفت‌وگوی متعادل و زیبایی دور و برت.",
  scorpio: "عمق و صداقت؛ رابطه‌های سطحی ذهنت را خسته می‌کنند.",
  sagittarius: "آزادی، سفر و اینکه همیشه هدفی در میان باشد.",
  capricorn: "هدفمندی و احترام؛ وقتی برنامه‌ات جلو می‌رود ساکت می‌شوی.",
  aquarius: "فضای ذهنی باز، ایده‌های نو و اینکه احساس کنی داری به یک آرمان بزرگتر کمک می‌کنی.",
  pisces: "خلوت، هنر، موسیقی و زمان‌هایی که هیچ‌کس از تو توقعی ندارد.",
}

/** Reasoning for planet placements */
const GRAHA_ANALYSIS: Record<string, string> = {
  sun: "اراده و اقتدار شما مستقیم از 'قلب' تغذیه می‌شود؛ شما برای رهبری و دیده شدن طراحی شده‌اید.",
  moon: "فیلتر ادراکی شما بر اساس امنیت عاطفی است؛ تا زمانی که از درون آرام نباشید، جهان بیرون ناامن است.",
  mars: "موتور محرک شما با چالش و رقابت روشن می‌شود؛ شما برای جنگیدن در راه اهدافتان مجهز هستید.",
  mercury: "سیستم عصبی و پردازش شما با سرعت بالا و تنوع کار می‌کند؛ کلمات سلاح و ابزار شما هستند.",
  jupiter: "نگرش شما به زندگی خوش‌بینانه و کلان است؛ شما برکت را از طریق دانش و توسعه جذب می‌کنید.",
  venus: "ارزش‌گذاری شما بر اساس زیبایی و هماهنگی است؛ لذت بردن از زندگی برای شما یک ضرورت است، نه تجمل.",
  saturn: "ساختار وجودی شما بر پایه صبر و مسئولیت است؛ شما پاداش‌های بزرگ را از مسیر زمان و تداوم می‌گیرید.",
  rahu: "تمایل به تجربه ناشناخته‌ها و شکستن مرزها؛ شما در پی دستیابی به چیزهایی هستید که دیگران از آن می‌ترسند.",
  ketu: "گرایش به رها کردن و معنویت؛ شما در این زندگی به دنبال معنایی فراتر از دنیای مادی هستید.",
}

/** Everyday life examples for planets */
const GRAHA_EXAMPLE: Record<string, string> = {
  sun: "در یک جلسه کاری، حتی اگر حرف نزنید، سنگینی حضور شما احساس می‌شود.",
  moon: "تغییرات فاز ماه یا حتی تغییر دکوراسیون خانه، مستقیماً روی اشتهای شما به زندگی تاثیر می‌گذارد.",
  mars: "وقتی تصمیمی می‌گیرید، می‌خواهید همین الان انجام شود و صبر کردن برایتان سخت‌ترین کار دنیاست.",
  mercury: "عاشق لیست نوشتن، تحلیل کردن و پیدا کردن کوتاه‌ترین مسیر برای انجام کارها هستید.",
  jupiter: "اطرافیان معمولاً برای مشورت یا پیدا کردن امید در لحظات سخت سراغ شما می‌آیند.",
  venus: "کیفیت لباسی که می‌پوشید یا عطری که می‌زنید، مستقیماً روی اعتماد به نفس شما تاثیر دارد.",
  saturn: "شاید دیر به نتیجه برسید، اما وقتی چیزی را می‌سازید (مثل یک رابطه یا تخصص)، برای همیشه ماندگار است.",
  rahu: "همیشه به تکنولوژی‌های جدید، فرهنگ‌های غریبه یا روش‌های نامتعارف برای کسب درآمد علاقه دارید.",
  ketu: "گاهی در اوج شلوغی، ناگهان احساس می‌کنید چقدر همه چیز فانی است و به درون خودتان پناه می‌برید.",
}

/** Planet-based decision advice */
const GRAHA_ACTION: Record<string, string> = {
  sun: "هرگز به خاطر تایید دیگران، از استانداردهای خود پایین نیایید؛ شما باید بدرخشید.",
  moon: "قبل از تصمیمات بزرگ، یک شب خوب بخوابید؛ احساسات شما در شب و روز متفاوت عمل می‌کنند.",
  mars: "انرژی اضافه خود را در ورزش یا پروژه‌های سنگین تخلیه کنید تا به پرخاشگری تبدیل نشود.",
  mercury: "ایده‌هایتان را بنویسید؛ ذهن شما سریع‌تر از آن است که همه چیز را در حافظه نگه دارد.",
  jupiter: "بخیل نباشید؛ هرچه دانش و خیرخواهی بیشتری خرج کنید، برکت بیشتری به سمت شما سرازیر می‌شود.",
  venus: "به جای انتخاب‌های صرفاً اقتصادی، به دنبال انتخاب‌هایی باشید که به شما حس 'خوبی' می‌دهند.",
  saturn: "از نظم و روتین نترسید؛ انضباط شخصی برای شما زندان نیست، بلکه سکوی پرتاب است.",
  rahu: "اشتیاق‌های خود را مدیریت کنید؛ مراقب باشید که 'خواستن' زیاد، شما را از داشته‌های فعلی‌تان غافل نکند.",
  ketu: "زمانی را برای سکوت و تنهایی در تقویم خود رزرو کنید؛ الهامات بزرگ شما در سکوت می‌آیند.",
}

/** What your Sun is building — the direction of the will. */
const SUN_PURPOSE: Record<SignKey, string> = {
  aries: "می‌خواهی برنده شوی و اولین نفری باشی که شروع می‌کند.",
  taurus: "می‌خواهی چیزی ماندگار و امن بسازی و لایق آسایش باشی.",
  gemini: "می‌خواهی بدانی، بگویی و آدم‌ها را به هم وصل کنی.",
  cancer: "می‌خواهی پناهگاهی بسازی که دیگران در آن رشد کنند.",
  leo: "می‌خواهی بدرخشی و اثری ماندگار از خودت به جا بگذاری.",
  virgo: "می‌خواهی کار را درست انجام دهی و واقعاً مفید باشی.",
  libra: "می‌خواهی عدالت و زیبایی را کنار هم نگه داری.",
  scorpio: "می‌خواهی عمیق شوی و از دل سختی‌ها قوی‌تر بیرون بیایی.",
  sagittarius: "می‌خواهی آزاد باشی و معنای بزرگ‌تری برای زندگیت پیدا کنی.",
  capricorn: "می‌خواهی بسازی، بالا بروی و مسئولیتت را ادا کنی.",
  aquarius: "می‌خواهی دنیا را کمی آزادتر و انسانی‌تر کنی.",
  pisces: "می‌خواهی احساس کنی به چیزی بزرگ‌تر وصلی.",
}

/** Plain-language meaning of each dignity (placement condition). */
export const DIGNITY_PLAIN: Record<string, string> = {
  exalted: "در شرف است؛ یعنی این توانایی در تو ذاتی و پرقدرت است و خودش کار می‌کند.",
  own: "در خانه‌ی خودش نشسته؛ مستقل، مطمئن و همیشه در دسترس.",
  friendly: "در فضایی دوستانه است؛ هماهنگ و بی‌دردسر کار می‌کند.",
  neutral: "خنثی است؛ کیفیتش با موقعیت‌ها عوض می‌شود.",
  enemy: "در زمینی نامساعد است؛ کمی اصطکاک دارد و با حوصله بهتر جواب می‌دهد.",
  debilitated: "در هبوط است؛ این ظرفیت مثل عضله‌ای است که باید تمرینش کنی — اگر تمرین کنی، قوی‌ترش می‌کنی.",
}

const DIGNITY_BADGE: Record<string, string> = {
  exalted: "شرف",
  own: "حکمرانی",
  friendly: "دوستانه",
  neutral: "خنثی",
  enemy: "خصمانه",
  debilitated: "هبوط",
}

const ELEMENT_LINE: Record<Rashi["element"], string> = {
  fire: "عاطفه‌ها سریع و روشن آشکار می‌شوند",
  earth: "عمل و نتیجه حرف اول را می‌زند",
  air: "فکر و گفت‌وگو اولویت دارد",
  water: "درک احساسی تصمیم‌ها را جلو می‌برد",
}

const MODALITY_LINE: Record<Rashi["modality"], string> = {
  cardinal: "شروع کردن را خوب بلد است",
  fixed: "نگه می‌دارد و پایدار می‌ماند",
  mutable: "با شرایط سازگار می‌شود",
}

const STRENGTH_LABEL: Record<YogaDosh["strength"], string> = {
  strong: "قوی",
  moderate: "متوسط",
  weak: "ضعیف",
}

// ── Concept blurbs (deep idea → simple words) ──────────────────────────────

const CONCEPTS = {
  identity:
    "هر چارت با یک نقطه شروع می‌شود: جایی که در لحظه‌ی تولد، برجی از آسمان از افق بالا آمده. به آن «لگنا» یا صعود می‌گویند. اگر چارت نقشه‌ی خانه‌ای باشد که تو در آن به دنیا آمده‌ای، لگنا «درب ورودی» همان خانه است: اولین برداشتی که دیگران از تو دارند و روش پیش‌فرضت برای رو‌به‌رو شدن با زندگی.",
  mind:
    "ماه سریع‌ترین جسم آسمان است و در ودایی نماینده‌ی ذهن و احساس به‌شمار می‌رود: همان بخشی از تو که در روزمره تصمیم می‌گیرد چه چیزی آرامت می‌کند و چه چیزی بی‌قرارت. وقتی می‌گویی «امروز حالم خوب است»، داری از همین ماه حرف می‌زنی.",
  core:
    "خورشید هسته‌ی چارت است: اراده، هویت و آن چیزی که می‌خواهی در زندگی دیده شوی. اگر ماه «احساس تو» است، خورشید «هدف تو» است — جایی که انرژی‌ات را جمع می‌کنی تا خودت را بسازی.",
  houses:
    "چارت به دوازده «خانه» تقسیم می‌شود و هر خانه یک حوزه از زندگی است: پول، رابطه، کار، خانواده، سلامت… سیارات مثل مهمان‌اند؛ هر جا بنشینند، همان خانه پررونق می‌شود. اینجا می‌بینی کدام خانه‌های تو شلوغ و کدام آرام‌اند و هرکدام چه می‌گویند.",
  grahas:
    "در ودایی نُه «سیاره» داریم: هفت سیاره‌ی دیدنی به‌علاوه‌ی دو گره‌ی ماه؛ راهو و کیتو. هرکدام نماینده‌ی یک نیروی درونی‌اند — خورشید اراده، ماه احساس، مریخ عمل، زحل صبر… این فصل می‌گوید هرکدام در چارت تو کجا ایستاده‌اند و آن یعنی چه.",
  patterns:
    "هر وقت چند سیاره در ترکیب خاصی کنار هم قرار بگیرند، «یوگا» (پل قوت) یا «دوشا» (نقطه‌ی چالش) ساخته می‌شود — مثل ترکیب مواد که اگر درست کنار هم باشند، طعمشان قوی می‌شود. این‌ها از خودِ چارتت استخراج شده‌اند، نه از فهرست‌های آماده.",
  time:
    "زندگی در ودایی خطی نیست؛ تقویم دارد. دوره‌هایی به نام «داشا» که هرکدام را یک سیاره اداره می‌کند — از شش سال تا بیست سال. سیاره‌ی حاکمِ دوره، رنگ و تمِ همان سال‌هاست.",
  guide:
    "چارت وقتی به درد می‌خورد که به کار روزمره برسد. اینجا سه تکیه‌گاه عملی از دل همان محاسبه بیرون آمده، به‌علاوه‌ی نمادهای خوش‌یمنی که با لگنای تو ساخته شده‌اند.",
}

const GLOSSARY: { term: string; body: string }[] = [
  {
    term: "لگنا (صعود)",
    body: "نقطه‌ی طلوعی که در لحظه‌ی تولد از افق بالا آمده؛ ورودی چارت و «چهره‌ی بیرونی» تو در نگاه دیگران. اگر ساعت تولد را ندانیم، ماه به‌جای لگنا نشان داده می‌شود (چاندرا لگنا).",
  },
  {
    term: "نکشتر",
    body: "بیست‌وهفت بخشِ ۱۳ درجه‌ای آسمان، مثل فصل‌های کتاب ماه. جای دقیق ماه در نکشتر، سبک ذهنی و روش آرام شدن تو را می‌گوید.",
  },
  {
    term: "داشا",
    body: "تقویم کلان زندگی: دوره‌های چندساله‌ای که هرکدام را یک سیاره اداره می‌کند. سیاره‌ی حاکمِ دوره، موضوع و درس همان سال‌هاست.",
  },
  {
    term: "یوگا و دوشا",
    body: "ترکیب‌های خاص چند سیاره. یوگا پل قوت است (مثلاً ثروت، شهرت یا معنویت) و دوشا نقطه‌ی چالش. هر دو از خودِ چارتت استخراج می‌شوند و عدد کنارشان قدرت همان ترکیب است.",
  },
  {
    term: "اشتاکاورگا",
    body: "امتیازدهی هر خانه از چارت؛ میانگین هر خانه ۲۸ است و هرچه بالاتر، آن حوزه پربرکت‌تر. مجموع هر چارت همیشه ۳۳۷ است.",
  },
  {
    term: "ایانامسا (سایدیرال)",
    body: "تقویم نجومی که موقعیت سیارات را نسبت به ستاره‌های ثابت تنظیم می‌کند. نجوم از ایانامسای لاهیری استفاده می‌کند تا محاسبه‌ها با منابع کلاسیک ودایی هم‌خوان بماند.",
  },
]

// ── Builder helpers ────────────────────────────────────────────────────────

const yearFa = (iso: string) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(new Date(iso))

function medallionOf(
  key: Medallion["key"],
  label: string,
  hint: string,
  sign: SignKey,
  keyword: string,
  note: string
): Medallion {
  const rashi = getRashi(sign)
  return {
    key,
    label,
    hint,
    signKey: sign,
    signFa: rashi.fa,
    symbol: rashi.symbol,
    accent: rashi.accent,
    keyword,
    note,
  }
}

/** Element mix across the nine grahas — one flat bar set for the page. */
function elementBars(chart: NatalChart): ElementBar[] {
  const counts: Record<Rashi["element"], number> = { fire: 0, earth: 0, air: 0, water: 0 }
  for (const p of chart.placements) counts[getRashi(p.sign).element]++
  return (["fire", "earth", "air", "water"] as const).map((key) => ({
    key,
    fa: ELEMENT_LABELS[key].fa,
    count: counts[key],
    percent: Math.round((counts[key] / chart.placements.length) * 100),
  }))
}

/** All 12 houses: occupancy copy + sarvashtakavarga tone for the bars. */
function houseItems(chart: NatalChart): HouseItem[] {
  const signs = houseSigns(chart)
  return Array.from({ length: 12 }, (_, i) => {
    const house = i + 1
    const rashi = getRashi(signs[i])
    const bhava = getBhava(house)
    const here = chart.placements.filter((p) => p.house === house)
    const bindu = chart.ashtakavarga[i] ?? 0
    const planets = here.map((p) => {
      const g = getGraha(p.graha)
      return { fa: g.fa, glyph: g.glyph, accent: g.accent }
    })
    const line = here.length
      ? `${bhava.fa} — ${bhava.keyword}. ${planets.map((p) => p.fa).join("، ")} اینجا ایستاده‌اند؛ این حوزه در زندگی‌ات پرکارتر از بقیه است.`
      : `${bhava.fa} — ${bhava.keyword}. خالی است و حکمرانش ${rashi.lordFa} است؛ سبک او راهنمای تو در این حوزه است.`
    return {
      house,
      fa: bhava.fa,
      keyword: bhava.keyword,
      matters: bhava.matters,
      signFa: rashi.fa,
      signSymbol: rashi.symbol,
      accent: rashi.accent,
      lordFa: rashi.lordFa,
      planets,
      occupied: here.length > 0,
      line,
      bindu,
      tone: bindu >= 30 ? "green" : bindu >= 25 ? "amber" : "red",
    }
  })
}

const NODE_EXTRA: Partial<Record<GrahaKey, string>> = {
  rahu: " راهو، سایه‌ی شمالی، هر جا بنشیند کشش تجربه‌ی تازه را در همان حوزه می‌آورد.",
  ketu: " کیتو، سایه‌ی جنوبی، هر جا بنشیند رها شدن و بی‌نیازی را در همان حوزه آموزش می‌دهد.",
}

/** One plain-language voice per graha: what it is + where it sits + condition. */
function grahaVoices(chart: NatalChart): GrahaVoice[] {
  return chart.placements.map((p) => {
    const g = getGraha(p.graha)
    const bhava = getBhava(p.house)
    const rashi = getRashi(p.sign)
    const tone: GrahaVoice["badgeTone"] =
      p.dignity === "exalted" || p.dignity === "own" || p.dignity === "friendly"
        ? "good"
        : p.dignity === "neutral"
          ? "soft"
          : "hard"
    const body =
      `«${g.fa}» نماینده‌ی «${g.keyword}» است. نشستن در خانه‌ی ${faNum(p.house)} (${bhava.fa}) یعنی حوزه‌ی «${bhava.keyword}» — ${bhava.matters.join("، ")} — با همین انرژی می‌چرخد. ` +
      DIGNITY_PLAIN[p.dignity] +
      (NODE_EXTRA[p.graha] ?? "") +
      (p.retrograde ? " وارونه است؛ انرژی‌اش به درون است و تجربه‌اش تأملی‌تر شکل می‌گیرد." : "")
    return {
      key: p.graha,
      fa: g.fa,
      glyph: g.glyph,
      accent: g.accent,
      signFa: rashi.fa,
      house: p.house,
      houseFa: bhava.fa,
      badge: DIGNITY_BADGE[p.dignity] ?? "",
      badgeTone: tone,
      body,
      analysis: GRAHA_ANALYSIS[p.graha],
      example: GRAHA_EXAMPLE[p.graha],
      action: GRAHA_ACTION[p.graha],
    }
  })
}

function toPattern(y: YogaDosh): PatternItem {
  return {
    name: y.name,
    fa: y.fa,
    kind: y.kind,
    strengthLabel: STRENGTH_LABEL[y.strength],
    score: y.score,
    description: y.description,
  }
}

/** Strongest three by computed score (stable for ties), never dropping data. */
function topPatterns(items: YogaDosh[]): PatternItem[] {
  return [...items]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3)
    .map(toPattern)
}

function patternsNote(yogas: PatternItem[], doshas: PatternItem[]): string {
  if (!yogas.length && !doshas.length)
    return "در چارت تو ترکیب پررنگی پیدا نشد — یعنی مسیرت بیشتر از همه با خانه‌ها و سیارات مستقیم ساخته می‌شود؛ خودش یعنی انعطاف و آزادی عمل."
  if (!yogas.length)
    return "قوت‌های اصلی‌ات بیشتر از مسیر خانه‌ها و سیارات مستقیم می‌آیند؛ آن‌ها را در فصل‌های قبل بخوان."
  return `این فهرست از خودِ چارتت آمده؛ هرچه عدد کنار هر مورد بیشتر باشد (${doshas.length ? "قوت و چالش" : "قوت‌ها"}، ${faNum(2)} تا ${faNum(100)}), در زندگی روزمره پررنگ‌تر دیده می‌شود.`
}

/** Vimshottari mahadashas with Persian year labels; active period flagged. */
function dashaTimeline(chart: NatalChart): TimelineItem[] {
  const now = Date.now()
  return chart.dashas.map((d) => {
    const g = getGraha(d.graha)
    return {
      graha: d.graha,
      fa: g.fa,
      glyph: g.glyph,
      accent: g.accent,
      fromLabel: yearFa(d.from),
      toLabel: yearFa(d.to),
      level: d.level,
      active: now >= Date.parse(d.from) && now < Date.parse(d.to),
    }
  })
}

/** Three deterministic, chart-derived practical anchors for everyday life. */
function guideTips(chart: NatalChart): string[] {
  const lagnaLord = getRashi(chart.lagna).lord
  const lordP = chart.placements.find((p) => p.graha === lagnaLord)!
  const lordBhava = getBhava(lordP.house)
  const moonP = chart.placements[1]
  const moonBhava = getBhava(moonP.house)
  const tip1 = `حکمرانِ ورودی تو ${getGraha(lagnaLord).fa} است و در خانه‌ی ${faNum(lordP.house)} نشسته؛ یعنی نقطه‌ی قوتت در «${lordBhava.keyword}» است (${lordBhava.matters.join("، ")}). هر وقت سراغ این حوزه بروی، کل چارتت با تو همراه می‌شود.`
  const tip2 = `آرامش درونی‌ات به خانه‌ی ${faNum(moonP.house)} گره خورده؛ وقتی حوزه‌ی «${moonBhava.keyword}» را مرتب کنی، ذهنت هم ساکت می‌شود.`
  const strongest = [...(chart.balas ?? [])].sort((a, b) => b.percent - a.percent)[0]
  const tip3 = strongest
    ? `${getGraha(strongest.graha).fa} قوی‌ترین سیاره‌ی چارتت است (${faNum(Math.round(strongest.percent))}٪)؛ در روزهای سخت سراغ «${getGraha(strongest.graha).keyword}» برو — همان کلیدی است که بیشتر از همه دستت است.`
    : `${getGraha(lagnaLord).fa} پررنگ‌ترین نیروی چارت توست؛ روزهای سخت سراغ «${getGraha(lagnaLord).keyword}» برو.`
  return [tip1, tip2, tip3]
}

// ── Document builder ───────────────────────────────────────────────────────

export function buildReading(chart: NatalChart): ReadingDoc {
  const name = chart.profile.name?.trim() || "دوست عزیز"
  const lagna = getRashi(chart.lagna)
  const sunP = chart.placements[0]
  const moonP = chart.placements[1]
  const sunRashi = getRashi(sunP.sign)
  const moonRashi = getRashi(moonP.sign)
  const sunBhava = getBhava(sunP.house)
  const moonBhava = getBhava(moonP.house)

  const hero = {
    lede: `آسمانِ لحظه‌ی تولد ${name} سه دروازه دارد: لگنای ${lagna.fa} که چهره‌ی بیرونی و سبکِ ورودت به دنیاست، ماهِ ${moonRashi.fa} که احساس و آرامش درونی‌ات را می‌چرخاند، و خورشیدِ ${sunRashi.fa} که هسته‌ی اراده‌ی توست. در این صفحه هر سه را قدم‌به‌قدم، بدون اصطلاحات فنی و به زبان خودمان می‌خوانیم.`,
    medallions: [
      medallionOf("lagna", "لگنا", "چهره‌ی بیرونی", chart.lagna, lagna.keyword, LAGNA_ESSENCE[chart.lagna]),
      medallionOf("moon", "ماه", "جهان درون", moonP.sign, moonRashi.keyword, MOON_NEED[moonP.sign]),
      medallionOf("sun", "خورشید", "هسته‌ی اراده", sunP.sign, sunRashi.keyword, SUN_PURPOSE[sunP.sign]),
    ],
  }

  // ── 1 · identity (lagna) ──
  const lagnaLord = lagna.lord
  const lordP = chart.placements.find((p) => p.graha === lagnaLord)!
  const lordBhava = getBhava(lordP.house)
  const karaka = chart.karakas?.find((k) => k.key === "atmakaraka")
  const identity = {
    concept: CONCEPTS.identity,
    paragraphs: [
      `با برج ${lagna.fa} صعود می‌کنی؛ ${LAGNA_ESSENCE[chart.lagna]}`,
      `عنصر این برج ${ELEMENT_LABELS[lagna.element].fa} است؛ یعنی ${ELEMENT_LINE[lagna.element]}، و سبکش «${MODALITY_LABELS[lagna.modality].fa}» است: ${MODALITY_LINE[lagna.modality]}. حکمرانش ${lagna.lordFa} — هر جا در زندگی‌ات پای ${lagna.lordFa} وسط بیاید، این برج راحت‌تر نفس می‌کشد.`,
      `سه ویژگی‌ای که دیگران بیشتر از همه در تو می‌بینند: ${lagna.traits.join("، ")}. و مهم‌تر از همه: حکمران ${lagna.lordFa} در خانه‌ی ${faNum(lordP.house)} تو نشسته، یعنی «${lordBhava.keyword}» — ${lordBhava.matters.join("، ")} — دری است که با آن وارد دنیا می‌شوی.`,
    ],
    quote: `«${lagna.keyword}» — این واژه، کلید ورودی تو به دنیاست.`,
    traits: lagna.traits,
    elements: elementBars(chart),
    karaka: karaka
      ? `${getGraha(karaka.graha).fa} کاراکای روح توست؛ آنچه در این زندگی بیش از همه دنبال می‌کنی: ${karaka.signifies}.`
      : null,
    analysis: HOUSE_ANALYSIS[lordP.house],
    example: HOUSE_EXAMPLE[lordP.house],
    action: HOUSE_ACTION[lordP.house],
  }

  // ── 2 · mind (moon) ──
  const nak = NAKSHATRAS.find((n) => n.fa === moonP.nakshatra)
  const mindParagraphs = [
    `ماهت در برج ${moonRashi.fa} نشسته؛ ${MOON_NEED[moonP.sign]}`,
    `و در خانه‌ی ${faNum(moonP.house)} (${moonBhava.fa}) ایستاده، یعنی آرامش درونی‌ات با «${moonBhava.keyword}» گره خورده: ${moonBhava.matters.join("، ")}.`,
  ]
  if (nak) {
    mindParagraphs.push(
      `نکشتر ماه تو «${nak.fa}» است — نمادش ${nak.symbolFa} و کلیدش «${nak.keyword}» و حکمرانش ${getGraha(nak.lord).fa}؛ به زبان ساده، سایه‌ی ذهنی تو این فصل را از کتاب ماه برداشته است.`
    )
  }
  mindParagraphs.push(DIGNITY_PLAIN[moonP.dignity])
  const mind = {
    concept: CONCEPTS.mind,
    paragraphs: mindParagraphs,
    quote: MOON_NEED[moonP.sign],
    nakName: nak?.fa ?? moonP.nakshatra,
    nakLord: getGraha(moonP.nakshatraLord).fa,
    nakSymbol: nak?.symbolFa ?? "",
    nakKeyword: nak?.keyword ?? "",
    nakPada: moonP.pada,
    analysis: HOUSE_ANALYSIS[moonP.house],
    example: HOUSE_EXAMPLE[moonP.house],
    action: HOUSE_ACTION[moonP.house],
  }

  // ── 3 · core (sun) ──
  const core = {
    concept: CONCEPTS.core,
    paragraphs: [
      `خورشیدت در برج ${sunRashi.fa} است؛ ${SUN_PURPOSE[sunP.sign]}`,
      `و در خانه‌ی ${faNum(sunP.house)} (${sunBhava.fa}) می‌نشیند؛ یعنی وقتی انرژی‌ات را روی «${sunBhava.keyword}» بگذاری — ${sunBhava.matters.join("، ")} — بیشتر از همه دیده می‌شوی.`,
      DIGNITY_PLAIN[sunP.dignity],
    ],
    quote: SUN_PURPOSE[sunP.sign],
    analysis: HOUSE_ANALYSIS[sunP.house],
    example: HOUSE_EXAMPLE[sunP.house],
    action: HOUSE_ACTION[sunP.house],
  }

  // ── 4 · houses ──
  const items = houseItems(chart)
  const occupiedCount = items.filter((i) => i.occupied).length
  const strongestHouse = [...items].sort((a, b) => b.bindu - a.bindu)[0]
  const houses = {
    concept: CONCEPTS.houses,
    items,
    summary: `${faNum(occupiedCount)} خانه از دوازده خانه‌ی تو سیاره دارند و بقیه با حکمرانشان کار می‌کنند. پربرکت‌ترین خانه، خانه‌ی ${faNum(strongestHouse.house)} (${strongestHouse.fa}) است با ${faNum(strongestHouse.bindu)} بندو.`,
    avNote:
      "اشتاکاورگا یعنی «امتیاز» هر خانه؛ میانگین ۲۸ و هرچه بالاتر، آن حوزه پربرکت‌تر. سبز از ۳۰ به بالا، زرد ۲۵ تا ۲۹ و قرمز زیر ۲۵.",
  }

  // ── 5 · graha voices ──
  const grahas = { concept: CONCEPTS.grahas, voices: grahaVoices(chart) }

  // ── 6 · patterns ──
  const yogas = topPatterns(chart.yogas)
  const doshas = topPatterns(chart.doshas)
  const patterns = {
    concept: CONCEPTS.patterns,
    yogas,
    doshas,
    note: patternsNote(yogas, doshas),
  }

  // ── 7 · time (dasha) ──
  const dasha = currentDashaSummary(chart)
  const time = {
    concept: CONCEPTS.time,
    explain:
      "هر دوره‌ی ویمشوتری بین شش تا بیست سال طول می‌کشد و مثل فصلی از کتاب است: سیاره‌ی حاکم، موضوع و درس همان سال‌ها را تعیین می‌کند. دوره‌ی فعلی‌ات را بخوان و ببین این فصل دارد چه می‌گوید.",
    period: dasha.period,
    description: dasha.description,
    timeline: dashaTimeline(chart),
  }

  // ── 8 · practical guide ──
  const guide = {
    concept: CONCEPTS.guide,
    tips: guideTips(chart),
    facts: [
      { label: "عدد خوش‌شانسی", value: faNum(chart.luckyNumber) },
      { label: "رنگ", value: chart.luckyColor },
      { label: "سنگ", value: chart.luckyStone },
      { label: "مسیر شغلی", value: chart.profession },
    ],
    mantra: chart.mantra,
    blessing: `هر چقدر این نقشه را بیشتر بخوانی، بهتر می‌توانی از آن استفاده کنی — و ${name}، آسمانت همیشه باز است.`,
  }

  const executive = {
    coreStrength: `نقطه‌ی قوت کلیدی‌ات در حوزه‌ی «${lordBhava.keyword}» است؛ هر وقت در کار یا درآمد گره‌ای افتاد، تمرکزت را روی این حوزه بگذار (${lordBhava.matters.join("، ")}).`,
    mentalPeace: `آرامش درونی‌ات به «${moonBhava.keyword}» گره خورده؛ وقتی این بخش از زندگی‌ات منظم باشد، ذهنت کاملاً ساکت و متمرکز می‌شود.`,
    weeklyAction: `قطب‌نمای امروز: ${chart.mantra} — با این انرژی جلو برو و از چالش‌ها به عنوان سکوی پرتاب استفاده کن.`,
  }

  const intelligence = {
    status: yogas.length > 0 ? "صعودی مشروط / رو به رشد" : "پایدار و متوازن",
    bias: `گرایش اصلی بر پایه لگنای ${lagna.fa} و حاکم آن (${lordBhava.fa}) به سمت سازندگی و توسعه است.`,
    trend: `حرکت در دوره‌ی فعلی (${dasha.period}) با تأکید بر حوزه‌ی ${dasha.description.slice(0, 40)}... جریان دارد.`,
    conflicts: [
      {
        title: "تنش میان عواطف درونی و اراده‌ی بیرونی",
        desc: `ماه در برج ${moonRashi.fa} (جهان درون) و خورشید در برج ${sunRashi.fa} (هسته‌ی اراده) هر کدام به دنبال اولویت‌های متفاوتی هستند.`,
        resolution: "با آگاهی از این دوگانگی، تصمیمات عملی با تکیه بر نظم خانه‌ی حاکم هماهنگ می‌شوند.",
      },
      {
        title: "چالش‌های بالقوه در برابر یوگاهای قدرتمند",
        desc: yogas.length > 0 ? `وجود یوگاهای برجسته (${yogas[0]?.fa}) در کنار برخی دوشاها نیازمند مدیریت هوشمندانه‌ی زمان است.` : "مسیر چارت به سمت تعادل و رشد تدریجی هدایت می‌شود.",
        resolution: "تمرکز روی نقاط قوت اشتاکاورگا (خانه‌های بالای ۳۰ بندو) برای خنثی‌سازی اصطکاک‌ها.",
      },
    ],
    storySequence: [
      { step: "01", label: "بنیان و ریشه", detail: `آغاز با لگنای ${lagna.fa} و سرشت ذاتی شما در برخورد با مسائل.` },
      { step: "02", label: "موتور محرک", detail: `نقش خورشید و ماه در هدایت احساسات (${moonRashi.fa}) و انگیزه‌ها (${sunRashi.fa}).` },
      { step: "03", label: "برخورد با چالش", detail: "شناخت اصطکاک‌ها و دوشاها به‌عنوان نقاط یادگیری و رشد." },
      { step: "04", label: "ظهور پتانسیل‌ها", detail: `فعال شدن یوگاهای سازنده و پربرکت‌ترین خانه (${strongestHouse.fa} با ${faNum(strongestHouse.bindu)} بندو).` },
      { step: "05", label: "وضعیت کنونی", detail: `جریان انرژی در دوره‌ی فعلی (${dasha.period}) و تمرکز بر هدایت عملی.` },
    ],
    invalidation: `این خوانش بر پایه‌ی جای‌گیری فعلی ${lordBhava.fa} در خانه‌ی ${faNum(lordP.house)} و بندوی واقعی خانه‌ها نوشته شده است؛ اگر زمان تولد یا داده‌های ورودی اصلاح شود، همین اعداد تغییر می‌کنند و باید دوباره محاسبه شوند.`,
    watchpoints: [
      `موقعیت و تعادل حاکم لگنا (${lordBhava.fa})`,
      `عملکرد خانه‌ی ${faNum(strongestHouse.house)} (${strongestHouse.fa}) با ${faNum(strongestHouse.bindu)} بندو`,
      `درس‌ها و هدایت‌های دوره‌ی فعلی داشا (${dasha.period})`,
      `مدیریت انرژی ذهنی ماه در برج ${moonRashi.fa}`,
    ],
  }

  return {
    hero,
    executive,
    intelligence,
    identity,
    mind,
    core,
    houses,
    grahas,
    patterns,
    time,
    guide,
    glossary: GLOSSARY,
  }
}
