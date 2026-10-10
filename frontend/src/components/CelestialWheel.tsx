import { cn } from '@/lib/utils'

const GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'].map((g) => g + '︎')

/** Decorative zodiac wheel: slow-turning glyph ring, tilted orbits, a glowing
 *  eight-point star and a few planets. Purely ornamental (aria-hidden). */
export default function CelestialWheel({ className }: { className?: string }) {
  const pt = (r: number, deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180
    return [200 + r * Math.cos(a), 200 + r * Math.sin(a)] as const
  }
  const planets = [
    { r: 118, deg: 40, size: 7, fill: 'hsl(190 92% 64%)' },
    { r: 118, deg: 215, size: 5, fill: 'hsl(320 82% 70%)' },
    { r: 86, deg: 130, size: 6, fill: 'hsl(43 95% 70%)' },
    { r: 86, deg: 310, size: 4, fill: 'hsl(268 88% 74%)' },
  ]
  return (
    <svg viewBox="0 0 400 400" aria-hidden="true" className={cn('pointer-events-none select-none', className)}>
      <defs>
        <radialGradient id="cw-core">
          <stop offset="0%" stopColor="hsl(46 100% 85%)" />
          <stop offset="35%" stopColor="hsl(43 95% 62%)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="hsl(43 95% 55%)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cw-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(43 95% 68%)" />
          <stop offset="50%" stopColor="hsl(320 80% 68%)" />
          <stop offset="100%" stopColor="hsl(190 92% 64%)" />
        </linearGradient>
        <filter id="cw-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <circle cx="200" cy="200" r="190" fill="none" stroke="url(#cw-ring)" strokeWidth="1.2" opacity="0.8" />
      <circle cx="200" cy="200" r="150" fill="none" stroke="url(#cw-ring)" strokeWidth="0.8" opacity="0.5" />

      <g className="cx-orbit">
        {Array.from({ length: 72 }, (_, i) => {
          const [x1, y1] = pt(190, i * 5)
          const [x2, y2] = pt(i % 6 === 0 ? 178 : 184, i * 5)
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(43 90% 75%)" strokeWidth={i % 6 === 0 ? 1.2 : 0.6} opacity="0.7" />
        })}
        {GLYPHS.map((g, i) => {
          const [x, y] = pt(166, i * 30 + 15)
          return (
            <text key={g} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="17" fill="hsl(43 92% 78%)" filter="url(#cw-glow)">
              {g}
            </text>
          )
        })}
        {Array.from({ length: 12 }, (_, i) => {
          const [x1, y1] = pt(150, i * 30)
          const [x2, y2] = pt(190, i * 30)
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(268 80% 75%)" strokeWidth="0.7" opacity="0.5" />
        })}
      </g>

      <g className="cx-orbit-rev">
        <ellipse cx="200" cy="200" rx="118" ry="46" fill="none" stroke="hsl(190 90% 70%)" strokeWidth="0.7" opacity="0.45" transform="rotate(-24 200 200)" />
        <circle cx="200" cy="200" r="118" fill="none" stroke="hsl(268 80% 75%)" strokeWidth="0.6" strokeDasharray="2 6" opacity="0.55" />
        <circle cx="200" cy="200" r="86" fill="none" stroke="hsl(43 90% 70%)" strokeWidth="0.6" strokeDasharray="1 5" opacity="0.5" />
        {planets.map((p, i) => {
          const [x, y] = pt(p.r, p.deg)
          return <circle key={i} cx={x} cy={y} r={p.size} fill={p.fill} filter="url(#cw-glow)" />
        })}
      </g>

      <circle cx="200" cy="200" r="46" fill="url(#cw-core)" className="cx-pulse" />
      <path
        d="M200 128 L208 192 L272 200 L208 208 L200 272 L192 208 L128 200 L192 192 Z"
        fill="hsl(46 100% 88%)"
        opacity="0.95"
        filter="url(#cw-glow)"
      />
      <path d="M200 160 L204 196 L240 200 L204 204 L200 240 L196 204 L160 200 L196 196 Z" fill="hsl(43 100% 70%)" transform="rotate(45 200 200)" opacity="0.8" />
    </svg>
  )
}
