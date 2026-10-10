import { cn } from "@/lib/utils"

interface SectionHeadingProps {
  /** Small label above the title, e.g. «فصل ۱» */
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  align?: "start" | "center"
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" ? "items-center text-center" : "items-start text-start",
        className
      )}
    >
      {eyebrow && (
        <span className="text-primary/90 text-xs font-semibold tracking-[0.18em]">
          {eyebrow}
        </span>
      )}
      <h2
        className={cn(
          "text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl",
          "text-gradient-cosmic"
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "text-muted-foreground max-w-2xl text-sm leading-8 sm:text-base",
            align === "center" && "mx-auto"
          )}
        >
          {description}
        </p>
      )}
    </div>
  )
}

/** Thin gold rule with a centred dot — used between chapters. */
export function ChapterDivider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-4" aria-hidden={!label}>
      <span className="from-primary/0 via-primary/40 h-px flex-1 bg-gradient-to-r" />
      {label && (
        <span className="text-primary text-xs font-semibold">
          ✦ {label} ✦
        </span>
      )}
      <span className="via-primary/40 from-primary/0 h-px flex-1 bg-gradient-to-l" />
    </div>
  )
}
