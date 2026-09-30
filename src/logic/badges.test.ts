import { describe, expect, it } from 'vitest'
import type { League, Match, Player, Session, Team } from '../data/types'
import { isRemontada, playerBadges, sweepTeamIds } from './badges'

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

/** Jornada completa: A barre (3-0), B 2-1, C 1-2, D 0-3. Sets opcionales por partido. */
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

describe('isRemontada', () => {
  const m = (sets: NonNullable<Match['result']>['sets'], winner: 'A' | 'B') =>
    match('m', 'A', 'B', 1, { winner, sets })

  it('el ganador perdió el primer set', () => {
    expect(isRemontada(m([{ a: 4, b: 6 }, { a: 6, b: 3 }, { a: 10, b: 8 }], 'A'))).toBe(true)
    expect(isRemontada(m([{ a: 6, b: 3 }, { a: 4, b: 6 }, { a: 8, b: 10 }], 'B'))).toBe(true)
  })

  it('si ganó el primer set no es remontada (aunque pierda el segundo)', () => {
    expect(isRemontada(m([{ a: 6, b: 4 }, { a: 4, b: 6 }, { a: 10, b: 8 }], 'A'))).toBe(false)
    expect(isRemontada(m([{ a: 6, b: 2 }, { a: 6, b: 4 }], 'A'))).toBe(false)
  })

  it('sin sets cargados (modo rápido) nunca es remontada', () => {
    expect(isRemontada(match('m', 'A', 'B', 1, { winner: 'A' }))).toBe(false)
    expect(isRemontada(match('m', 'A', 'B', 1, { winner: 'A', sets: [] }))).toBe(false)
    expect(isRemontada(match('m', 'A', 'B', 1, undefined))).toBe(false)
  })
})

describe('sweepTeamIds', () => {
  it('la pareja que ganó los 3 partidos barra', () => {
    const s = fullSession('s1', '2026-09-14')
    expect(sweepTeamIds(s)).toEqual(['A'])
  })

  it('con jornada incompleta (menos de 3 resultados) no hay barrida', () => {
    const s: Session = { ...fullSession('s1', '2026-09-14'), status: 'live' }
    const parcial: Session = {
      ...s,
      matches: s.matches.map(m => (m.round === 3 ? { ...m, result: undefined } : m)),
    }
    expect(sweepTeamIds(parcial)).toEqual([])
  })
})

describe('playerBadges', () => {
  it('cuenta barrida y racha pico del que barrió', () => {
    const b = playerBadges(league([fullSession('s1', '2026-09-14')]), 'pa')
    expect(b.barridas).toBe(1)
    expect(b.bestStreak).toBe(3)
    expect(playerBadges(league([fullSession('s1', '2026-09-14')]), 'pg').bestStreak).toBe(0)
  })

  it('la racha pico sobrevive a una mala jornada posterior (la activa no)', () => {
    const l = league([
      fullSession('s2', '2026-09-21', undefined, true),
      fullSession('s1', '2026-09-14'),
    ])
    const b = playerBadges(l, 'pa')
    expect(b.bestStreak).toBe(3)
  })

  it('cuenta remontadas de la pareja ganadora (para los dos jugadores)', () => {
    // s1-1: A pierde el set 1 y lo da vuelta ⇒ remontada para pa y pb
    const sets = { 's1-1': [{ a: 4, b: 6 }, { a: 6, b: 3 }, { a: 10, b: 8 }] }
    const l = league([fullSession('s1', '2026-09-14', sets)])
    expect(playerBadges(l, 'pa').remontadas).toBe(1)
    expect(playerBadges(l, 'pb').remontadas).toBe(1)
    expect(playerBadges(l, 'pc').remontadas).toBe(0)
  })

  it('sin historial terminado no hay nada', () => {
    const l = league([fullSession('s1', '2026-09-14')])
    l.sessions[0].status = 'live'
    expect(playerBadges(l, 'pa')).toEqual({ remontadas: 0, barridas: 0, bestStreak: 0 })
  })
})
