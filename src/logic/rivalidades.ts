import type { League, Match } from '../data/types'
import { chronologicalFinishedSessions } from './elo'
import { pairKey } from './draw'

/**
 * Rivalidades ⚔️: la vista grupal del cara a cara. Qué parejas se cruzaron más
 * veces como rivales a lo largo de la temporada y cómo va la serie. Cuando la
 * serie está empatada, es "la final no oficial": nadie le puede sacar ventaja
 * definitiva a nadie. Todo derivado del historial, como el ELO.
 */

/** Cruces como rivales para que una serie se considere rivalidad */
export const RIVALIDAD_MIN = 5

export interface Rivalidad {
  aId: string
  bId: string
  /** partidos enfrentados como rivales (los 4 cruces por partido cuentan) */
  cruzados: number
  /** victorias de aId; las de bId son cruzados - aWon */
  aWon: number
  /** serie pareja a muerte con la rivalidad asentada: la "final no oficial" */
  caliente: boolean
}

/** Series con al menos RIVALIDAD_MIN cruces: más cruzadas primero, desempate
 *  serie más pareja ⇒ clave (determinístico). Invitados incluidos, como el H2H. */
export function rivalidades(league: League): Rivalidad[] {
  const series = new Map<string, { aId: string; bId: string; aWon: number; cruzados: number }>()
  const registrar = (ganadorId: string, perdedorId: string): void => {
    const key = pairKey(ganadorId, perdedorId)
    const [aId, bId] = key.split('|') as [string, string]
    const serie = series.get(key) ?? { aId, bId, aWon: 0, cruzados: 0 }
    serie.cruzados += 1
    if (ganadorId === aId) serie.aWon += 1
    series.set(key, serie)
  }
  for (const session of chronologicalFinishedSessions(league)) {
    const teamById = new Map(session.teams.map(t => [t.id, t]))
    const matches = session.matches
      .filter((m): m is Match & { result: NonNullable<Match['result']> } => m.result !== undefined)
      .sort((a, b) => a.round - b.round)
    for (const match of matches) {
      const teamA = teamById.get(match.teamAId)
      const teamB = teamById.get(match.teamBId)
      if (teamA === undefined || teamB === undefined) continue
      // OJO: winner 'A'/'B' es relativo al teamAId del partido
      const ganadores = match.result.winner === 'A' ? teamA : teamB
      const perdedores = match.result.winner === 'A' ? teamB : teamA
      for (const ganador of ganadores.playerIds) {
        for (const perdedor of perdedores.playerIds) registrar(ganador, perdedor)
      }
    }
  }
  return [...series.values()]
    .filter(s => s.cruzados >= RIVALIDAD_MIN)
    .map(s => ({
      aId: s.aId,
      bId: s.bId,
      cruzados: s.cruzados,
      aWon: s.aWon,
      caliente: Math.abs(2 * s.aWon - s.cruzados) <= 1,
    }))
    .sort((x, y) => {
      const kx = pairKey(x.aId, x.bId)
      const ky = pairKey(y.aId, y.bId)
      return y.cruzados - x.cruzados || diferencia(x) - diferencia(y) || (kx < ky ? -1 : kx > ky ? 1 : 0)
    })
}

function diferencia(r: Rivalidad): number {
  return Math.abs(2 * r.aWon - r.cruzados)
}

/** La rivalidad insignia del grupo (undefined si ninguna alcanzó el umbral) */
export function rivalidadTop(league: League): Rivalidad | undefined {
  return rivalidades(league)[0]
}

/** La serie entre dos jugadores (undefined si no llegan al umbral) */
export function rivalidadDe(league: League, aId: string, bId: string): Rivalidad | undefined {
  if (aId === bId) return undefined
  return rivalidades(league).find(r => pairKey(r.aId, r.bId) === pairKey(aId, bId))
}

/** Posición de la rivalidad en el ranking del grupo (1-based; 0 si no llega) */
export function puestoDeRivalidad(league: League, aId: string, bId: string): number {
  const idx = rivalidades(league).findIndex(r => pairKey(r.aId, r.bId) === pairKey(aId, bId))
  return idx === -1 ? 0 : idx + 1
}

/** El rival que más te pasa por arriba y el que más pasás por arriba
 *  (con la rivalidad asentada; undefined si con nadie llegaste al umbral) */
export function nemesisYVictima(
  league: League,
  playerId: string,
): { nemesisId?: string; victimaId?: string } {
  let nemesisId: string | undefined
  let peor = 0
  let victimaId: string | undefined
  let mejor = 0
  for (const r of rivalidades(league)) {
    if (r.aId !== playerId && r.bId !== playerId) continue
    const miId = r.aId === playerId ? r.aId : r.bId
    const otroId = miId === r.aId ? r.bId : r.aId
    const mias = miId === r.aId ? r.aWon : r.cruzados - r.aWon
    const suyas = r.cruzados - mias
    if (suyas - mias > peor) {
      peor = suyas - mias
      nemesisId = otroId
    }
    if (mias - suyas > mejor) {
      mejor = mias - suyas
      victimaId = otroId
    }
  }
  return { nemesisId, victimaId }
}
