
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

interface ChapterRef {
  id: string
  short: string
}

/**
 * Sticky chapter pill nav with a scroll-spy active state.
 *
 * The glass surface carries an explicit `backdrop-blur-md` utility because the
 * production CSS pipeline only ships a `-webkit-backdrop-filter` for `.glass`,
 * which Chromium/Firefox ignore.
 */
export function ChapterPills({ chapters }: { chapters: ChapterRef[] }) {
  const [active, setActive] = useState<string | null>(chapters[0]?.id ?? null)

  useEffect(() => {
    let raf = 0
    const measure = () => {
      raf = 0
      // header (64px) + pill nav (~66px) + a little breathing room
      const offset = 160
      let current: string | null = chapters[0]?.id ?? null
      for (const c of chapters) {
        const el = document.getElementById(c.id)
        if (el && el.getBoundingClientRect().top <= offset) current = c.id
      }
      setActive(current)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [chapters])

  return (
    <div className="glass backdrop-blur-md mx-auto flex w-fit max-w-full gap-1 overflow-x-auto rounded-full p-1.5">
      {chapters.map((c) => {
        const isActive = active === c.id
        return (
          <a
            key={c.id}
            href={`#${c.id}`}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
              isActive
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {c.short}
          </a>
        )
      })}
    </div>
  )
}
