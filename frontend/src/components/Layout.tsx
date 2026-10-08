import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  Brain,
  BookOpen,
  CalendarDays,
  Clock,
  MessageCircle,
  Compass,
  LayoutDashboard,
  Menu,
  Sparkles,
  Star,
  User,
  Wallet,
  X,
  Settings as SettingsIcon,
  LogIn,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useTheme } from 'next-themes'
import CosmicBackground from './CosmicBackground'
import OrbitDecor from './OrbitDecor'

interface NavItem {
  to: string
  label: string
  icon: typeof Compass
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'چارت تولد', icon: Compass },
  { to: '/today', label: 'امروز من', icon: CalendarDays },
  { to: '/reading', label: 'تفسیر', icon: BookOpen },
  { to: '/rectify', label: 'ساعت تولد', icon: Clock },
  { to: '/chat', label: 'گفت‌وگو', icon: MessageCircle },
  { to: '/psyche', label: 'روان‌شناسی', icon: Brain },
]

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted ? theme !== 'light' : true

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? 'فعال‌کردن حالت روشن' : 'فعال‌کردن حالت تاریک'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="text-muted-foreground transition-all duration-300 hover:text-brand-300 hover:bg-brand-500/10"
    >
      <Star
        className={cn(
          'h-[1.15rem] w-[1.15rem] transition-all duration-500',
          isDark ? 'rotate-0 scale-100' : '-rotate-90 scale-75',
        )}
        aria-hidden="true"
      />
    </Button>
  )
}

export function BrandMark() {
  return (
    <img
      src="/logo-mark.png"
      alt=""
      aria-hidden="true"
      className="h-11 w-auto transition-transform duration-500 group-hover:scale-110"
    />
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setMenuOpen(false), [location.pathname])

  // Condense the header once the page scrolls.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="relative flex min-h-dvh flex-col" dir="rtl">
      <CosmicBackground className="dark-only" intensity="medium" showNebula showOrbs showGrid />
      <OrbitDecor />
      
      {/* ------------------------------------------------------------- Header */}
      <header
        className={cn(
          'sticky top-0 z-50 w-full transition-all duration-300',
          scrolled
            ? 'border-b border-white/[0.07] bg-background/70 backdrop-blur-xl backdrop-saturate-150'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="group flex shrink-0 items-center gap-3">
            <BrandMark />
            <span className="hidden sm:block">
              <span className="vedic-text-gradient block text-lg font-extrabold leading-tight" dir="ltr">
                AstroBinesh
              </span>
              <span className="block text-[11px] font-light leading-tight text-muted-foreground">
                آیانامشای لاهیری • Whole Sign
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="ناوبری اصلی">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'text-brand-700 dark:text-brand-200'
                      : 'text-muted-foreground hover:bg-white/[0.05] hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        'h-4 w-4 transition-transform duration-300 group-hover:scale-110',
                        isActive && 'text-brand-400',
                      )}
                      aria-hidden="true"
                    />
                    {label}
                    <span
                      className={cn(
                        'absolute inset-x-3 -bottom-px h-px origin-center bg-gradient-to-l from-transparent via-brand-400 to-transparent transition-transform duration-300',
                        isActive ? 'scale-x-100' : 'scale-x-0',
                      )}
                      aria-hidden="true"
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />

            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hidden text-muted-foreground transition-all duration-200 hover:text-brand-200 sm:inline-flex"
            >
              <Link to="/auth">
                <LogIn className="ml-2 h-4 w-4" aria-hidden="true" />
                ورود
              </Link>
            </Button>

            <Button
              size="sm"
              asChild
              className="vedic-gradient hidden shadow-lg shadow-brand-950/40 transition-all duration-300 hover:brightness-110 sm:inline-flex"
            >
              <Link to="/">محاسبه چارت</Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label={menuOpen ? 'بستن منو' : 'باز کردن منو'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        <div
          className={cn(
            'grid overflow-hidden border-t border-white/[0.07] bg-background/90 backdrop-blur-xl transition-[grid-template-rows] duration-300 lg:hidden',
            menuOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <nav className="min-h-0" aria-label="ناوبری موبایل">
            <ul className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-brand-500/15 text-brand-200 ring-1 ring-brand-400/30'
                          : 'text-muted-foreground hover:bg-white/[0.05] hover:text-foreground',
                      )
                    }
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </NavLink>
                </li>
              ))}
              <li className="sm:hidden">
                <NavLink
                  to="/auth"
                  className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-white/[0.05] hover:text-foreground"
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  ورود / ثبت‌نام
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex-1">{children}</main>

      {/* ------------------------------------------------------------- Footer */}
      <footer className="relative z-10 mt-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Separator className="vedic-divider" />
          <div className="flex flex-col items-center justify-between gap-4 py-8 text-center sm:flex-row sm:text-right">
            <div>
              <p className="vedic-text-gradient text-sm font-bold">طالع‌بینی ودیک</p>
              <p className="mt-1 text-xs text-muted-foreground">
                محاسبه دقیق چارت تولد بر پایه منطقه‌البروج و آیانامشای لاهیری
              </p>
            </div>
            <p className="num text-xs text-muted-foreground/70">
              برای اهداف آموزشی — مشورت مالی یا پزشکی نیست
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}