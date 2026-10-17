import { describe, expect, it } from 'vitest'
import type { League, Match, Player, Session, Team } from '../data/types'
import { headToHead } from './h2h'

function player(id: string): Player {
  return { id, name: id.toUpperCase(), emoji: '🎾', hue: 100, createdAt: '' }
}

function team(id: string, p1: string, p2: string): Team {
  return { id, playerIds: [p1, p2], name: `Equipo ${id}`, color: 'lima' }
}

function match(id: string, a: string, b: string, result: Match['result']): Match {
  return { id, round: 1, court: 1, teamAId: a, teamBId: b, result }
}

/**
 * s1: T1 (p1,p2) juega contra T2 (p3,p4) — gana 2, el 3° sin cargar.
 * s2: T3 (p1,p3) contra T4 (p2,p4) — gana T4 dos de tres.
 * s3 live: no cuenta.
 */
function league(): League {
  const s1: Session = {
    id: 's1',
    date: '2026-09-14',
    playerIds: ['p1', 'p2', 'p3', 'p4'],
    teams: [team('T1', 'p1', 'p2'), team('T2', 'p3', 'p4')],
    matches: [
      match('s1-1', 'T1', 'T2', { winner: 'A' }),
      match('s1-2', 'T1', 'T2', { winner: 'A' }),
      match('s1-3', 'T1', 'T2', undefined),
    ],
    status: 'finished',
    championTeamIds: ['T1'],
  }
  const s2: Session = {
    id: 's2',
    date: '2026-09-21',
    playerIds: ['p1', 'p2', 'p3', 'p4'],
    teams: [team('T3', 'p1', 'p3'), team('T4', 'p2', 'p4')],
    matches: [
      match('s2-1', 'T3', 'T4', { winner: 'A' }),
      match('s2-2', 'T3', 'T4', { winner: 'B' }),
      match('s2-3', 'T3', 'T4', { winner: 'B' }),
    ],
    status: 'finished',
    championTeamIds: ['T4'],
  }
  const s3: Session = {
    id: 's3',
    date: '2026-09-28',
    playerIds: ['p1', 'p2'],
    teams: [team('T5', 'p1', 'p2'), team('T6', 'p3', 'p4')],
    matches: [match('s3-1', 'T5', 'T6', { winner: 'A' })],
    status: 'live',
  }
  return { version: 1, players: ['p1', 'p2', 'p3', 'p4', 'p5'].map(player), sessions: [s1, s2, s3] }
}

describe('headToHead', () => {
  it('cuenta dupla y rivales por separado', () => {
    const l = league()
    // p1 y p2: dupla 2-0 en s1; rivales en s2, p1 ganó 1 de 3
    const h = headToHead(l, 'p1', 'p2')
    expect(h.partners).toEqual({ played: 2, won: 2 })
    expect(h.rivals).toEqual({ played: 3, aWon: 1 })
  })

  it('es simétrico en dupla y espejado en rivales', () => {
    const l = league()
    const ab = headToHead(l, 'p1', 'p2')
    const ba = headToHead(l, 'p2', 'p1')
    expect(ba.partners).toEqual(ab.partners)
    expect(ba.rivals).toEqual({ played: 3, aWon: 2 })
  })

  it('mismo par que fue dupla un día y rivales otro', () => {
    // p1 y p3: rivales 2-0 para p1 en s1, dupla 1-2 en s2
    const h = headToHead(league(), 'p1', 'p3')
    expect(h.rivals).toEqual({ played: 2, aWon: 2 })
    expect(h.partners).toEqual({ played: 3, won: 1 })
  })

  it('jugador que nunca se cruzó con el otro', () => {
    const h = headToHead(league(), 'p1', 'p5')
    expect(h.partners).toEqual({ played: 0, won: 0 })
    expect(h.rivals).toEqual({ played: 0, aWon: 0 })
  })

  it('mismo jugador ⇒ vacío', () => {
    const h = headToHead(league(), 'p1', 'p1')
    expect(h.partners).toEqual({ played: 0, won: 0 })
    expect(h.rivals).toEqual({ played: 0, aWon: 0 })
  })
})
