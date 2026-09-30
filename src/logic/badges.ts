import type { League, Match, Session } from '../data/types'
import { chronologicalFinishedSessions } from './elo'
import { matchesOf } from './stats'

/** 🔄 Remontada: la pareja ganadora perdió el primer set (solo con sets cargados) */
export function isRemontada(match: Match): boolean {
  const r = match.result
  if (r === undefined || r.sets === undefined || r.sets.length === 0) return false
  return r.winner === 'A' ? r.sets[0].a < r.sets[0].b : r.sets[0].b < r.sets[0].a
}

/** 🧹 Barridas del día: parejas que ganaron sus 3 partidos */
export function sweepTeamIds(session: Session): string[] {
  return session.teams
    .filter(t => {
      const played = session.matches.filter(
        m => m.result !== undefined && (m.teamAId === t.id || m.teamBId === t.id),
      )
      return (
        played.length === 3 &&
        played.every(m => m.result?.winner === (m.teamAId === t.id ? 'A' : 'B'))
      )
    })
    .map(t => t.id)
}

export interface PlayerBadges {
  remontadas: number
  barridas: number
  /** Pico histórico de victorias seguidas: un badge ganado no se pierde */
  bestStreak: number
}

export function playerBadges(league: League, playerId: string): PlayerBadges {
  let remontadas = 0
  let barridas = 0
  for (const session of chronologicalFinishedSessions(league)) {
    const mine = session.teams.find(t => t.playerIds.includes(playerId))
    if (mine === undefined) continue
    if (sweepTeamIds(session).includes(mine.id)) barridas += 1
    for (const m of session.matches) {
      if (m.result === undefined) continue
      const side = m.teamAId === mine.id ? 'A' : m.teamBId === mine.id ? 'B' : null
      if (side !== null && m.result.winner === side && isRemontada(m)) remontadas += 1
    }
  }
  let best = 0
  let current = 0
  for (const m of matchesOf(league, playerId)) {
    current = m.won ? current + 1 : 0
    if (current > best) best = current
  }
  return { remontadas, barridas, bestStreak: best }
}
