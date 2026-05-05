export default function ChakrazLogo({ size = 20 }) {
  const n = 20;
  const cx = 50, cy = 50;
  const tipR = 48;
  const baseR = 37;
  const innerR = 28;

  const rainbow = [
    '#FF0000','#FF2800','#FF5500','#FF8800','#FFBB00','#FFEE00',
    '#AAEE00','#55DD00','#00CC44','#00DD99','#00EEFF','#00CCFF',
    '#0099FF','#0055FF','#2200FF','#6600FF','#9900FF','#CC00FF',
    '#FF00CC','#FF0066',
  ];

  const toRad = (deg) => (deg * Math.PI) / 180;

  const segments = Array.from({ length: n }, (_, i) => {
    const a1 = toRad(i * (360 / n) - 90);
    const a2 = toRad((i + 1) * (360 / n) - 90);
    const am = (a1 + a2) / 2;

    const ix1 = cx + innerR * Math.cos(a1), iy1 = cy + innerR * Math.sin(a1);
    const ox1 = cx + baseR  * Math.cos(a1), oy1 = cy + baseR  * Math.sin(a1);
    const xt  = cx + tipR   * Math.cos(am), yt  = cy + tipR   * Math.sin(am);
    const ox2 = cx + baseR  * Math.cos(a2), oy2 = cy + baseR  * Math.sin(a2);
    const ix2 = cx + innerR * Math.cos(a2), iy2 = cy + innerR * Math.sin(a2);

    const d = [
      `M ${ix1} ${iy1}`,
      `L ${ox1} ${oy1}`,
      `L ${xt}  ${yt}`,
      `L ${ox2} ${oy2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerR} ${innerR} 0 0 0 ${ix1} ${iy1}`,
      'Z',
    ].join(' ');

    return { d, color: rainbow[i] };
  });

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      {segments.map((s, i) => (
        <path key={i} d={s.d} fill={s.color} />
      ))}
      <circle cx={cx} cy={cy} r={innerR} fill="white" />
      <text
        x={cx} y={cy + 8}
        textAnchor="middle"
        fill="#00B4D8"
        fontSize="24"
        fontWeight="bold"
        fontFamily="Arial Black, Arial, sans-serif"
      >
        AI
      </text>
    </svg>
  );
}
