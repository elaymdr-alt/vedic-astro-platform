import type { ChartResult } from '../api';
import { PLANET_FA } from '../api';

/** North-Indian diamond chart: 12 houses as fixed diamonds, signs rotate by ascendant. */
export default function NorthChart({ chart }: { chart: ChartResult }) {
  const S = 480;
  const c = S / 2;
  const q = S / 4; // quarter
  // 12 diamond centers in fixed house positions (house 1 = top center diamond)
  // Layout coordinates for house i (1..12) centers:
  const centers: [number, number][] = [
    [c, q / 2 + 20],          // 1 top
    [q / 2 - 10, q / 2 + 10], // 2 top-left edge
    [60, 60],                 // placeholder replaced below
    [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],
  ];
  void centers;
  const asc = chart.ascendant.sign_index;
  // house -> sign mapping (whole sign)
  const houseSign = (h: number) => (asc + h - 1) % 12;
  const planetsIn = (h: number) =>
    chart.planets.filter((p) => p.house === h);

  const signFa = ['حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله', 'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'];

  // Diamond polygons for 12 houses (viewBox 0 0 480 480)
  // Standard north-indian chart geometry
  const polys: string[] = [
    `${c},${c - 10} ${c + 110},${c - 120} ${c},${c - 230} ${c - 110},${c - 120}`, // H1 top diamond
    `${c - 120},${c - 240} ${c - 10},${c - 240} ${c - 120},${c - 130}`,           // H2
    `${c - 240},${c - 240} ${c - 130},${c - 240} ${c - 240},${c - 130}`,          // H3 corner
    `${c - 240},${c - 120} ${c - 240},${c - 10} ${c - 130},${c - 120}`,           // H4
    `${c - 230},${c} ${c - 120},${c + 110} ${c - 120},${c - 110}`,                // H5
    `${c - 110},${c + 120} ${c},${c + 230} ${c},${c + 10} `,                      // H6 (left-bottom of center)
    `${c},${c + 10} ${c},${c + 230} ${c - 110},${c + 120}`,                       // H7 bottom diamond
    `${c + 110},${c + 120} ${c},${c + 230} ${c},${c + 10}`,                       // placeholder
    `${c + 230},${c} ${c + 120},${c - 110} ${c + 120},${c + 110}`,                // placeholder
    `${c + 240},${c - 120} ${c + 240},${c - 10} ${c + 130},${c - 120}`,           // placeholder
    `${c + 240},${c - 240} ${c + 130},${c - 240} ${c + 240},${c - 130}`,          // placeholder
    `${c + 120},${c - 240} ${c + 10},${c - 240} ${c + 120},${c - 130}`,           // placeholder
  ];
  void polys;

  // Simpler robust approach: draw outer square + diagonals + inner diamond (classic template),
  // then place house content by fixed label anchors.
  const anchors: [number, number][] = [
    [c, 105],       // H1
    [105, 55],      // H2
    [55, 105],      // H3
    [105, 240],     // H4
    [55, 375],      // H5
    [105, 425],     // H6
    [c, 375],       // H7
    [375, 425],     // H8
    [425, 375],     // H9
    [375, 240],     // H10
    [425, 105],     // H11
    [375, 55],      // H12
  ];

  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="chart" role="img" aria-label="چارت شمالی">
      <rect x={10} y={10} width={S - 20} height={S - 20} className="chart-box" />
      {/* diagonals */}
      <line x1={10} y1={10} x2={S - 10} y2={S - 10} className="chart-line" />
      <line x1={S - 10} y1={10} x2={10} y2={S - 10} className="chart-line" />
      {/* inner diamond */}
      <polygon
        points={`${c},110 ${370},${c} ${c},${370} 110,${c}`}
        className="chart-line chart-fill-none"
      />
      {anchors.map(([x, y], i) => {
        const h = i + 1;
        const s = houseSign(h);
        const ps = planetsIn(h);
        return (
          <g key={h}>
            <text x={x} y={y - 8} textAnchor="middle" className="chart-sign">
              {signFa[s]}{h === 1 ? ' ⟡' : ''}
            </text>
            {ps.slice(0, 4).map((p, k) => (
              <text key={p.name} x={x} y={y + 12 + k * 15} textAnchor="middle" className="chart-planet">
                {PLANET_FA[p.name] ?? p.name}{p.retrograde ? ' (ر)' : ''}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
