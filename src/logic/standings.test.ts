import { describe, expect, it } from 'vitest'
import type { Match, MatchResult, Team, TeamColor } from '../data/types'
import { championTeamIds, computeStandings } from './standings'

const COLORS: TeamColor[] = ['lima', 'cian', 'magenta', 'naranja']

function team(id: string): Team {
  const i = 'ABCD'.indexOf(id)
  return {
    id,
    playerIds: [`${id}1`, `${id}2`],
    name: `Equipo ${id}`,
    color: COLORS[i >= 0 ? i : 0],
  }
}

/**
 * winner es posicional: 'A' gana el primer equipo del partido,
 * 'B' gana el segundo.
 */
function match(a: string, b: string, result?: MatchResult): Match {
  return {
    id: `${a}vs${b}`,
    round: 1,
    court: 1,
    teamAId: a,
    teamBId: b,
    result,
  }
}

describe('computeStandings', () => {
  it('ordena por partidos, luego sets, luego diferencia de juegos', () => {
    const teams = [team('A'), team('B'), team('C'), team('D')]
    const matches = [
      match('A', 'B', { winner: 'A', sets: [{ a: 6, b: 0 }, { a: 6, b: 0 }] }), // A 2 sets +12
      match('A', 'C', { winner: 'A', sets: [{ a: 6, b: 4 }, { a: 6, b: 4 }] }), // A +8
      match('A', 'D', { winner: 'B', sets: [{ a: 4, b: 6 }, { a: 4, b: 6 }] }), // D 2 sets
      match('B', 'C', { winner: 'A', sets: [{ a: 6, b: 2 }, { a: 6, b: 2 }] }), // B +8
      match('B', 'D', { winner: 'A' }),
      match('C', 'D', { winner: 'A' }),
    ]
    // A y B 2 victorias con 4 sets; juegos A +16 > B +8; luego D (1 v, 2 sets) y C (1 v, 0 sets)
    const order = computeStandings(teams, matches).map(r => r.teamId)
    expect(order).toEqual(['A', 'B', 'D', 'C'])
  })

  it('cuenta partidos jugados y games a favor/contra', () => {
    const teams = [team('A'), team('B'), team('C'), team('D')]
    const matches = [
      match('A', 'B', { winner: 'A', sets: [{ a: 6, b: 4 }, { a: 3, b: 6 }, { a: 10, b: 5 }] }),
    ]
    const rows = computeStandings(teams, matches)
    const a = rows.find(r => r.teamId === 'A')
    const b = rows.find(r => r.teamId === 'B')
    expect(a?.played).toBe(1)
    expect(a?.won).toBe(1)
    expect(a?.setsWon).toBe(2)
    expect(a?.setsLost).toBe(1)
    expect(a?.gamesWon).toBe(19)
    expect(a?.gamesLost).toBe(15)
    expect(b?.lost).toBe(1)
  })

  it('los partidos sin resultado no cuentan', () => {
    const teams = [team('A'), team('B'), team('C'), team('D')]
    const rows = computeStandings(teams, [match('A', 'B')])
    expect(rows.every(r => r.played === 0)).toBe(true)
  })
})

describe('championTeamIds', () => {
  it('empate total en la cima ⇒ co-campeones', () => {
    const teams = [team('A'), team('B'), team('C'), team('D')]
    const matches = [
      match('A', 'B', { winner: 'A' }), // A vence a B
      match('A', 'C', { winner: 'A' }), // A vence a C
      match('A', 'D', { winner: 'B' }), // D vence a A
      match('B', 'C', { winner: 'A' }), // B vence a C
      match('B', 'D', { winner: 'A' }), // B vence a D
      match('C', 'D', { winner: 'A' }), // C vence a D
    ]
    // A y B: 2 victorias, 0 sets, 0 diferencia ⇒ co-campeones
    expect(championTeamIds(teams, matches).sort()).toEqual(['A', 'B'])
  })

  it('campeón único cuando hay desempate por juegos', () => {
    const teams = [team('A'), team('B'), team('C'), team('D')]
    const matches = [
      match('A', 'B', { winner: 'A', sets: [{ a: 6, b: 4 }, { a: 6, b: 4 }] }),
      match('A', 'C', { winner: 'A', sets: [{ a: 6, b: 3 }, { a: 6, b: 3 }] }),
      match('A', 'D', { winner: 'B', sets: [{ a: 4, b: 6 }, { a: 4, b: 6 }] }), // D vence a A
      match('B', 'C', { winner: 'A', sets: [{ a: 6, b: 0 }, { a: 6, b: 0 }] }),
      match('B', 'D', { winner: 'A', sets: [{ a: 6, b: 0 }, { a: 6, b: 0 }] }),
      match('C', 'D', { winner: 'A' }), // C vence a D
    ]
    // A y B: 2 victorias y 4 sets; juegos: B +20 > A +6 ⇒ campeón B
    expect(championTeamIds(teams, matches)).toEqual(['B'])
  })
})
