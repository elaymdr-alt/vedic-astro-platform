import type { ChartResult } from '../api'
import { PLANET_FA } from '../api'

export type ChartMode = 'D1' | 'D9'

/** North-Indian diamond chart: houses fixed, signs rotate by ascendant.
 *  D9 (Navamsa) mode re-maps signs/houses from the D9 ascendant (P09-T02-M3). */
export default function NorthChart({
  chart,
  mode = 'D1',
}: {
  chart: ChartResult
  mode?: ChartMode
}) {
  const ascChart = chart.ascendant
  if (!ascChart) return null // unknown birth time: no time-based chart (P05)

  const S = 480
  const c = S / 2

  const asc = mode === 'D9' ? ascChart.d9_sign_index : ascChart.sign_index
  const signOf = (p: { sign_index: number; d9_sign_index: number }) =>
    mode === 'D9' ? p.d9_sign_index : p.sign_index
  // house -> sign mapping (whole sign; D9 houses come from the D9 ascendant)
  const houseSign = (h: number) => (asc + h - 1) % 12
  const planetsIn = (h: number) =>
    chart.planets.filter((p) => (signOf(p) - asc + 12) % 12 + 1 === h)

  const signFa = [
    'حمل',
    'ثور',
    'جوزا',
    'سرطان',
    'اسد',
    'سنبله',
    'میزان',
    'عقرب',
    'قوس',
    'جدی',
    'دلو',
    'حوت',
  ]

  // Outer square + diagonals + inner diamond (classic North-Indian template),
  // then house content is placed on fixed label anchors.
  const anchors: [number, number][] = [
    [c, 105], // H1
    [105, 55], // H2
    [55, 105], // H3
    [105, 240], // H4
    [55, 375], // H5
    [105, 425], // H6
    [c, 375], // H7
    [375, 425], // H8
    [425, 375], // H9
    [375, 240], // H10
    [425, 105], // H11
    [375, 55], // H12
  ]

  const GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'].map((g) => g + '︎')
  const gold = 'hsl(var(--gold-400))'
  const line = 'hsl(var(--gold-400) / 0.45)'
  const R = 336 // zodiac ring radius
  const ringPt = (r: number, deg: number): [number, number] => {
    const a = ((deg - 90) * Math.PI) / 180
    return [c + r * Math.cos(a), c + r * Math.sin(a)]
  }
  const planetColor: Record<string, string> = {
    Sun: 'hsl(43 98% 72%)',
    Moon: 'hsl(210 40% 92%)',
    Mars: 'hsl(8 90% 68%)',
    Mercury: 'hsl(152 70% 66%)',
    Jupiter: 'hsl(48 95% 66%)',
    Venus: 'hsl(320 80% 76%)',
    Saturn: 'hsl(222 70% 76%)',
    Rahu: 'hsl(268 80% 76%)',
    Ketu: 'hsl(190 80% 70%)',
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <svg
        viewBox={`${c - 370} ${c - 370} 740 740`}
        role="img"
        aria-label={`چارت شمالی ${mode === 'D9' ? 'ناوامشا (D9)' : 'دشانه (D1)'}`}
        className="h-auto w-full"
      >
        <defs>
          <radialGradient id="nc-bg" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="hsl(268 70% 30% / 0.55)" />
            <stop offset="70%" stopColor="hsl(236 60% 12% / 0.7)" />
            <stop offset="100%" stopColor="hsl(236 60% 8% / 0.2)" />
          </radialGradient>
          <linearGradient id="nc-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(43 95% 68%)" />
            <stop offset="50%" stopColor="hsl(320 80% 68%)" />
            <stop offset="100%" stopColor="hsl(190 92% 64%)" />
          </linearGradient>
          <radialGradient id="nc-core">
            <stop offset="0%" stopColor="hsl(46 100% 85% / 0.9)" />
            <stop offset="100%" stopColor="hsl(43 95% 60% / 0)" />
          </radialGradient>
          <filter id="nc-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Zodiac ring */}
        <circle cx={c} cy={c} r={R + 24} fill="url(#nc-bg)" />
        <circle cx={c} cy={c} r={R + 24} fill="none" stroke="url(#nc-ring)" strokeWidth={1.6} filter="url(#nc-glow)" />
        <circle cx={c} cy={c} r={R - 26} fill="none" stroke="url(#nc-ring)" strokeWidth={0.8} opacity={0.7} />
        {Array.from({ length: 72 }, (_, i) => {
          const [x1, y1] = ringPt(R + 24, i * 5)
          const [x2, y2] = ringPt(i % 6 === 0 ? R + 12 : R + 18, i * 5)
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={gold} strokeWidth={i % 6 === 0 ? 1.1 : 0.5} opacity={0.65} />
        })}
        {anchors.map(([x, y], i) => {
          const deg = (Math.atan2(y - c, x - c) * 180) / Math.PI + 90
          const [gx, gy] = ringPt(R, deg)
          return (
            <text key={i} x={gx} y={gy} textAnchor="middle" dominantBaseline="central" fontSize={22} fill="hsl(43 92% 78%)" filter="url(#nc-glow)">
              {GLYPHS[houseSign(i + 1)]}
            </text>
          )
        })}

        <g transform={`translate(${c} ${c}) scale(0.92) translate(${-c} ${-c})`}>
        {/* Frame: square + diagonals + diamond */}
        <rect x={10} y={10} width={S - 20} height={S - 20} rx={6} fill="hsl(236 55% 9% / 0.55)" stroke="url(#nc-ring)" strokeWidth={1.8} />
        <line x1={10} y1={10} x2={S - 10} y2={S - 10} stroke={line} strokeWidth={1} />
        <line x1={S - 10} y1={10} x2={10} y2={S - 10} stroke={line} strokeWidth={1} />
        <polygon points={`${c},10 ${S - 10},${c} ${c},${S - 10} 10,${c}`} fill="none" stroke={line} strokeWidth={1} />
        <circle cx={c} cy={c} r={70} fill="url(#nc-core)" />

        <text x={S - 22} y={34} textAnchor="end" className="num" fontSize={16} fontWeight={800} fill={gold} filter="url(#nc-glow)">
          {mode}
        </text>

        {anchors.map(([x, y], i) => {
          const h = i + 1
          const s = houseSign(h)
          const ps = planetsIn(h)
          return (
            <g key={h}>
              <text x={x} y={y - 10} textAnchor="middle" fontSize={13} fontWeight={600} fill="hsl(43 85% 80% / 0.9)">
                {signFa[s]}
                {h === 1 ? ' ✦' : ''}
              </text>
              {ps.slice(0, 4).map((p, k) => (
                <text
                  key={p.name}
                  x={x}
                  y={y + 10 + k * 15}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight={600}
                  fill={planetColor[p.name] ?? 'hsl(var(--foreground))'}
                  filter="url(#nc-glow)"
                >
                  {PLANET_FA[p.name] ?? p.name}
                  {p.retrograde ? ' (ر)' : ''}
                </text>
              ))}
            </g>
          )
        })}
        </g>
      </svg>
    </div>
  )
}
