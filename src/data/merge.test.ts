import { describe, expect, it } from 'vitest'
import type { League, Match, Player, Session, Team } from './types'
import { mergeLeagues, mergePlayers, mergeSession, mergeSessions } from './merge'

function player(id: string, name = id): Player {
  return { id, name, emoji: '🎾', hue: 100, createdAt: '' }
}

function team(id: string, p1: string, p2: string): Team {
  return { id, playerIds: [p1, p2], name: `Equipo ${id}`, color: 'lima' }
}

function match(id: string, a: string, b: string, winner?: 'A' | 'B'): Match {
  return {
    id,
    round: 1,
    court: 1,
    teamAId: a,
    teamBId: b,
    result: winner === undefined ? undefined : { winner },
  }
}

function session(id: string, date: string, matches: Match[], overrides: Partial<Session> = {}): Session {
  return {
    id,
    date,
    playerIds: ['p1', 'p2', 'p3', 'p4'],
    teams: [team('T1', 'p1', 'p2'), team('T2', 'p3', 'p4')],
    matches,
    status: 'live',
    ...overrides,
  }
}

describe('mergePlayers', () => {
  it('unión por id; en conflicto gana el servidor; agrega los nuevos', () => {
    const local = [player('a', 'Ana local'), player('b')]
    const remote = [player('a', 'Ana servidor'), player('c')]
    const merged = mergePlayers(local, remote)
    expect(merged.map(p => p.name)).toEqual(['Ana servidor', 'b', 'c'])
  })
})

describe('mergeSession', () => {
  it('el resultado cargado le gana al vacío: A offline 1–3, B offline 4–6 ⇒ quedan los 6', () => {
    const local = session('s', '2026-09-21', [
      match('m1', 'T1', 'T2', 'A'),
      match('m2', 'T1', 'T2', 'B'),
      match('m3', 'T1', 'T2', 'A'),
      match('m4', 'T1', 'T2'),
      match('m5', 'T1', 'T2'),
      match('m6', 'T1', 'T2'),
    ])
    const remote = session('s', '2026-09-21', [
      match('m1', 'T1', 'T2'),
      match('m2', 'T1', 'T2'),
      match('m3', 'T1', 'T2'),
      match('m4', 'T1', 'T2', 'B'),
      match('m5', 'T1', 'T2', 'A'),
      match('m6', 'T1', 'T2', 'B'),
    ])
    const merged = mergeSession(local, remote)
    expect(merged.matches.filter(m => m.result !== undefined)).toHaveLength(6)
  })

  it('conflicto con ambos cargados: gana el servidor', () => {
    const local = session('s', '2026-09-21', [match('m1', 'T1', 'T2', 'A')])
    const remote = session('s', '2026-09-21', [match('m1', 'T1', 'T2', 'B')])
    expect(mergeSession(local, remote).matches[0].result?.winner).toBe('B')
  })

  it('no se "des-cierra" una jornada: gana la copia cerrada para estado y campeón', () => {
    const local = session('s', '2026-09-21', [match('m1', 'T1', 'T2', 'A')], {
      status: 'finished',
      championTeamIds: ['T1'],
    })
    const remote = session('s', '2026-09-21', [match('m1', 'T1', 'T2')], { status: 'live' })
    const merged = mergeSession(local, remote)
    expect(merged.status).toBe('finished')
    expect(merged.championTeamIds).toEqual(['T1'])
  })

  it('con más resultados del lado local, la base es la local (y el resultado local no se pierde)', () => {
    const local = session('s', '2026-09-21', [
      match('m1', 'T1', 'T2', 'A'),
      match('m2', 'T1', 'T2', 'A'),
    ])
    const remote = session('s', '2026-09-21', [match('m1', 'T1', 'T2')])
    const merged = mergeSession(local, remote)
    expect(merged.matches).toHaveLength(2)
    expect(merged.matches[0].result?.winner).toBe('A')
  })
})

describe('mergeSessions / mergeLeagues', () => {
  it('nunca se pierde una jornada: unión por id de ambos lados', () => {
    const sLocal = session('s1', '2026-09-14', [match('m1', 'T1', 'T2', 'A')], {
      status: 'finished',
      championTeamIds: ['T1'],
    })
    const sRemote = session('s2', '2026-09-21', [match('m1', 'T1', 'T2', 'B')])
    const merged = mergeSessions([sLocal], [sRemote])
    expect(merged.map(s => s.id).sort()).toEqual(['s1', 's2'])
    // la remota (2026-09-21) queda primera: orden nuevo→vieja
    expect(merged[0].id).toBe('s2')
  })

  it('mergeLeagues combina jugadores y jornadas', () => {
    const local: League = {
      version: 1,
      players: [player('a')],
      sessions: [session('s1', '2026-09-14', [match('m1', 'T1', 'T2', 'A')])],
    }
    const remote: League = {
      version: 1,
      players: [player('b')],
      sessions: [session('s2', '2026-09-21', [match('m1', 'T1', 'T2', 'B')])],
    }
    const merged = mergeLeagues(local, remote)
    expect(merged.players.map(p => p.id)).toEqual(['a', 'b'])
    expect(merged.sessions.map(s => s.id)).toEqual(['s2', 's1'])
  })

  it('una jornada eliminada (tombstone) no revive desde el otro lado', () => {
    const local: League = {
      version: 1,
      players: [player('a')],
      sessions: [],
      deletedSessionIds: ['s1'],
    }
    const remote: League = {
      version: 1,
      players: [player('a')],
      sessions: [session('s1', '2026-09-14', [match('m1', 'T1', 'T2', 'A')])],
    }
    const merged = mergeLeagues(local, remote)
    expect(merged.sessions.map(s => s.id)).toEqual([])
    expect(merged.deletedSessionIds).toEqual(['s1'])
  })

  it('los tombstones se unionan de ambos lados (jugadores y jornadas)', () => {
    const local: League = {
      version: 1,
      players: [player('a')],
      sessions: [session('s2', '2026-09-21', [])],
      deletedSessionIds: ['s1'],
      deletedPlayerIds: ['z'],
    }
    const remote: League = {
      version: 1,
      players: [player('a'), player('z'), player('y')],
      sessions: [session('s1', '2026-09-14', [])],
      deletedPlayerIds: ['y'],
    }
    const merged = mergeLeagues(local, remote)
    expect(merged.deletedSessionIds).toEqual(['s1'])
    expect(merged.deletedPlayerIds).toEqual(['y', 'z'])
    // y quedan filtrados de las listas
    expect(merged.players.map(p => p.id)).toEqual(['a'])
    expect(merged.sessions.map(s => s.id)).toEqual(['s2'])
  })

  it('sin eliminados no aparecen campos de tombstones (formato estable)', () => {
    const local: League = { version: 1, players: [player('a')], sessions: [] }
    const remote: League = { version: 1, players: [player('a')], sessions: [] }
    const merged = mergeLeagues(local, remote)
    expect(merged.deletedSessionIds).toBeUndefined()
    expect(merged.deletedPlayerIds).toBeUndefined()
  })
})
