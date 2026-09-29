export interface Player {
  id: string
  name: string
  emoji: string
  /** Matiz 0-360 para el degradado del avatar */
  hue: number
  createdAt: string
}

export type TeamColor = 'lima' | 'cian' | 'magenta' | 'naranja'

export interface Team {
  id: string
  playerIds: [string, string]
  /** Nombre divertido generado (regenerable) */
  name: string
  color: TeamColor
}

export interface SetScore {
  a: number
  b: number
}

export interface MatchResult {
  winner: 'A' | 'B'
  /** Sets cargados en modo detallado; el 3º es super tiebreak a 10 */
  sets?: SetScore[]
}

export interface Match {
  id: string
  round: 1 | 2 | 3
  court: 1 | 2
  teamAId: string
  teamBId: string
  result?: MatchResult
}

export type SessionStatus = 'live' | 'finished'

export interface Session {
  id: string
  /** YYYY-MM-DD */
  date: string
  playerIds: string[]
  teams: Team[]
  matches: Match[]
  status: SessionStatus
  /** Al cerrar la jornada; empate total ⇒ co-campeones */
  championTeamIds?: string[]
}

export interface League {
  version: 1
  players: Player[]
  sessions: Session[]
}
