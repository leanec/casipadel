import type { League, Team } from '../data/types'
import { chronologicalFinishedSessions } from './elo'

export interface H2H {
  /** jugando juntos como dupla */
  partners: { played: number; won: number }
  /** cruzados como rivales: played y victorias del jugador `a` (las de b son played - aWon) */
  rivals: { played: number; aWon: number }
}

/** Historial cara a cara entre dos jugadores a lo largo de la temporada */
export function headToHead(league: League, aId: string, bId: string): H2H {
  const h2h: H2H = { partners: { played: 0, won: 0 }, rivals: { played: 0, aWon: 0 } }
  if (aId === bId) return h2h
  for (const session of chronologicalFinishedSessions(league)) {
    const teamOf = (id: string): Team | undefined =>
      session.teams.find(t => t.playerIds.includes(id))
    const ta = teamOf(aId)
    const tb = teamOf(bId)
    if (ta === undefined || tb === undefined) continue

    if (ta.id === tb.id) {
      for (const m of session.matches) {
        if (m.result === undefined) continue
        const side = m.teamAId === ta.id ? 'A' : m.teamBId === ta.id ? 'B' : null
        if (side === null) continue
        h2h.partners.played += 1
        if (m.result.winner === side) h2h.partners.won += 1
      }
    } else {
      for (const m of session.matches) {
        if (m.result === undefined) continue
        const esCruce =
          (m.teamAId === ta.id && m.teamBId === tb.id) ||
          (m.teamAId === tb.id && m.teamBId === ta.id)
        if (!esCruce) continue
        h2h.rivals.played += 1
        if (m.result.winner === (m.teamAId === ta.id ? 'A' : 'B')) h2h.rivals.aWon += 1
      }
    }
  }
  return h2h
}
