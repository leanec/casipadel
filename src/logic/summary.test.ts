import { describe, expect, it } from 'vitest'
import type { League, Match, Player, Session, Team } from '../data/types'
import { buildSeasonSummary, buildSessionSummary } from './summary'

function player(id: string): Player {
  return { id, name: id.toUpperCase(), emoji: '🎾', hue: 100, createdAt: '' }
}

function team(id: string, p1: string, p2: string): Team {
  return { id, playerIds: [p1, p2], name: `Equipo ${id}`, color: 'lima' }
}

function match(id: string, a: string, b: string, round: 1 | 2 | 3, winner: 'A' | 'B', sets?: NonNullable<Match['result']>['sets']): Match {
  return { id, round, court: 1, teamAId: a, teamBId: b, result: { winner, sets } }
}

/** Jornada completa: A barre (3-0, campeón), B 2-1, C 1-2, D 0-3 */
function fullSession(id: string, date: string, champion: string[] = ['A'], flip = false): Session {
  const t = {
    A: team('A', 'pa', 'pb'),
    B: team('B', 'pc', 'pd'),
    C: team('C', 'pe', 'pf'),
    D: team('D', 'pg', 'ph'),
  }
  const w = (x: 'A' | 'B') => (flip ? (x === 'A' ? 'B' : 'A') : x) as 'A' | 'B'
  return {
    id,
    date,
    playerIds: ['pa', 'pb', 'pc', 'pd', 'pe', 'pf', 'pg', 'ph'],
    teams: [t.A, t.B, t.C, t.D],
    matches: [
      match(`${id}-1`, 'A', 'B', 1, w('A')),
      match(`${id}-2`, 'C', 'D', 1, w('A')),
      match(`${id}-3`, 'A', 'C', 2, w('A')),
      match(`${id}-4`, 'B', 'D', 2, w('A')),
      match(`${id}-5`, 'A', 'D', 3, w('A')),
      match(`${id}-6`, 'B', 'C', 3, w('A')),
    ],
    status: 'finished',
    championTeamIds: champion,
  }
}

function league(sessions: Session[]): League {
  const ids = ['pa', 'pb', 'pc', 'pd', 'pe', 'pf', 'pg', 'ph']
  return { version: 1, players: ids.map(player), sessions }
}

describe('buildSessionSummary', () => {
  const l = league([fullSession('s1', '2026-09-14')])

  it('campeón, orden de la tabla y barrida del día', () => {
    const m = buildSessionSummary(l, l.sessions[0])
    expect(m.championNames).toBe('PA & PB')
    expect(m.championTeamName).toBe('Equipo A')
    expect(m.coChampions).toBe(false)
    expect(m.rows).toHaveLength(4)
    // A barre: primero con 3-0 y la 🧹 en la fila
    expect(m.rows[0]).toMatchObject({ teamName: 'Equipo A', won: 3, lost: 0, badges: '🧹' })
    expect(m.rows[3]).toMatchObject({ won: 0, lost: 3, badges: '' })
    expect(m.badgeLines).toEqual(['🧹 Barrida · Equipo A'])
  })

  it('co-campeones: nombres y equipos unidos', () => {
    const co = league([fullSession('s1', '2026-09-14', ['A', 'B'])])
    const m = buildSessionSummary(co, co.sessions[0])
    expect(m.coChampions).toBe(true)
    expect(m.championNames).toBe('PA & PB & PC & PD')
    expect(m.championTeamName).toBe('Equipo A & Equipo B')
  })

  it('la remontada entra en los badges del día', () => {
    const s = fullSession('s1', '2026-09-14')
    s.matches[0] = match('s1-1', 'A', 'B', 1, 'A', [
      { a: 4, b: 6 },
      { a: 6, b: 3 },
      { a: 10, b: 8 },
    ])
    const m = buildSessionSummary(league([s]), s)
    expect(m.badgeLines).toContain('🔄 Remontada · Equipo A (r1)')
  })

  it('jornada sin resultados no explota', () => {
    const s: Session = {
      ...fullSession('s1', '2026-09-14'),
      status: 'live',
      championTeamIds: undefined,
      matches: fullSession('s1', '2026-09-14').matches.map(m => ({ ...m, result: undefined })),
    }
    const m = buildSessionSummary(league([s]), s)
    expect(m.championNames).toBe('')
    expect(m.rows.every(r => r.won === 0 && r.lost === 0)).toBe(true)
  })
})

describe('buildSeasonSummary', () => {
  it('top 5 ordenado por ELO con datos del jugador', () => {
    const l = league([fullSession('s1', '2026-09-14')])
    const m = buildSeasonSummary(l)
    expect(m.jornadas).toBe(1)
    expect(m.rows).toHaveLength(5)
    expect(['PA', 'PB']).toContain(m.rows[0].name)
    expect(m.rows[0].elo).toBeGreaterThan(1000)
    expect(m.rows[0].titles).toBe(1)
    expect(m.rows[4].elo).toBeLessThan(m.rows[0].elo)
  })

  it('sin jornadas terminadas no hay filas de ELO movido', () => {
    const s = fullSession('s1', '2026-09-14')
    s.status = 'live'
    const m = buildSeasonSummary(league([s]))
    expect(m.jornadas).toBe(0)
  })
})
