
import * as React from "react"

import { cn } from "@/lib/utils"

interface RevealProps {
  children: React.ReactNode
  className?: string
  /** Extra transition delay in ms for staggered entrances. */
  delay?: number
}

/**
 * Scroll-reveal wrapper: content is fully visible in the server HTML
 * (progressive by design); only clearly below-the-fold blocks are hidden
 * after hydration and then faded in once. Users with
 * prefers-reduced-motion — and visitors without JS — always see the
 * content as-is.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [hidden, setHidden] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    // Keep near-the-fold content visible — no flash right after hydration.
    if (el.getBoundingClientRect().top <= window.innerHeight * 0.92) return
    setHidden(true)
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setHidden(false)
          io.disconnect()
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
        hidden ? "translate-y-5 opacity-0" : "translate-y-0 opacity-100",
        className
      )}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
