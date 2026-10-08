import type { FortuneLevel } from "@/lib/astrology/types"

const LEVEL_DOT: Record<FortuneLevel, string> = {
  green: "bg-fortune-green",
  amber: "bg-fortune-amber",
  red: "bg-fortune-red",
}

export function fortuneDotStyles(level: FortuneLevel): string {
  return LEVEL_DOT[level]
}
