import { describe, expect, it } from 'vitest'
import type { League, Match, Player, Session, Team } from '../data/types'
import { recordsMuseo } from './museo'
import { eloPeaks } from './elo'

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

/** Jornada completa: A barre (3-0), B 2-1, C 1-2, D 0-3. flip invierte todo. */
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

describe('recordsMuseo', () => {
  it('sin jornadas terminadas el museo está vacío', () => {
    expect(recordsMuseo(league([]))).toEqual([])
  })

  it('dos jornadas barridas por A: todos los récords caen del mismo lado', () => {
    const l = league([fullSession('s1', '2026-09-14'), fullSession('s2', '2026-09-21')])
    const byId = new Map(recordsMuseo(l).map(r => [r.id, r]))
    expect(byId.get('titulos')!.playerIds).toEqual(['pa'])
    expect(byId.get('titulos')!.valor).toBe('2 títulos')
    expect(byId.get('racha')!.playerIds).toEqual(['pa'])
    expect(byId.get('racha')!.valor).toBe('6 victorias seguidas')
    // pa y pb empatan en pico: gana el primero del orden estable
    expect(byId.get('elo')!.playerIds).toEqual(['pa'])
    expect(byId.get('elo')!.valor).toMatch(/\d+ pts/)
    // sin sets no hubo remontadas: la fila no existe
    expect(byId.has('remontadas')).toBe(false)
    expect(byId.get('barridas')!.valor).toBe('2 barridas')
    expect(byId.get('partidos')!.valor).toBe('6 partidos')
    expect(byId.get('dupla')!.playerIds).toEqual(['pa', 'pb'])
    expect(byId.get('quimica')!.playerIds).toEqual(['pg', 'ph'])
  })

  it('una remontada con sets deja su fila en el museo', () => {
    const sets = { 's1-1': [{ a: 4, b: 6 }, { a: 6, b: 3 }, { a: 10, b: 8 }] }
    const byId = new Map(recordsMuseo(league([fullSession('s1', '2026-09-14', sets)])).map(r => [r.id, r]))
    expect(byId.get('remontadas')!.playerIds).toEqual(['pa'])
    expect(byId.get('remontadas')!.valor).toBe('1 remontada')
  })

  it('la venganza más épica: cortar una racha de 3', () => {
    // (pa,pb) gana tres lunes seguidos y (pc,pd) cobra en el cuarto
    function cruce(id: string, date: string, ganador: 'A' | 'B'): Session {
      return {
        id,
        date,
        playerIds: ['pa', 'pb', 'pc', 'pd'],
        teams: [team('A', 'pa', 'pb'), team('B', 'pc', 'pd')],
        matches: [match(`${id}-1`, 'A', 'B', 1, { winner: ganador })],
        status: 'finished',
        championTeamIds: [ganador === 'A' ? 'A' : 'B'],
      }
    }
    const l = league([
      cruce('s1', '2026-09-14', 'A'),
      cruce('s2', '2026-09-21', 'A'),
      cruce('s3', '2026-09-28', 'A'),
      cruce('s4', '2026-10-05', 'B'),
    ])
    const byId = new Map(recordsMuseo(l).map(r => [r.id, r]))
    expect(byId.get('venganza')!.playerIds).toEqual(['pc'])
    expect(byId.get('venganza')!.valor).toBe('cortó una racha de 3')
  })

  it('venganzas cortando rachas de 2 no llegan al museo (épica = 3+)', () => {
    function cruce(id: string, date: string, ganador: 'A' | 'B'): Session {
      return {
        id,
        date,
        playerIds: ['pa', 'pb', 'pc', 'pd'],
        teams: [team('A', 'pa', 'pb'), team('B', 'pc', 'pd')],
        matches: [match(`${id}-1`, 'A', 'B', 1, { winner: ganador })],
        status: 'finished',
        championTeamIds: [ganador === 'A' ? 'A' : 'B'],
      }
    }
    const l = league([cruce('s1', '2026-09-14', 'A'), cruce('s2', '2026-09-21', 'B')])
    expect(recordsMuseo(l).some(r => r.id === 'venganza')).toBe(false)
  })

  it('los invitados no sacan récord (pero su ELO de paso no ensucia el resto)', () => {
    const l = league([fullSession('s1', '2026-09-14'), fullSession('s2', '2026-09-21')])
    l.players = l.players.map(p => (p.id === 'pa' ? { ...p, invitado: true } : p))
    const byId = new Map(recordsMuseo(l).map(r => [r.id, r]))
    expect(byId.get('titulos')!.playerIds).toEqual(['pb'])
    // la dupla A tiene a un invitado: la dupla del siglo pasa a B
    expect(byId.get('dupla')!.playerIds).toEqual(['pc', 'pd'])
    expect(byId.get('quimica')!.playerIds).toEqual(['pg', 'ph'])
  })

  it('el pico de ELO queda aunque después se caiga', () => {
    // s1: A barre (pico alto tras s1). s2 invertida: A pierde todo y cae, pero su pico queda
    const l = league([fullSession('s1', '2026-09-14'), fullSession('s2', '2026-09-21', undefined, true)])
    const peaks = eloPeaks(l)
    const picoA = peaks.get('pa')!
    expect(picoA).toBeGreaterThan(1000)
    // y el récord muestra el pico del ganador, no su ELO actual
    const byId = new Map(recordsMuseo(l).map(r => [r.id, r]))
    const eloRecord = byId.get('elo')!
    expect(eloRecord.valor).toBe(`${Math.round(peaks.get(eloRecord.playerIds[0])!)} pts`)
  })
})
