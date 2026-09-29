import { describe, expect, it } from 'vitest'
import type { League, Match, Session, Team } from '../data/types'
import { computeElo, eloHistory, ELO_BASE } from './elo'

function team(id: string, p1: string, p2: string): Team {
  return { id, playerIds: [p1, p2], name: `Equipo ${id}`, color: 'lima' }
}

function match(
  id: string,
  a: string,
  b: string,
  round: 1 | 2 | 3,
  winner: 'A' | 'B',
): Match {
  return { id, round, court: 1, teamAId: a, teamBId: b, result: { winner } }
}

function session(
  id: string,
  date: string,
  teams: Team[],
  matches: Match[],
  status: 'live' | 'finished' = 'finished',
): Session {
  return { id, date, playerIds: teams.flatMap(t => t.playerIds), teams, matches, status }
}

function league(sessions: Session[]): League {
  return { version: 1, players: [], sessions }
}

describe('computeElo', () => {
  it('sin jornadas terminadas no hay ELO calculado (default 1000 en quien lo use)', () => {
    expect(computeElo(league([])).size).toBe(0)
  })

  it('las jornadas en curso no cuentan', () => {
    const t1 = team('T1', 'p1', 'p2')
    const t2 = team('T2', 'p3', 'p4')
    const s = session('s1', '2026-09-21', [t1, t2], [match('m', 'T1', 'T2', 1, 'A')], 'live')
    expect(computeElo(league([s])).size).toBe(0)
  })

  it('partidos parejos: +16 / −16 y cero-suma', () => {
    const t1 = team('T1', 'p1', 'p2')
    const t2 = team('T2', 'p3', 'p4')
    const s = session('s1', '2026-09-21', [t1, t2], [match('m', 'T1', 'T2', 1, 'A')])
    const elo = computeElo(league([s]))
    expect(elo.get('p1')).toBe(ELO_BASE + 16)
    expect(elo.get('p2')).toBe(ELO_BASE + 16)
    expect(elo.get('p3')).toBe(ELO_BASE - 16)
    expect(elo.get('p4')).toBe(ELO_BASE - 16)
    const total = [...elo.values()].reduce((a, b) => a + b, 0)
    expect(total).toBe(4 * ELO_BASE)
  })

  it('ganarle al favorito pesa más que defenderlo', () => {
    const t1 = team('T1', 'p1', 'p2')
    const t2 = team('T2', 'p3', 'p4')
    const first = session('s1', '2026-09-14', [t1, t2], [match('m', 'T1', 'T2', 1, 'A')])
    // p1/p2 quedaron en 1016 y p3/p4 en 984; ahora la pareja de abajo se recupera
    const upset = session('s2', '2026-09-21', [t1, t2], [match('m', 'T1', 'T2', 1, 'B')])
    const elo = computeElo(league([first, upset]))
    const p1 = elo.get('p1')!
    const p3 = elo.get('p3')!
    expect(p3).toBeGreaterThan(ELO_BASE) // ganancia neta pese a haber perdido la primera
    // el golpe del favorito (desde 1016) pasa de 16: la sorpresa pesa más
    expect(ELO_BASE + 16 - p1).toBeGreaterThan(16)
    // sigue siendo cero-suma
    expect([...elo.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(4 * ELO_BASE, 6)
  })

  it('procesa en orden cronológico aunque la lista venga nueva→vieja (como la app)', () => {
    const t1 = team('T1', 'p1', 'p2')
    const t2 = team('T2', 'p3', 'p4')
    const s1 = session('s1', '2026-09-14', [t1, t2], [match('m', 'T1', 'T2', 1, 'A')])
    const s2 = session('s2', '2026-09-21', [t1, t2], [match('m', 'T1', 'T2', 1, 'A')])
    const elo = computeElo(league([s2, s1])) // s2 primero, como queda tras unshift
    // segunda victoria seguida: el favorito gana menos que 16
    expect(elo.get('p1')!).toBeGreaterThan(ELO_BASE + 16)
    expect(elo.get('p1')!).toBeLessThan(ELO_BASE + 32)
    // determinista
    expect(computeElo(league([s2, s1]))).toEqual(elo)
  })
})

describe('eloHistory', () => {
  it('un punto por cada jornada terminada en la que jugó (más la base)', () => {
    const t1 = team('T1', 'p1', 'p2')
    const t2 = team('T2', 'p3', 'p4')
    const s1 = session('s1', '2026-09-14', [t1, t2], [match('m', 'T1', 'T2', 1, 'A')])
    const s2 = session('s2', '2026-09-21', [t1, t2], [match('m', 'T1', 'T2', 1, 'A')])
    expect(eloHistory(league([s2, s1]), 'p1')).toHaveLength(3)
    expect(eloHistory(league([s2, s1]), 'p1')[0]).toBe(ELO_BASE)
  })

  it('si no jugó una jornada, esa jornada no suma puntos pero sí mueve a los rivales', () => {
    const t1 = team('T1', 'p1', 'p2')
    const t2 = team('T2', 'p3', 'p4')
    const s1 = session('s1', '2026-09-14', [t1, t2], [match('m', 'T1', 'T2', 1, 'A')])
    // p1 no juega la segunda; p3/p4 evolucionan igual
    const t3 = team('T3', 'p3', 'p9')
    const t4 = team('T4', 'p8', 'p7')
    const s2 = session('s2', '2026-09-21', [t3, t4], [match('m', 'T3', 'T4', 1, 'A')])
    const history = eloHistory(league([s2, s1]), 'p1')
    expect(history).toEqual([ELO_BASE, ELO_BASE + 16])
  })
})
