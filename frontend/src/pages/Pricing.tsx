import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Star, Crown, Sparkles } from "lucide-react"

const plans = [
  {
    name: "رایگان",
    price: "0",
    period: "ماندگار",
    description: "برای شروع طالع‌بینی",
    icon: Star,
    features: [
      "۱ محاسبه چارت در روز",
      "چارت دشانه (D1)",
      "مشاهده سیارات و خانه‌ها",
      "اطلاعات ناکشاترای قمر",
      "پشتیبانی از تقویم شمسی",
    ],
    cta: "شروع رایگان",
    popular: false,
  },
  {
    name: "حرفه‌ای",
    price: "99",
    period: "ماهانه",
    description: "برای طالع‌بینی عمیق",
    icon: Crown,
    features: [
      "محاسبه چارت نامحدود",
      "چارت دشانه و ناوامشا (D1, D9)",
      "تحلیل داشا و آنتارداشا",
      "مقایسه سیناستری",
      "ترجمه روزانه نجومی",
      "ذخیره پروفایل‌های نامحدود",
      "پشتیبانی اولویت",
    ],
    cta: "شروع نسخه حرفه‌ای",
    popular: true,
  },
  {
    name: "پرمیوم",
    price: "299",
    period: "ماهانه",
    description: "برای متخصصان نجوم",
    icon: Sparkles,
    features: [
      "همه امکانات حرفه‌ای",
      "تحلیل ترانزیت و پیش‌بینی",
      "سازگاری زوجین کامل",
      "گزارش‌های PDF قابل چاپ",
      "چارت‌های سفارشی (D2-D12)",
      "مشاوره تلفنی ماهانه",
      "اولویت در جدول زمانی",
    ],
    cta: "ارتباط با متخصص",
    popular: false,
  },
]

export default function Pricing() {
  return (
    <div className=" bg-background py-16 px-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 bg-gold-500/15 text-gold-200 ring-1 ring-gold-400/30">
            بسته‌های اشتراکی
          </Badge>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl vedic-text-gradient mb-4">
            انتخاب بسته مناسب
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            از رایگان شروع کنید و با ارتقا تجربه کامل طالع‌بینی را کشف کنید
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative vedic-card ${
                plan.popular ? "ring-2 ring-gold-500 shadow-lg shadow-gold-500/10 scale-[1.02]" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gold-500 hover:bg-gold-600 text-white px-4 py-1">
                    محبوب‌ترین
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pt-8">
                <div className="mx-auto w-14 h-14 rounded-full bg-brand-500/15 ring-1 ring-brand-400/25 flex items-center justify-center mb-4">
                  <plan.icon className="h-7 w-7 text-brand-600" />
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="flex items-baseline justify-center gap-1 mb-6">
                  <span className="text-4xl font-bold text-brand-600">{plan.price}</span>
                  <span className="text-muted-foreground">تومان / {plan.period}</span>
                </div>
                <ul className="space-y-3 text-right">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className={`w-full ${
                    plan.popular
                      ? "bg-gold-500 hover:bg-gold-600 text-white"
                      : "bg-brand-600 hover:bg-brand-700 text-white"
                  }`}
                  size="lg"
                >
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-24 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8 vedic-text-gradient">سوالات متداول</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              { q: "چه تفاوتی بین بسته‌ها وجود دارد؟", a: "بسته رایگان محدودیت محاسبه روزانه دارد. حرفه‌ای و پرمیوم دسترسی نامحدود و ابزارهای پیشرفته‌تر را فراهم می‌کنند." },
              { q: "آیا می‌توانم در هر زمان ارتقا دهم؟", a: "بله، هر وقت خواستید از تنظیمات حساب خود بسته خود را ارتقا یا تغییر دهید." },
              { q: "پشتیبانی چگونه ارائه می‌شود؟", a: "پشتیبانی از طریق ایمیل، چت زنده و تماس تلفنی در بسته‌های حرفه‌ای و پرمیوم در دسترس است." },
              { q: "پرداخت چگونه انجام می‌شود?", a: "امکان پرداخت با کارت بانکی، کیف پول الکترونیکی و درگاه‌های معتبر وجود دارد." },
            ].map((faq) => (
              <Card key={faq.q} className="vedic-card text-right p-6">
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}