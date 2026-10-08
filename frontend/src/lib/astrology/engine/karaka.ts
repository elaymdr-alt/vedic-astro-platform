import type { GrahaKey, PlanetPlacement } from "../types"

/**
 * Chara Karakas (Jaimini) — the eight "movable significators". Every graha is
 * ranked by its **degree within its sign**: the highest degree becomes the
 * Atmakaraka (soul significator), the next the Amatyakaraka (career/minister),
 * and so on. Degrees are always taken from the sign's start, so a graha at
 * 27° ranks above one at 3° regardless of sign.
 *
 * Rahu always moves backwards, so its Jaimini degree is `30 − degreeInSign`.
 * Ketu is excluded: the classical Jaimini list uses the seven planets plus
 * Rahu. (For the 7-karaka scheme the lowest-ranked graha would be the
 * Strī/Bhrātṛ karaka depending on gender; we expose the standard 8.)
 */

export type KarakaKey =
  | "atmakaraka"
  | "amatyakaraka"
  | "bhratrikaraka"
  | "matrukaraka"
  | "pitrukaraka"
  | "putrakaraka"
  | "gnatikaraka"
  | "darakaraka"

export interface CharaKaraka {
  key: KarakaKey
  graha: GrahaKey
  /** Degree inside the sign used for ranking (Rahu = 30 − deg). 0–30. */
  rankingDegree: number
  fa: string
  /** What this karaka signifies, in Persian. */
  signifies: string
}

export const KARAKA_FA: Record<KarakaKey, { fa: string; signifies: string }> = {
  atmakaraka: { fa: "آتماکاراکا (کاراکای روح)", signifies: "خودِ راستین، هدف نهایی روح و درس اصلی این زندگی" },
  amatyakaraka: { fa: "آماتیاکاراکا (وزیر)", signifies: "شغل، مشاوران و کسانی که کار را پیش می‌برند" },
  bhratrikaraka: { fa: "بهاراتریکاراکا (برادر)", signifies: "خواهر و برادر، همتایان و شجاعت در میدان عمل" },
  matrukaraka: { fa: "ماتریکاراکا (مادر)", signifies: "مادر، خانه و پشتوانهٔ احساسی" },
  pitrukaraka: { fa: "پیت‌ریکاراکا (پدر)", signifies: "پدر، اقتدار و میراث پدری" },
  putrakaraka: { fa: "پوتراکاراکا (فرزند)", signifies: "فرزندان، خلاقیت و آنچه از خود به یادگار می‌گذاری" },
  gnatikaraka: { fa: "گناتیکاراکا (خویشاوند)", signifies: "دشمنان، موانع، بستگان دور و بخش‌های پرتنش زندگی" },
  darakaraka: { fa: "داراکاراکا (همسر)", signifies: "همسر، شریک زندگی و پیوندهای نزدیک" },
}

export const KARAKA_ORDER: KarakaKey[] = [
  "atmakaraka", "amatyakaraka", "bhratrikaraka", "matrukaraka",
  "pitrukaraka", "putrakaraka", "gnatikaraka", "darakaraka",
]

/**
 * Computes the 8 chara karakas from the chart's placements.
 * Ranking uses `degreeInSign` (Rahu inverted); ties keep the classical
 * sequence by descending degree and then a stable input order.
 */
export function charaKarakas(placements: PlanetPlacement[]): CharaKaraka[] {
  const ranked = placements
    .filter((p) => p.graha !== "ketu")
    .map((p) => ({
      graha: p.graha,
      rankingDegree: p.graha === "rahu" ? 30 - p.degreeInSign : p.degreeInSign,
    }))
    .sort((a, b) => b.rankingDegree - a.rankingDegree)

  return KARAKA_ORDER.map((key, i) => ({
    key,
    graha: ranked[i].graha,
    rankingDegree: Math.round(ranked[i].rankingDegree * 100) / 100,
    ...KARAKA_FA[key],
  }))
}

/** The soul significator — the most-used single karaka. */
export function atmakaraka(placements: PlanetPlacement[]): GrahaKey {
  return charaKarakas(placements)[0].graha
}
