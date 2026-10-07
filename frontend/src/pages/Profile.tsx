import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { User, Calendar, MapPin, Save } from "lucide-react"

export default function Profile() {
  const [form, setForm] = useState({
    fullName: "علی احمدی",
    email: "ali@example.com",
    birthDate: "1375/02/15",
    birthPlace: "تهران",
    timezone: "Asia/Tehran",
  })

  const handleSave = () => {
    toast.success("پروفایل با موفقیت به‌روزرسانی شد")
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold vedic-text-gradient mb-8">پروفایل کاربری</h1>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Avatar Card */}
        <Card className="vedic-card">
          <CardContent className="flex flex-col items-center pt-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src="" />
              <AvatarFallback className="text-2xl">عل</AvatarFallback>
            </Avatar>
            <CardTitle className="mt-4">علی احمدی</CardTitle>
            <CardDescription>عضو از سال 1402</CardDescription>
            <Badge variant="success" className="mt-2">فعال</Badge>
            <Button variant="outline" size="sm" className="mt-4">تغییر عکس</Button>
          </CardContent>
        </Card>

        {/* Info Form */}
        <Card className="vedic-card md:col-span-2">
          <CardHeader>
            <CardTitle>اطلاعات شخصی</CardTitle>
            <CardDescription>داده‌های تولد و تماس خود را ویرایش کنید</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">نام و نام خانوادگی</Label>
                <Input id="name" value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">ایمیل</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
              </div>
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bdate">تاریخ تولد</Label>
                <Input id="bdate" value={form.birthDate} onChange={(e) => setForm({...form, birthDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bplace">محل تولد</Label>
                <Input id="bplace" value={form.birthPlace} onChange={(e) => setForm({...form, birthPlace: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tz">منطقه زمانی</Label>
              <Input id="tz" value={form.timezone} onChange={(e) => setForm({...form, timezone: e.target.value})} />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSave} className="bg-brand-600 hover:bg-brand-700">
              <Save className="ml-2 h-4 w-4" /> ذخیره تغییرات
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}