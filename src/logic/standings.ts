import type { Match, Team } from '../data/types'

export interface Standing {
  teamId: string
  played: number
  won: number
  lost: number
  setsWon: number
  setsLost: number
  gamesWon: number
  gamesLost: number
}

function gamesDiff(s: Standing): number {
  return s.gamesWon - s.gamesLost
}

/** Orden: partidos ganados → sets ganados → diferencia de juegos → id (determinístico) */
export function compareStandings(x: Standing, y: Standing): number {
  if (y.won !== x.won) return y.won - x.won
  if (y.setsWon !== x.setsWon) return y.setsWon - x.setsWon
  const dy = gamesDiff(y)
  const dx = gamesDiff(x)
  if (dy !== dx) return dy - dx
  return x.teamId.localeCompare(y.teamId)
}

export function computeStandings(teams: Team[], matches: Match[]): Standing[] {
  const base = new Map<string, Standing>()
  for (const t of teams) {
    base.set(t.id, {
      teamId: t.id,
      played: 0,
      won: 0,
      lost: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
    })
  }
  for (const m of matches) {
    if (m.result === undefined) continue
    const a = base.get(m.teamAId)
    const b = base.get(m.teamBId)
    if (a === undefined || b === undefined) continue
    a.played++
    b.played++
    if (m.result.winner === 'A') {
      a.won++
      b.lost++
    } else {
      b.won++
      a.lost++
    }
    for (const s of m.result.sets ?? []) {
      a.gamesWon += s.a
      a.gamesLost += s.b
      b.gamesWon += s.b
      b.gamesLost += s.a
      if (s.a > s.b) {
        a.setsWon++
        b.setsLost++
      } else if (s.b > s.a) {
        b.setsWon++
        a.setsLost++
      }
    }
  }
  return [...base.values()].sort(compareStandings)
}

/** Equipos campeones: comparten todos los criterios con el líder ⇒ co-campeones */
export function championTeamIds(teams: Team[], matches: Match[]): string[] {
  const rows = computeStandings(teams, matches)
  if (rows.length === 0) return []
  const top = rows[0]
  return rows
    .filter(r => r.won === top.won && r.setsWon === top.setsWon && gamesDiff(r) === gamesDiff(top))
    .map(r => r.teamId)
}
