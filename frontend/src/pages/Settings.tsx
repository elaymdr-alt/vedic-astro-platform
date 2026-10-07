import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { User, Calendar, MapPin, Save, Bell, Palette, Lock } from "lucide-react"

export default function Settings() {
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    daily: true,
    weekly: false,
  })
  const [appearance, setAppearance] = useState("dark")
  const [language, setLanguage] = useState("fa")

  const handleSave = (section: string) => {
    toast.success(`${section} با موفقیت ذخیره شد`)
  }

  return (
    <div className="min-h-screen bg-background p-6 max-w-6xl mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold vedic-text-gradient mb-2">تنظیمات</h1>
        <p className="text-muted-foreground">مدیریت پروفایل، ظاهر و تعداد اشتراک</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            پروفایل
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            اعلان‌ها
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            ظاهر
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="h-4 w-4" />
            امنیت
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid gap-8 md:grid-cols-3">
            <Card className="vedic-card">
              <CardContent className="flex flex-col items-center pt-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-2xl bg-brand-100 text-brand-700">عل</AvatarFallback>
                </Avatar>
                <CardTitle className="mt-4">علی احمدی</CardTitle>
                <CardDescription>عضو از سال 1402</CardDescription>
                <Badge variant="secondary" className="mt-2 bg-green-50 text-green-700">فعال</Badge>
                <Button variant="outline" size="sm" className="mt-4">تغییر عکس</Button>
              </CardContent>
            </Card>

            <Card className="vedic-card md:col-span-2">
              <CardHeader>
                <CardTitle>اطلاعات شخصی</CardTitle>
                <CardDescription>داده‌های تولد و تماس خود را ویرایش کنید</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">نام و نام خانوادگی</Label>
                    <Input id="name" defaultValue="علی احمدی" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">ایمیل</Label>
                    <Input id="email" type="email" defaultValue="ali@example.com" />
                  </div>
                </div>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bdate">تاریخ تولد</Label>
                    <Input id="bdate" defaultValue="1375/02/15" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bplace">محل تولد</Label>
                    <Input id="bplace" defaultValue="تهران" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">درباره خود</Label>
                  <Textarea id="bio" defaultValue="علاقه‌مند به طالع‌بینی ودیک و تحلیل نجومی" />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => handleSave("اطلاعات پروفایل")} className="bg-brand-600 hover:bg-brand-700">
                  <Save className="ml-2 h-4 w-4" /> ذخیره تغییرات
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="vedic-card">
            <CardHeader>
              <CardTitle>تنظیمات اعلان‌ها</CardTitle>
              <CardDescription>مدیریت نوع و زمان اعلان‌ها</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: "email", label: "اعلان ایمیلی", desc: "دریافت اعلان‌ها از طریق ایمیل" },
                { key: "push", label: "اعلان پوش", desc: "اعلان‌های فوری در مرورگر" },
                { key: "daily", label: "گزارش روزانه", desc: "خلاصه ترانزیت‌های روزانه" },
                { key: "weekly", label: "گزارش هفتگی", desc: "تحلیل هفتگی و پیش‌بینی‌ها" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key as keyof typeof notifications]}
                    onCheckedChange={(checked: boolean) =>
                      setNotifications((prev) => ({ ...prev, [item.key]: checked }))
                    }
                  />
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleSave("تنظیمات اعلان‌ها")} className="bg-brand-600 hover:bg-brand-700">
                <Save className="ml-2 h-4 w-4" /> ذخیره تغییرات
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="vedic-card">
              <CardHeader>
                <CardTitle>حالت ظاهری</CardTitle>
                <CardDescription>انتخاب تم رنگی برای برنامه</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {["dark", "light", "system"].map((theme) => (
                    <div
                      key={theme}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        appearance === theme
                          ? "border-brand-500 bg-brand-50"
                          : "border-border hover:border-brand-300"
                      }`}
                      onClick={() => setAppearance(theme)}
                    >
                      <p className="font-medium text-sm capitalize">{theme}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="vedic-card">
              <CardHeader>
                <CardTitle>زبان</CardTitle>
                <CardDescription>تنظیم زبان برنامه</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fa">فارسی</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="vedic-card">
            <CardHeader>
              <CardTitle>امنیت و حریم خصوصی</CardTitle>
              <CardDescription>مدیریت رمز عبور و امنیت حساب</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="current-password">رمز عبور فعلی</Label>
                <Input id="current-password" type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">رمز عبور جدید</Label>
                <Input id="new-password" type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">تأیید رمز عبور</Label>
                <Input id="confirm-password" type="password" placeholder="••••••••" />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">احراز هویت دو مرحله‌ای</p>
                  <p className="text-sm text-muted-foreground">افزودن لایه امنیتی اضافی</p>
                </div>
                <Switch />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleSave("تنظیمات امنیتی")} className="bg-brand-600 hover:bg-brand-700">
                <Save className="ml-2 h-4 w-4" /> ذخیره تغییرات
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}