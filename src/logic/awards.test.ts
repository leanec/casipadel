import { describe, expect, it } from 'vitest'
import type { League, Match, Player, Session, Team } from '../data/types'
import { seasonAwards } from './awards'

function player(id: string): Player {
  return { id, name: id.toUpperCase(), emoji: '🎾', hue: 100, createdAt: '' }
}

function team(id: string, p1: string, p2: string): Team {
  return { id, playerIds: [p1, p2], name: `Equipo ${id}`, color: 'lima' }
}

function match(
  id: string,
  a: string,
  b: string,
  round: 1 | 2 | 3,
  result: Match['result'],
): Match {
  return { id, round, court: 1, teamAId: a, teamBId: b, result }
}

/** Jornada completa: A barre (3-0, campeón), B 2-1, C 1-2, D 0-3. flip invierte todo. */
function fullSession(
  id: string,
  date: string,
  setsFor?: Record<string, NonNullable<Match['result']>['sets']>,
  flip = false,
): Session {
  const t = {
    A: team('A', 'pa', 'pb'),
    B: team('B', 'pc', 'pd'),
    C: team('C', 'pe', 'pf'),
    D: team('D', 'pg', 'ph'),
  }
  const w = (x: 'A' | 'B') => (flip ? (x === 'A' ? 'B' : 'A') : x) as 'A' | 'B'
  const mk = (mid: string, a: string, b: string, round: 1 | 2 | 3): Match =>
    match(mid, a, b, round, { winner: w('A'), sets: setsFor?.[mid] })
  return {
    id,
    date,
    playerIds: ['pa', 'pb', 'pc', 'pd', 'pe', 'pf', 'pg', 'ph'],
    teams: [t.A, t.B, t.C, t.D],
    matches: [
      mk(`${id}-1`, 'A', 'B', 1),
      mk(`${id}-2`, 'C', 'D', 1),
      mk(`${id}-3`, 'A', 'C', 2),
      mk(`${id}-4`, 'B', 'D', 2),
      mk(`${id}-5`, 'A', 'D', 3),
      mk(`${id}-6`, 'B', 'C', 3),
    ],
    status: 'finished',
    championTeamIds: flip ? ['D'] : ['A'],
  }
}

function league(sessions: Session[]): League {
  const ids = ['pa', 'pb', 'pc', 'pd', 'pe', 'pf', 'pg', 'ph']
  return { version: 1, players: ids.map(player), sessions }
}

describe('seasonAwards', () => {
  it('sin jornadas terminadas no hay premios', () => {
    expect(seasonAwards(league([]))).toEqual([])
    const s = fullSession('s1', '2026-09-14')
    s.status = 'live'
    expect(seasonAwards(league([s]))).toEqual([])
  })

  it('una jornada: campeón, corona, dupla, racha y escoba (sin sets no hay remontador)', () => {
    const l = league([fullSession('s1', '2026-09-14')])
    const awards = seasonAwards(l)
    const byId = new Map(awards.map(a => [a.id, a]))

    expect(awards.map(a => a.id)).toEqual(['campeon', 'corona', 'dupla', 'racha', 'escoba'])
    // pa y pb empatan en todo: gana el id menor (determinístico)
    expect(byId.get('campeon')!.playerIds).toEqual(['pa'])
    expect(byId.get('corona')!.playerIds).toEqual(['pa'])
    expect(byId.get('dupla')!.playerIds).toEqual(['pa', 'pb'])
    expect(byId.get('racha')!.playerIds).toEqual(['pa'])
    expect(byId.get('escoba')!.playerIds).toEqual(['pa'])
    // sin 6 partidos no se reparten Más wins ni El Casi
    expect(byId.has('mas-wins')).toBe(false)
    expect(byId.has('el-casi')).toBe(false)
  })

  it('Más wins para el que ganó todo y El Casi para el 50% justo', () => {
    // s1: A barre. s2 a medida: A barre otra vez (pa 6/6), C queda 3/6 justo (50%)
    const s1 = fullSession('s1', '2026-09-14')
    const t = {
      A: team('A', 'pa', 'pb'),
      B: team('B', 'pc', 'pd'),
      C: team('C', 'pe', 'pf'),
      D: team('D', 'pg', 'ph'),
    }
    const fixture: [string, string, 1 | 2 | 3][] = [
      ['A', 'B', 1],
      ['C', 'D', 1],
      ['A', 'C', 2],
      ['B', 'D', 2],
      ['A', 'D', 3],
      ['B', 'C', 3],
    ]
    // ganadores s2: A, C, A, D, A, C ⇒ A 3-0 · B 0-3 · C 2-1 · D 1-2
    const winners: ('A' | 'B')[] = ['A', 'A', 'A', 'B', 'A', 'B']
    const s2: Session = {
      id: 's2',
      date: '2026-09-21',
      playerIds: ['pa', 'pb', 'pc', 'pd', 'pe', 'pf', 'pg', 'ph'],
      teams: [t.A, t.B, t.C, t.D],
      matches: fixture.map(([a, b, r], i) =>
        match(`s2-${i + 1}`, a, b, r, { winner: winners[i] }),
      ),
      status: 'finished',
      championTeamIds: ['A'],
    }
    const byId = new Map(seasonAwards(league([s2, s1])).map(a => [a.id, a]))
    expect(byId.get('mas-wins')!.playerIds).toEqual(['pa'])
    expect(byId.get('mas-wins')!.detail).toContain('100%')
    expect(byId.get('el-casi')!.playerIds).toEqual(['pe'])
  })

  it('la remontada con sets le da el premio al Rey de la remontada', () => {
    const sets = { 's1-1': [{ a: 4, b: 6 }, { a: 6, b: 3 }, { a: 10, b: 8 }] }
    const l = league([fullSession('s1', '2026-09-14', sets)])
    const byId = new Map(seasonAwards(l).map(a => [a.id, a]))
    expect(byId.get('remontador')!.playerIds).toEqual(['pa'])
    expect(byId.get('remontador')!.detail).toContain('1 remontada')
  })

  it('determinístico: la misma liga da los mismos premios', () => {
    const l = league([
      fullSession('s2', '2026-09-21', undefined, true),
      fullSession('s1', '2026-09-14'),
    ])
    expect(seasonAwards(l)).toEqual(seasonAwards(l))
  })
})
