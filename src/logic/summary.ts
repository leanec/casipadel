import type { League, Session } from '../data/types'
import { formatLongDate } from './dates'
import { playerMap } from './selectors'
import { computeStandings } from './standings'
import { rankingRows } from './stats'
import { isRemontada, sweepTeamIds } from './badges'

/**
 * Modelos puros para las imágenes compartibles: todo lo que se ve en el canvas
 * se decide acá (testeable); `src/share/render.ts` solo dibuja.
 */

export interface SessionSummaryRow {
  teamName: string
  playerNames: string
  won: number
  lost: number
  /** emojis de badges del día para esta pareja (🧹) */
  badges: string
}

export interface SessionSummaryModel {
  dateLabel: string
  coChampions: boolean
  championTeamName: string
  championNames: string
  rows: SessionSummaryRow[]
  badgeLines: string[]
}

export function buildSessionSummary(league: League, session: Session): SessionSummaryModel {
  const players = playerMap(league)
  const champions = (session.championTeamIds ?? [])
    .flatMap(id => {
      const t = session.teams.find(team => team.id === id)
      return t !== undefined ? [t] : []
    })
  const sweeps = new Set(sweepTeamIds(session))

  const rows = computeStandings(session.teams, session.matches).map(standing => {
    const team = session.teams.find(t => t.id === standing.teamId)
    return {
      teamName: team?.name ?? '?',
      playerNames:
        team?.playerIds.map(id => players.get(id)?.name ?? '?').join(' & ') ?? '?',
      won: standing.won,
      lost: standing.lost,
      badges: team !== undefined && sweeps.has(team.id) ? '🧹' : '',
    }
  })

  const badgeLines: string[] = []
  for (const t of session.teams) {
    if (sweeps.has(t.id)) badgeLines.push(`🧹 Barrida · ${t.name}`)
  }
  for (const m of session.matches) {
    if (!isRemontada(m)) continue
    const winnerId = m.result?.winner === 'A' ? m.teamAId : m.teamBId
    const team = session.teams.find(t => t.id === winnerId)
    if (team !== undefined) badgeLines.push(`🔄 Remontada · ${team.name} (r${m.round})`)
  }

  return {
    dateLabel: formatLongDate(session.date),
    coChampions: champions.length > 1,
    championTeamName: champions.map(t => t.name).join(' & '),
    championNames: champions
      .flatMap(t => t.playerIds.map(id => players.get(id)?.name ?? '?'))
      .join(' & '),
    rows,
    badgeLines,
  }
}

export interface DayTableRow {
  pos: number
  teamName: string
  playerNames: string
  played: number
  won: number
  lost: number
  /** "4-2" en sets ganados-perdidos */
  sets: string
  /** Diferencia de juegos */
  diff: number
  /** emoji de badge de la pareja (🧹) */
  badges: string
}

export interface DayTableModel {
  dateLabel: string
  live: boolean
  /** "EN CURSO · 3/6" o "JORNADA FINAL" */
  statusLabel: string
  rows: DayTableRow[]
}

export function buildDayTable(league: League, session: Session): DayTableModel {
  const players = playerMap(league)
  const sweeps = new Set(sweepTeamIds(session))
  const played = session.matches.filter(m => m.result !== undefined).length
  return {
    dateLabel: formatLongDate(session.date),
    live: session.status === 'live',
    statusLabel:
      session.status === 'live'
        ? `EN CURSO · ${played}/${session.matches.length}`
        : 'JORNADA FINAL',
    rows: computeStandings(session.teams, session.matches).map((standing, i) => {
      const team = session.teams.find(t => t.id === standing.teamId)
      return {
        pos: i + 1,
        teamName: team?.name ?? '?',
        playerNames:
          team?.playerIds.map(id => players.get(id)?.name ?? '?').join(' & ') ?? '?',
        played: standing.played,
        won: standing.won,
        lost: standing.lost,
        sets: `${standing.setsWon}-${standing.setsLost}`,
        diff: standing.gamesWon - standing.gamesLost,
        badges: team !== undefined && sweeps.has(team.id) ? '🧹' : '',
      }
    }),
  }
}

export interface SeasonSummaryRow {
  pos: number
  name: string
  emoji: string
  hue: number
  elo: number
  titles: number
  streak: number
}

export interface SeasonSummaryModel {
  jornadas: number
  rows: SeasonSummaryRow[]
}

export function buildSeasonSummary(league: League): SeasonSummaryModel {
  const players = playerMap(league)
  return {
    jornadas: league.sessions.filter(s => s.status === 'finished').length,
    rows: rankingRows(league)
      .slice(0, 5)
      .map((r, i) => ({
        pos: i + 1,
        name: players.get(r.playerId)?.name ?? '?',
        emoji: players.get(r.playerId)?.emoji ?? '🎾',
        hue: players.get(r.playerId)?.hue ?? 220,
        elo: r.elo,
        titles: r.titles,
        streak: r.streak,
      })),
  }
}
