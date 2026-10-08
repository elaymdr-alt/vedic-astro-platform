/**
 * Test helpers: charts are produced by the Python engine (fixtures generated
 * with `engine.compute_chart`) and adapted exactly like the live app does.
 * `DEMO_CHART_TIME` selects the fixture: 06:42 (demo) or 15:42 (shifted lagna).
 */
import demo from "./__fixtures__/demo-chart.json"
import shifted from "./__fixtures__/shifted-chart.json"
import type { ChartResult } from "@/api"
import { natalChartFromBackend } from "./fromBackend"
import type { BirthProfile, NatalChart } from "./types"

export const DEMO_PROFILE: BirthProfile = {
  name: "آرش",
  date: "1993-04-17",
  time: "06:42",
  timeKnown: true,
  city: "تهران",
  latitude: 35.6892,
  longitude: 51.389,
  timezone: "Asia/Tehran",
  gender: "male",
}

export function buildNatalChart(profile: BirthProfile): NatalChart {
  const raw = (profile.time === "15:42" ? shifted : demo) as unknown as ChartResult
  return natalChartFromBackend(raw, profile)
}
