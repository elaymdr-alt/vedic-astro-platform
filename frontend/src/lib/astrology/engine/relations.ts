import type { GrahaKey } from "../types"

/**
 * Naisargika (natural) relationships between the grahas — the classical table.
 * A graha is friendly towards the grahas listed in `FRIENDS[a]`, hostile
 * towards `ENEMIES[a]`, and neutral towards everything else.
 *
 * The two lunar nodes are included with the widely used convention (friends of
 * the malefics, enemies of the luminaries) so that node dignity is well defined
 * instead of always falling back to "neutral".
 */
export const FRIENDS: Record<GrahaKey, GrahaKey[]> = {
  sun: ["moon", "mars", "jupiter"],
  moon: ["sun", "mercury"],
  mars: ["sun", "moon", "jupiter"],
  mercury: ["sun", "venus"],
  jupiter: ["sun", "moon", "mars"],
  venus: ["mercury", "saturn"],
  saturn: ["mercury", "venus"],
  rahu: ["venus", "saturn", "mercury"],
  ketu: ["mars", "jupiter", "venus"],
}

export const ENEMIES: Record<GrahaKey, GrahaKey[]> = {
  sun: ["venus", "saturn"],
  moon: [],
  mars: ["mercury"],
  mercury: ["moon"],
  jupiter: ["mercury", "venus"],
  venus: ["sun", "moon"],
  saturn: ["sun", "moon", "mars"],
  rahu: ["sun", "moon"],
  ketu: ["sun", "moon"],
}

export type NaturalRelation = "friendly" | "neutral" | "enemy"

/** One-directional natural relationship of `a` towards `b`. */
export function naturalRelation(a: GrahaKey, b: GrahaKey): NaturalRelation {
  if (a === b) return "friendly"
  if (FRIENDS[a].includes(b)) return "friendly"
  if (ENEMIES[a].includes(b)) return "enemy"
  return "neutral"
}

/** Compact one-letter form used by the compatibility (Guna Milan) tables. */
export function relationCode(a: GrahaKey, b: GrahaKey): "f" | "n" | "e" {
  const r = naturalRelation(a, b)
  return r === "friendly" ? "f" : r === "enemy" ? "e" : "n"
}

/**
 * Graha Maitri (mutual natural friendship) score, 0–5.
 * Both directions are considered, exactly like the classical Kuta table:
 * mutual friends score 5, one-sided friends 4/1, mutual neutral 3, and the
 * mixed/hostile pairs score below that.
 */
export function grahaMaitri(a: GrahaKey, b: GrahaKey): number {
  if (a === b) return 5
  const k = [relationCode(a, b), relationCode(b, a)].sort().join("")
  return ({ ff: 5, fn: 4, nn: 3, ef: 1, en: 0.5, ee: 0 } as Record<string, number>)[k] ?? 0
}
