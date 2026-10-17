/**
 * Casi Rangos: la escalera de ELO con nombres de la marca.
 * Escala simétrica alrededor del ELO base (1000), con la franja central más
 * ancha porque ahí se apiña la mayoría. Los cortes son sobre el ELO redondeado
 * que se muestra (mismo número en ranking y perfil).
 */
export interface Rank {
  id: string
  emoji: string
  name: string
  /** ELO mínimo (inclusive) para alcanzar el rango */
  min: number
  /** Clase de color del texto del rango */
  text: string
  /** Clase de color para la barra de progreso */
  bar: string
}

export const RANKS: Rank[] = [
  { id: 'principiante', emoji: '🐣', name: 'Casi Principiante', min: 0, text: 'text-mute', bar: 'bg-mute' },
  { id: 'promesa', emoji: '🌱', name: 'Casi Promesa', min: 920, text: 'text-cyan', bar: 'bg-cyan' },
  { id: 'titular', emoji: '🎯', name: 'Casi Titular', min: 970, text: 'text-ink', bar: 'bg-ink' },
  { id: 'crack', emoji: '⚡', name: 'Casi Crack', min: 1030, text: 'text-tangerine', bar: 'bg-tangerine' },
  { id: 'leyenda', emoji: '👑', name: 'Casi Leyenda', min: 1080, text: 'text-lime', bar: 'bg-lime' },
]

export function rankOf(elo: number): Rank {
  let rank = RANKS[0]
  for (const r of RANKS) if (elo >= r.min) rank = r
  return rank
}

/** El rango siguiente a conquistar; undefined en Casi Leyenda (tope de la escala) */
export function nextRank(elo: number): Rank | undefined {
  return RANKS.find(r => r.min > elo)
}

/** Progreso 0-1 dentro del rango actual; en Casi Leyenda la barra queda llena */
export function rankProgress(elo: number): number {
  const current = rankOf(elo)
  const next = nextRank(elo)
  if (next === undefined) return 1
  return Math.min(1, Math.max(0, (elo - current.min) / (next.min - current.min)))
}
