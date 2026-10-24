import type { League, Session } from '../data/types'

export const ELO_BASE = 1000
export const ELO_K = 32

// Decaimiento por inactividad: pasadas AUSENCIAS_GRACIA jornadas seguidas sin
// jugar, cada jornada ausente resta DECAY_POR_AUSENCIA, drenando hacia ELO_BASE
// sin cruzarlo (a los de abajo la inactividad no les regala puntos). No aplica
// a invitados ni a quien todavía no debutó en ninguna jornada.
export const DECAY_POR_AUSENCIA = 10
export const AUSENCIAS_GRACIA = 2

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
  const m = marchaInicial()
  const sinDecay = invitadosDe(league)
  for (const session of chronologicalFinishedSessions(league)) pasoJornada(m, session, sinDecay)
  return m.elo
}

/** Estado del recorrido por jornadas: ELO, debutados y ausencias seguidas */
interface Marcha {
  elo: Map<string, number>
  vistos: Set<string>
  ausencias: Map<string, number>
}

function marchaInicial(): Marcha {
  return { elo: new Map(), vistos: new Set(), ausencias: new Map() }
}

function invitadosDe(league: League): Set<string> {
  return new Set(league.players.filter(p => p.invitado === true).map(p => p.id))
}

/** Procesa una jornada: partidos con resultado + decaimiento de los ausentes */
function pasoJornada(m: Marcha, session: Session, sinDecay: Set<string>): void {
  playSession(session, m.elo)
  for (const id of session.playerIds) {
    m.vistos.add(id)
    m.ausencias.set(id, 0)
  }
  for (const id of m.vistos) {
    if (sinDecay.has(id) || session.playerIds.includes(id)) continue
    const n = (m.ausencias.get(id) ?? 0) + 1
    m.ausencias.set(id, n)
    if (n > AUSENCIAS_GRACIA) {
      const actual = m.elo.get(id) ?? ELO_BASE
      if (actual > ELO_BASE) m.elo.set(id, Math.max(ELO_BASE, actual - DECAY_POR_AUSENCIA))
    }
  }
}

/**
 * Evolución del jugador: [base, ELO después de cada jornada terminada desde su
 * debut] — juegue o falte. Las faltas que decaen se ven como bajones en la
 * sparkline; los rivales también evolucionan aunque él falte.
 */
export function eloHistory(league: League, playerId: string): number[] {
  const m = marchaInicial()
  const sinDecay = invitadosDe(league)
  const history: number[] = [ELO_BASE]
  for (const session of chronologicalFinishedSessions(league)) {
    pasoJornada(m, session, sinDecay)
    if (m.vistos.has(playerId)) history.push(m.elo.get(playerId) ?? ELO_BASE)
  }
  return history
}

/** Pico histórico de ELO de cada jugador: el valor más alto que tuvo alguna vez */
export function eloPeaks(league: League): Map<string, number> {
  const elo = new Map<string, number>()
  const peaks = new Map<string, number>()
  for (const p of league.players) peaks.set(p.id, ELO_BASE)
  for (const session of chronologicalFinishedSessions(league)) {
    playSession(session, elo)
    for (const id of session.playerIds) {
      const r = elo.get(id) ?? ELO_BASE
      if (r > (peaks.get(id) ?? ELO_BASE)) peaks.set(id, r)
    }
  }
  return peaks
}
