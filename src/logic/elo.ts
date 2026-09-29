import type { League, Session } from '../data/types'

export const ELO_BASE = 1000
export const ELO_K = 32

/**
 * ELO de temporada: siempre se recalcula desde el historial (nunca se persiste),
 * así reabrir una jornada o editar un resultado se refleja solo.
 * Jornadas terminadas en orden cronológico; partidos por ronda dentro de cada una.
 */
export function chronologicalFinishedSessions(league: League): Session[] {
  return league.sessions
    .filter(s => s.status === 'finished')
    .slice()
    .sort((a, b) => (a.date === b.date ? (a.id < b.id ? -1 : 1) : a.date < b.date ? -1 : 1))
}

function expected(rating: number, rival: number): number {
  return 1 / (1 + Math.pow(10, (rival - rating) / 400))
}

/** Procesa los partidos con resultado de una jornada, mutando el mapa de ELO */
function playSession(session: Session, elo: Map<string, number>): void {
  const teamById = new Map(session.teams.map(t => [t.id, t]))
  const rating = (id: string) => elo.get(id) ?? ELO_BASE
  const matches = session.matches
    .filter(m => m.result !== undefined)
    .sort((a, b) => a.round - b.round)

  for (const match of matches) {
    const teamA = teamById.get(match.teamAId)
    const teamB = teamById.get(match.teamBId)
    if (teamA === undefined || teamB === undefined || match.result === undefined) continue

    const ratingA = teamA.playerIds.reduce((sum, id) => sum + rating(id), 0) / 2
    const ratingB = teamB.playerIds.reduce((sum, id) => sum + rating(id), 0) / 2
    // delta cero-suma: los 2 de la pareja ganadora suben lo mismo que bajan los otros 2
    const delta = ELO_K * ((match.result.winner === 'A' ? 1 : 0) - expected(ratingA, ratingB))

    for (const id of teamA.playerIds) elo.set(id, rating(id) + delta)
    for (const id of teamB.playerIds) elo.set(id, rating(id) - delta)
  }
}

/** ELO actual de cada jugador que jugó al menos un partido con resultado (default ELO_BASE) */
export function computeElo(league: League): Map<string, number> {
  const elo = new Map<string, number>()
  for (const session of chronologicalFinishedSessions(league)) playSession(session, elo)
  return elo
}

/**
 * Evolución del jugador: [base, ELO después de cada jornada terminada en la que jugó].
 * Se procesan todas las jornadas (los rivales también evolucionan aunque él falte).
 */
export function eloHistory(league: League, playerId: string): number[] {
  const elo = new Map<string, number>()
  const rating = (id: string) => elo.get(id) ?? ELO_BASE
  const history: number[] = [ELO_BASE]
  for (const session of chronologicalFinishedSessions(league)) {
    playSession(session, elo)
    if (session.playerIds.includes(playerId)) history.push(rating(playerId))
  }
  return history
}
