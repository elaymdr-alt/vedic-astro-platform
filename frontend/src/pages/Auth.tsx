import { useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff, Sparkles, Star, Moon } from "lucide-react"

export default function Auth() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => setLoading(false), 1500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-brand-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-brand-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <Card className="w-full max-w-md vedic-card vedic-glow relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center">
            <Star className="h-8 w-8 text-brand-600" />
          </div>
          <CardTitle className="text-2xl vedic-text-gradient">طالع‌بینی ودیک</CardTitle>
          <CardDescription>ورود به حساب خود یا ثبت‌نام</CardDescription>
        </CardHeader>
        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">ورود</TabsTrigger>
            <TabsTrigger value="register">ثبت‌نام</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">ایمیل</Label>
                  <div className="relative">
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" required className="pl-10 transition-all duration-300 focus:ring-2 focus:ring-brand-500" />
                    <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">رمز عبور</Label>
                  <div className="relative">
                    <Input id="password" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="pl-10 pr-10 transition-all duration-300 focus:ring-2 focus:ring-brand-500" />
                    <Moon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-400" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute left-10 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-brand-600 transition-colors">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 transition-all duration-300 hover:scale-[1.02]">
                  {loading ? 'در حال ورود...' : 'ورود'}
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/">بازگشت</Link>
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
          <TabsContent value="register">
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">نام و نام خانوادگی</Label>
                  <Input id="name" placeholder="نام و نام خانوادگی" required className="transition-all duration-300 focus:ring-2 focus:ring-brand-500" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">ایمیل</Label>
                  <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" required className="transition-all duration-300 focus:ring-2 focus:ring-brand-500" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">رمز عبور</Label>
                  <div className="relative">
                    <Input id="reg-password" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="pl-10 pr-10 transition-all duration-300 focus:ring-2 focus:ring-brand-500" />
                    <Moon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-400" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute left-10 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-brand-600 transition-colors">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button type="submit" disabled={loading} className="w-full bg-gold-500 hover:bg-gold-600 text-white transition-all duration-300 hover:scale-[1.02]">
                  {loading ? 'در حال ثبت‌نام...' : 'ثبت‌نام'}
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/">بازگشت</Link>
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}