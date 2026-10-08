/** Light-theme backdrop: thin crimson orbit arcs, 4-point sparkles and glossy beads. */
const Sparkle = ({ x, y, s }: { x: number; y: number; s: number }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M0 -12 L3 -3 L12 0 L3 3 L0 12 L-3 3 L-12 0 L-3 -3 Z"
    fill="url(#ab-red)"
  />
)

const Bead = ({ x, y, r }: { x: number; y: number; r: number }) => (
  <circle cx={x} cy={y} r={r} fill="url(#ab-bead)" />
)

export default function OrbitDecor() {
  return (
    <svg
      aria-hidden="true"
      className="light-only pointer-events-none fixed inset-0 -z-10 h-full w-full"
      viewBox="0 0 1000 1400"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <defs>
        <linearGradient id="ab-red" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff6b7d" />
          <stop offset="1" stopColor="#c8102e" />
        </linearGradient>
        <radialGradient id="ab-bead" cx="30%" cy="30%" r="80%">
          <stop offset="0" stopColor="#ff8a98" />
          <stop offset="0.55" stopColor="#c8102e" />
          <stop offset="1" stopColor="#7f0a1d" />
        </radialGradient>
      </defs>
      <g stroke="#e0485c" strokeOpacity="0.35" strokeWidth="1.4">
        <path d="M820 -20 C 1010 140 1030 420 960 560" />
        <path d="M-40 260 C 120 520 40 900 -30 1080" />
        <path d="M60 1000 C 20 1180 220 1320 460 1260" />
        <path d="M1040 880 C 880 1000 820 1180 900 1420" />
      </g>
      <Sparkle x={880} y={120} s={2.2} />
      <Sparkle x={70} y={1210} s={2.6} />
      <Sparkle x={930} y={1020} s={1.6} />
      <Sparkle x={140} y={330} s={1.1} />
      <Bead x={946} y={560} r={13} />
      <Bead x={22} y={1070} r={11} />
      <Bead x={470} y={1262} r={9} />
    </svg>
  )
}
