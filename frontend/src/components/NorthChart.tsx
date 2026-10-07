import type { ChartResult } from '../api';
import { PLANET_FA } from '../api';

export type ChartMode = 'D1' | 'D9';

/** North-Indian diamond chart: houses fixed, signs rotate by ascendant.
 *  D9 (Navamsa) mode re-maps signs/houses from the D9 ascendant (P09-T02-M3). */
export default function NorthChart({ chart, mode = 'D1' }: { chart: ChartResult; mode?: ChartMode }) {
  const ascChart = chart.ascendant;
  if (!ascChart) return null; // unknown birth time: no time-based chart (P05)

  const S = 480;
  const c = S / 2;

  const asc = mode === 'D9' ? ascChart.d9_sign_index : ascChart.sign_index;
  const signOf = (p: { sign_index: number; d9_sign_index: number }) =>
    mode === 'D9' ? p.d9_sign_index : p.sign_index;
  // house -> sign mapping (whole sign; D9 houses come from the D9 ascendant)
  const houseSign = (h: number) => (asc + h - 1) % 12;
  const planetsIn = (h: number) =>
    chart.planets.filter((p) => (signOf(p) - asc + 12) % 12 + 1 === h);

  const signFa = ['حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله', 'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'];

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
    <svg viewBox={`0 0 ${S} ${S}`} className="chart" role="img"
         aria-label={`چارت شمالی ${mode === 'D9' ? 'ناوامشا (D9)' : 'دشانه (D1)'}`}>
      <rect x={10} y={10} width={S - 20} height={S - 20} className="chart-box" />
      {/* diagonals */}
      <line x1={10} y1={10} x2={S - 10} y2={S - 10} className="chart-line" />
      <line x1={S - 10} y1={10} x2={10} y2={S - 10} className="chart-line" />
      {/* inner diamond */}
      <polygon
        points={`${c},110 ${370},${c} ${c},${370} 110,${c}`}
        className="chart-line chart-fill-none"
      />
      <text x={S - 16} y={26} textAnchor="end" className="chart-sign">{mode}</text>
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
