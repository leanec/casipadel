/** Curva de evolución (ELO) en SVG puro: línea lima + relleno degradado */
export default function Sparkline({
  points,
  width = 260,
  height = 64,
}: {
  points: number[]
  width?: number
  height?: number
}) {
  if (points.length < 2) {
    return (
      <p className="py-4 text-center text-xs text-mute">
        La curva aparece después de la segunda jornada
      </p>
    )
  }

  const min = Math.min(...points)
  const max = Math.max(...points)
  const margen = 6
  // todos iguales ⇒ línea recta al medio
  const rango = max - min
  const x = (i: number) => (i / (points.length - 1)) * (width - margen * 2) + margen
  const y = (v: number) =>
    rango === 0 ? height / 2 : height - margen - ((v - min) / rango) * (height - margen * 2)

  const linea = points.map((p, i) => `${x(i)},${y(p)}`).join(' ')
  const area = `${margen},${height - margen} ${linea} ${width - margen},${height - margen}`
  const ultimo = { cx: x(points.length - 1), cy: y(points[points.length - 1]) }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Evolución de ELO"
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C6F432" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#C6F432" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#spark-fill)" />
      <polyline
        points={linea}
        fill="none"
        stroke="#C6F432"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={ultimo.cx} cy={ultimo.cy} r="3.5" fill="#C6F432" />
    </svg>
  )
}
