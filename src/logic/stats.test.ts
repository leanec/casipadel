import { describe, expect, it } from 'vitest'
import type { League, Match, Player, Session, Team } from '../data/types'
import { countTitles, rankingRows, seasonStats } from './stats'
import { computeElo } from './elo'

function player(id: string): Player {
  return { id, name: id.toUpperCase(), emoji: '🎾', hue: 100, createdAt: '' }
}

function team(id: string, p1: string, p2: string): Team {
  return { id, playerIds: [p1, p2], name: `Equipo ${id}`, color: 'lima' }
}

function match(id: string, a: string, b: string, round: 1 | 2 | 3, winner: 'A' | 'B'): Match {
  return { id, round, court: 1, teamAId: a, teamBId: b, result: { winner } }
}

/**
 * Jornada completa de 4 equipos con el fixture Berger:
 * A barre (3-0, campeón), B 2-1, C 1-2, D 0-3.
 */
function fullSession(
  id: string,
  date: string,
  champion: string[] = ['A'],
  flip = false,
): Session {
  const t = {
    A: team('A', 'pa', 'pb'),
    B: team('B', 'pc', 'pd'),
    C: team('C', 'pe', 'pf'),
    D: team('D', 'pg', 'ph'),
  }
  // A vence siempre; B vence a C y D; C vence a D. flip ⇒ invierte cada resultado
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

function league(sessions: Session[], extraPlayers: Player[] = []): League {
  const ids = ['pa', 'pb', 'pc', 'pd', 'pe', 'pf', 'pg', 'ph']
  return { version: 1, players: [...ids.map(player), ...extraPlayers], sessions }
}

describe('countTitles', () => {
  it('cuenta títulos para los integrantes del equipo campeón', () => {
    const l = league([fullSession('s1', '2026-09-14')])
    expect(countTitles(l, 'pa')).toBe(1)
    expect(countTitles(l, 'pb')).toBe(1)
    expect(countTitles(l, 'pc')).toBe(0)
  })

  it('los co-campeones cuentan para ambos equipos', () => {
    const l = league([fullSession('s1', '2026-09-14', ['A', 'B'])])
    expect(countTitles(l, 'pa')).toBe(1)
    expect(countTitles(l, 'pc')).toBe(1)
    expect(countTitles(l, 'pg')).toBe(0)
  })
})

describe('seasonStats', () => {
  const l = league([fullSession('s1', '2026-09-14')])

  it('jugado/ganado/%, forma y racha del que barrió', () => {
    const s = seasonStats(l, 'pa')
    expect(s.played).toBe(3)
    expect(s.won).toBe(3)
    expect(s.winPct).toBe(1)
    expect(s.form).toEqual(['V', 'V', 'V'])
    expect(s.streak).toBe(3)
  })

  it('racha negativa para el que perdió todo', () => {
    expect(seasonStats(l, 'pg').streak).toBe(-3)
    expect(seasonStats(l, 'pg').form).toEqual(['D', 'D', 'D'])
  })

  it('sin partidos: ceros y sin división', () => {
    const nuevo = league([], [player('pz')])
    const s = seasonStats(nuevo, 'pz')
    expect(s.played).toBe(0)
    expect(s.winPct).toBe(0)
    expect(s.streak).toBe(0)
    expect(s.bestPartner).toBeUndefined()
  })

  it('la forma corta a los últimos 5', () => {
    // s1: A barre (V,V,V para pb) · s2 con flip: D barre y A pierde todo (D,D,D)
    const dos = league([fullSession('s2', '2026-09-21', ['D'], true), fullSession('s1', '2026-09-14')])
    const s = seasonStats(dos, 'pb')
    expect(s.played).toBe(6)
    expect(s.form).toEqual(['V', 'V', 'D', 'D', 'D'])
  })

  it('mejor dupla exige mínimo de partidos juntos', () => {
    const s = seasonStats(l, 'pa')
    // 3 partidos junto a pb, 100% ⇒ mejor dupla
    expect(s.bestPartner?.playerId).toBe('pb')
    expect(s.bestPartner?.played).toBe(3)
    expect(s.bestPartner?.winPct).toBe(1)
  })
})

describe('rankingRows', () => {
  it('ordena por ELO y acompaña títulos y racha', () => {
    const l = league([fullSession('s1', '2026-09-14')])
    const rows = rankingRows(l)
    const top = rows[0]
    expect(['pa', 'pb']).toContain(top.playerId)
    expect(top.elo).toBe(Math.round(computeElo(l).get(top.playerId)!))
    expect(top.titles).toBe(1)
    expect(top.streak).toBe(3)
    // los de A (1016+) arriba de los de D (984-)
    expect(rows[0].elo).toBeGreaterThan(rows[rows.length - 1].elo)
  })

  it('con una sola jornada no hay flechas de movimiento', () => {
    const l = league([fullSession('s1', '2026-09-14')])
    expect(rankingRows(l).every(r => r.movement === 0)).toBe(true)
  })

  it('con dos jornadas marca el movimiento real', () => {
    // s1: A barre. s2 (flip): D barre y A pierde todo ⇒ los de D suben, los de A caen
    const l = league([fullSession('s2', '2026-09-21', ['D'], true), fullSession('s1', '2026-09-14')])
    const rows = rankingRows(l)
    const pg = rows.find(r => r.playerId === 'pg')!
    expect(pg.movement).toBeGreaterThan(0) // venía último y subió
    const pa = rows.find(r => r.playerId === 'pa')!
    expect(pa.movement).toBeLessThan(0) // venía 1° y cayó
  })
})
