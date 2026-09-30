import type { Session, Team, TeamColor } from '../data/types'
import { pickTeamNames } from './names'
import { randInt, shuffle, uuid } from './random'

const TEAM_COLORS: TeamColor[] = ['lima', 'cian', 'magenta', 'naranja']

export interface PairHistoryEntry {
  /** Veces que la dupla compartió equipo (una por jornada) */
  count: number
  /** Ordinal cronológico de la última vez (1 = la más vieja) */
  lastOrdinal: number
}

/** Clave normalizada de la dupla: ids ordenados para que a|b === b|a */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/** Historial de duplas de todas las jornadas con equipos (terminadas o en curso) */
export function pairHistory(
  sessions: Session[],
  excludeSessionId?: string,
): Map<string, PairHistoryEntry> {
  const chrono = sessions
    .filter(s => s.id !== excludeSessionId && s.teams.length > 0)
    .slice()
    .sort((a, b) => (a.date === b.date ? (a.id < b.id ? -1 : 1) : a.date < b.date ? -1 : 1))
  const out = new Map<string, PairHistoryEntry>()
  chrono.forEach((s, i) => {
    for (const t of s.teams) {
      const [p1, p2] = t.playerIds
      if (p1 === p2) continue
      const key = pairKey(p1, p2)
      const prev = out.get(key)
      if (prev === undefined) out.set(key, { count: 1, lastOrdinal: i + 1 })
      else {
        prev.count += 1
        prev.lastOrdinal = i + 1
      }
    }
  })
  return out
}

/** Todos los emparejamientos perfectos de los ids (con 8 jugadores son 105) */
function* perfectMatchings(ids: string[]): Generator<[string, string][]> {
  if (ids.length === 0) {
    yield []
    return
  }
  const [first, ...rest] = ids
  for (let i = 0; i < rest.length; i++) {
    const remaining = rest.filter((_, j) => j !== i)
    for (const sub of perfectMatchings(remaining)) {
      yield [[first, rest[i]], ...sub]
    }
  }
}

interface MatchingScore {
  /** duplas de este matching que ya jugaron juntas */
  repeats: number
  /** total de encuentros previos acumulados */
  totalMeetings: number
  /** suma de los ordinales de la última vez (más viejo = menor) */
  freshness: number
}

function scoreMatching(
  pairs: [string, string][],
  history: Map<string, PairHistoryEntry>,
): MatchingScore {
  let repeats = 0
  let totalMeetings = 0
  let freshness = 0
  for (const [a, b] of pairs) {
    const e = history.get(pairKey(a, b))
    if (e !== undefined) {
      repeats += 1
      totalMeetings += e.count
      freshness += e.lastOrdinal
    }
  }
  return { repeats, totalMeetings, freshness }
}

function compareScore(a: MatchingScore, b: MatchingScore): number {
  if (a.repeats !== b.repeats) return a.repeats - b.repeats
  if (a.totalMeetings !== b.totalMeetings) return a.totalMeetings - b.totalMeetings
  return a.freshness - b.freshness
}

/** Mínimo de duplas repetidas alcanzable (0 ⇒ todavía hay combinaciones inéditas) */
export function minRepeats(playerIds: string[], history: Map<string, PairHistoryEntry>): number {
  let min = Number.POSITIVE_INFINITY
  for (const m of perfectMatchings(playerIds)) {
    const s = scoreMatching(m, history)
    if (s.repeats < min) min = s.repeats
  }
  return min === Number.POSITIVE_INFINITY ? 0 : min
}

/**
 * Sortea 4 parejas a partir de los 8 jugadores seleccionados.
 * Con historial elige el matching óptimo: menos duplas repetidas → menos
 * encuentros previos → revive la dupla más vieja. Empate total ⇒ azar entre
 * los óptimos (la gracia del bolillero no se pierde).
 */
export function drawTeams(
  playerIds: string[],
  history?: Map<string, PairHistoryEntry>,
): Team[] {
  if (playerIds.length !== 8) throw new Error('El sorteo necesita exactamente 8 jugadores')
  const shuffled = shuffle(playerIds)

  let pairs: [string, string][] = []
  if (history !== undefined && history.size > 0) {
    let best: MatchingScore | null = null
    let bests: [string, string][][] = []
    for (const m of perfectMatchings(shuffled)) {
      const s = scoreMatching(m, history)
      const cmp = best === null ? -1 : compareScore(s, best)
      if (cmp < 0) {
        best = s
        bests = [m]
      } else if (cmp === 0) {
        bests.push(m)
      }
    }
    pairs = bests[randInt(bests.length)]
  } else {
    for (let i = 0; i < 8; i += 2) pairs.push([shuffled[i], shuffled[i + 1]])
  }

  const names = pickTeamNames(4)
  const teams: Team[] = []
  for (let i = 0; i < 4; i++) {
    teams.push({
      id: uuid(),
      playerIds: pairs[i],
      name: names[i],
      color: TEAM_COLORS[i],
    })
  }
  return teams
}
