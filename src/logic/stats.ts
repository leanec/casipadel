import type { League } from '../data/types'
import { chronologicalFinishedSessions, computeElo, ELO_BASE } from './elo'

export interface SeasonStats {
  played: number
  won: number
  winPct: number
  /** Títulos de día 👑 (co-campeones cuentan para ambos) */
  titles: number
  /** Racha activa: +N victorias seguidas, -N derrotas; 0 si no hay partidos */
  streak: number
  /** Últimos 5 partidos, el más reciente al final */
  form: ('V' | 'D')[]
  /** Mejor dupla histórica: solo parejas con ≥ MIN_DUPLA partidos juntos */
  bestPartner?: { playerId: string; played: number; won: number; winPct: number }
}

export const MIN_DUPLA = 3

export function countTitles(league: League, playerId: string): number {
  return league.sessions
    .filter(s => s.status === 'finished')
    .filter(s =>
      (s.championTeamIds ?? []).some(tid =>
        s.teams.find(t => t.id === tid)?.playerIds.includes(playerId),
      ),
    ).length
}

/** Partidos del jugador con resultado, en orden cronológico (ronda a ronda) */
export function matchesOf(league: League, playerId: string): { won: boolean; partnerId: string }[] {
  const out: { won: boolean; partnerId: string }[] = []
  for (const session of chronologicalFinishedSessions(league)) {
    const mine = session.teams.find(t => t.playerIds.includes(playerId))
    if (mine === undefined) continue
    const partnerId = mine.playerIds.find(id => id !== playerId) ?? playerId
    const isTeamA = (m: { teamAId: string; teamBId: string }) => m.teamAId === mine.id
    const played = session.matches
      .filter(m => m.result !== undefined && (m.teamAId === mine.id || m.teamBId === mine.id))
      .sort((a, b) => a.round - b.round)
    for (const match of played) {
      if (match.result === undefined) continue
      const ownSide = isTeamA(match) ? 'A' : 'B'
      out.push({ won: match.result.winner === ownSide, partnerId })
    }
  }
  return out
}

function activeStreak(seq: boolean[]): number {
  if (seq.length === 0) return 0
  const last = seq[seq.length - 1]
  let n = 0
  for (let i = seq.length - 1; i >= 0 && seq[i] === last; i--) n++
  return last ? n : -n
}

export function seasonStats(league: League, playerId: string): SeasonStats {
  const matches = matchesOf(league, playerId)
  const won = matches.filter(m => m.won).length

  let bestPartner: SeasonStats['bestPartner']
  const byPartner = new Map<string, { played: number; won: number }>()
  for (const m of matches) {
    const agg = byPartner.get(m.partnerId) ?? { played: 0, won: 0 }
    agg.played += 1
    if (m.won) agg.won += 1
    byPartner.set(m.partnerId, agg)
  }
  byPartner.forEach((agg, pid) => {
    if (agg.played < MIN_DUPLA) return
    const winPct = agg.won / agg.played
    if (
      bestPartner === undefined ||
      winPct > bestPartner.winPct ||
      (winPct === bestPartner.winPct && agg.won > bestPartner.won)
    ) {
      bestPartner = { playerId: pid, ...agg, winPct }
    }
  })

  return {
    played: matches.length,
    won,
    winPct: matches.length === 0 ? 0 : won / matches.length,
    titles: countTitles(league, playerId),
    streak: activeStreak(matches.map(m => m.won)),
    form: matches.slice(-5).map(m => (m.won ? 'V' : 'D')),
    bestPartner,
  }
}

export interface RankingRow {
  playerId: string
  elo: number
  titles: number
  streak: number
  /** Posiciones ganadas vs. el ranking antes de la última jornada terminada; 0 si no estaba */
  movement: number
}

function sortedRows(league: League): RankingRow[] {
  const elo = computeElo(league)
  return league.players
    .map(p => {
      const stats = seasonStats(league, p.id)
      return {
        playerId: p.id,
        eloRaw: elo.get(p.id) ?? ELO_BASE,
        titles: stats.titles,
        streak: stats.streak,
      }
    })
    // el orden se decide con el ELO exacto; lo que se muestra es redondeado
    .sort(
      (a, b) =>
        b.eloRaw - a.eloRaw || b.titles - a.titles || (a.playerId < b.playerId ? -1 : 1),
    )
    .map(r => ({
      playerId: r.playerId,
      elo: Math.round(r.eloRaw),
      titles: r.titles,
      streak: r.streak,
      movement: 0,
    }))
}

export function rankingRows(league: League): RankingRow[] {
  const current = sortedRows(league)
  const chrono = chronologicalFinishedSessions(league)
  // con 0 o 1 jornada terminada no hay "ranking anterior" contra cual comparar
  if (current.length === 0 || chrono.length <= 1) return current

  // ranking sin la última jornada terminada, para las flechas de movimiento
  const lastFinished = chrono[chrono.length - 1]
  const before: League = {
    ...league,
    sessions: league.sessions.filter(s => s.id !== lastFinished.id),
  }
  const prevPos = new Map(sortedRows(before).map((r, i) => [r.playerId, i + 1]))
  const currPos = new Map(current.map((r, i) => [r.playerId, i + 1]))
  return current.map(r => {
    const prev = prevPos.get(r.playerId)
    // jugador incorporado después de la última jornada: sin flecha
    return { ...r, movement: prev === undefined ? 0 : prev - (currPos.get(r.playerId) ?? prev) }
  })
}
