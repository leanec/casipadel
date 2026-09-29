import type { League, Player, Session } from '../data/types'

export function getSession(league: League, id: string | undefined): Session | undefined {
  if (id === undefined) return undefined
  return league.sessions.find(s => s.id === id)
}

export function activeSession(league: League): Session | undefined {
  return league.sessions.find(s => s.status === 'live')
}

export function lastFinishedSession(league: League): Session | undefined {
  return league.sessions.find(s => s.status === 'finished')
}

export function playerMap(league: League): Map<string, Player> {
  return new Map(league.players.map(p => [p.id, p]))
}

export function playerIsUsed(league: League, playerId: string): boolean {
  return league.sessions.some(s => s.playerIds.includes(playerId))
}

const UNKNOWN: Player = { id: '?', name: '¿?', emoji: '❓', hue: 220, createdAt: '' }

export function playerOf(players: Map<string, Player>, id: string): Player {
  return players.get(id) ?? UNKNOWN
}
