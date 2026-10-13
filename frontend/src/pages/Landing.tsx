import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, ChartPie, Star, Check, Sparkles, Moon, Sun } from "lucide-react"

const features = [
  { title: "چارت‌بندی دقیق", desc: "نقشه‌های نجومی با دقت بالا بر اساس تاریخ و ساعت تولد", icon: "🌌" },
  { title: "تحلیل داشا", desc: "سیستم دوره‌های داشا و آنتارداشا با بررسی کامل", icon: "⭐" },
  { title: "سازگاری نامزدی", desc: "بررسی تناسب و سازگاری زوجین بر اساس نقشه‌های نجومی", icon: "💕" },
  { title: "ترجمه روزانه", desc: "ترجمه روزانه بر اساس ترانزیت‌های نجومی", icon: "📅" },
]

export default function Landing() {
  return (
    <div className="">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-500/10 to-transparent pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 text-center relative z-10">
          <Badge variant="secondary" className="mb-4 bg-gold-500/15 text-brand-700 dark:text-gold-200 ring-1 ring-gold-400/30 hover:bg-gold-500/25">
            <Sparkles className="mr-1 h-3 w-3" /> منظومه کامل طالع‌بینی
          </Badge>
          <h1 className="mx-auto">
            <img src="/logo.png" alt="AstroBinesh" className="mx-auto h-40 w-auto sm:h-56" />
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
            دقت و دقت در تحلیل نجومی با سیستم‌های اعلامی، داشا، ترانزیت و تحلیل زوجین
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-brand-600 hover:bg-brand-700 transition-all duration-300 hover:scale-105">
              <Link to="/auth">شروع کنید</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-gold-400/60 text-brand-700 dark:text-gold-300 hover:bg-gold-500/10">
              <Link to="/pricing">بسته‌ها</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {[
            { value: "50K+", label: "چارت محاسبه شده", icon: ChartPie },
            { value: "99.9%", label: "دقت محاسبات", icon: Star },
            { value: "24/7", label: "پشتیبانی", icon: Moon },
            { value: "10K+", label: "کاربر راضی", icon: Users },
          ].map((s) => (
            <div key={s.label} className="text-center vedic-card p-6 rounded-xl">
              <s.icon className="mx-auto h-8 w-8 text-brand-600 mb-2" />
              <div className="text-3xl font-bold vedic-text-gradient">{s.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center vedic-text-gradient mb-10">بسته‌ها</h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {[
            { name: "رایگان", price: "0", desc: "مناسب برای شروع", features: ["1 چارت رایگان", "داشا پایه", "ترجمه روزانه"], cta: "شروع", popular: false },
            { name: "استاندارد", price: "29", desc: "برای عاشقان نجوم", features: ["چارت‌های نامحدود", "تحلیل کامل داشا", "سازگاری زوجین", "پشتیبانی"], cta: "به‌زودی", popular: true },
            { name: "حرفه‌ای", price: "79", desc: "برای حرفه‌ای‌ها", features: ["همه امکانات استاندارد", "ترانزیت بلادرنگ", "تحلیل تخصصی", "مشاوره تلفنی"], cta: "به‌زودی", popular: false },
          ].map((p) => (
            <Card key={p.name} className={`vedic-card ${p.popular ? 'ring-2 ring-brand-500' : ''} relative`}>
              {p.popular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600">پرطرفدار</Badge>}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{p.name}</CardTitle>
                <div className="text-4xl font-bold vedic-text-gradient">{p.price}<span className="text-sm text-muted-foreground"> تومان</span></div>
                <CardDescription>{p.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-brand-600" /> {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className={`w-full ${p.popular ? 'bg-brand-600 hover:bg-brand-700' : 'bg-gold-500 hover:bg-gold-600 text-white'} transition-all duration-300 hover:scale-105`}>
                  {p.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
        <h2 className="text-3xl font-bold text-center vedic-text-gradient mb-10">ویژگی‌ها</h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title} className="vedic-card text-center">
              <CardHeader>
                <div className="mx-auto h-12 w-12 rounded-full bg-brand-500/15 ring-1 ring-brand-400/25 flex items-center justify-center text-2xl">
                  {f.icon}
                </div>
                <CardTitle className="text-lg">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{f.desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 bg-gradient-to-r from-brand-500/10 to-gold-500/10">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-100/30_to-transparent pointer-events-none" />
          <h2 className="text-3xl font-bold tracking-tight vedic-text-gradient relative z-10">آماده‌اید؟</h2>
          <p className="mt-4 text-muted-foreground relative z-10">اولین چارت خود را رایگان محاسبه کنید</p>
          <div className="mt-6 relative z-10">
            <Button asChild size="lg" className="bg-brand-600 hover:bg-brand-700 transition-all duration-300 hover:scale-105">
              <Link to="/auth">شروع رایگان</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}