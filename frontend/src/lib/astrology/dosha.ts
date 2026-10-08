import type { YogaDosh } from "./types"

/**
 * Classical Yogas — combinations that classically indicate a strength.
 * These are listed for orientation only; a true reading depends on
 * lordship, dignity and house placement.
 */
export const YOGAS: YogaDosh[] = [
  {
    name: "Gaja Kesari Yoga",
    fa: "یوگای گاجا کساری",
    kind: "yoga",
    strength: "strong",
    description:
      "مشتری در برج هشتم از ماه (یا در خانه‌ی ششم/دوازدهم از ماه با نسبت‌های هم‌ارز). نشانه‌ی برجسته‌ی هوش، رهبری و اعتبار اجتماعی است.",
  },
  {
    name: "Chandra Mangala Yoga",
    fa: "یوگای چاندرا منگال",
    kind: "yoga",
    strength: "moderate",
    description:
      "ماه و مریخ در بیشتر نشانه‌ها با هم در یک برج یا در برج‌های مجاور. توان مالی و قدرت تصمیم‌گیری را بالا می‌برد.",
  },
  {
    name: "Budha Aditya Yoga",
    fa: "یوگای بودها آدیتیا",
    kind: "yoga",
    strength: "moderate",
    description:
      "خورشید و عطارد در یک برج (و عطارد در برج‌های ۱، ۲، ۳، ۹، ۱۰ یا ۱۱). هوش، ارتباط و جایگاه اجتماعی را تقویت می‌کند.",
  },
  {
    name: "Raja Yoga",
    fa: "یوگای راجا",
    kind: "yoga",
    strength: "strong",
    description:
      "پیوند سیارات یک خانه با سیارات خانه‌ی نهم — پایه‌ی اصلی یوگاهای شاهانه در متن کلاسیک.",
  },
  {
    name: "Dhana Yoga",
    fa: "یوگای دانا",
    kind: "yoga",
    strength: "moderate",
    description:
      "پیوند خانه‌های ششم، هشتم و دوازدهم با سیارات خانه‌ی دوم یا یازدهم. نشانه‌ی توانایی جذب ثروت و منابع.",
  },
  {
    name: "Pancha Mahapurusha",
    fa: "پنچا مهابوروشا",
    kind: "yoga",
    strength: "strong",
    description:
      "پنج سیاره‌ی بزرگ (خورشید، ماه، مریخ، مشتری، زحل) در برج فرمانروای خود و در خانه‌های ۱، ۴، ۷، ۱۰ — ستون شخصیت در سنت ودایی.",
  },
  {
    name: "Kemadruma Yoga",
    fa: "یوگای کَمَادروما",
    kind: "dosha",
    strength: "weak",
    description:
      "ماه تنها با سیارات بدون حمایت در زاویه قرار می‌گیرد. در متن کلاسیک نشانه‌ی تنهایی و فشار روانی است؛ در عمل نیاز به مراقبت و پشتیبانی دارد.",
  },
  {
    name: "Neecha Yoga",
    fa: "یوگای نیچا",
    kind: "yoga",
    strength: "moderate",
    description:
      "سیاره در برج تضعیف‌شده — نقطه‌ی شروع رشد از پایین. در سنت جیوتیش پایان قیمت خود را نیچا می‌دانند.",
  },
]

/**
 * Classical Doshas — flagged as needing attention. Not "bad", simply
 * areas that classically warrant extra care.
 */
export const DOSHAS: YogaDosh[] = [
  {
    name: "Manglik Dosha",
    fa: "دوشای کجوری (مانگلیک)",
    kind: "dosha",
    strength: "moderate",
    description:
      "قرار گرفتن مریخ در خانه‌های ۱، ۲، ۴، ۷، ۸ یا ۱۲ نسبت به طالع و ماه. به سنت ایرانی و هندی «کجوری» گفته می‌شود و بیشتر بر روابط و ازدواج اثر گرفته می‌شود.",
  },
  {
    name: "Kaal Sarp Dosha",
    fa: "دوشای کال‌سارپ",
    kind: "dosha",
    strength: "weak",
    description:
      "قرار گرفتن همه‌ی سیارات در یک نیمه از چارت نسبت به گره‌های ماه. الگویی است که کلاسیک توصیه‌های بیشتری برای آن می‌نویسد.",
  },
  {
    name: "Pitru Dosha",
    fa: "دوشای پیتُرو (اجداد)",
    kind: "dosha",
    strength: "weak",
    description:
      "پیوند مشتری و زحل با خانه‌های چهارم، نهم یا دوازدهم. به بررسی رابطه با نیاکان و ریشه‌های خانوادگی مربوط است.",
  },
  {
    name: "Shrapit Yoga",
    fa: "یوگای شرپیت",
    kind: "dosha",
    strength: "moderate",
    description:
      "پنج سیاره‌ی جداکننده میان سیارات کلاسیک در کنار هم. توصیه می‌شود این الگو را با حرکت زیاد و خدمت به دیگران متعادل کرد.",
  },
]
