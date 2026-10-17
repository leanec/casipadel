import { describe, expect, it } from 'vitest'
import type { League, Match, Player, Session, Team } from '../data/types'
import { asistenciaDe, estadoAsistencia } from './asistencia'

function player(id: string): Player {
  return { id, name: id.toUpperCase(), emoji: '🎾', hue: 100, createdAt: '' }
}

function team(id: string, p1: string, p2: string): Team {
  return { id, playerIds: [p1, p2], name: `Equipo ${id}`, color: 'lima' }
}

function match(id: string): Match {
  return { id, round: 1, court: 1, teamAId: 'TA', teamBId: 'TB', result: { winner: 'A' } }
}

/** Jornada mínima con la presencia dada (para ELO da igual, alcanza 1 partido) */
function session(id: string, date: string, presentes: string[], status: Session['status'] = 'finished'): Session {
  return {
    id,
    date,
    playerIds: presentes,
    teams: [team('TA', presentes[0], presentes[1] ?? presentes[0]), team('TB', 'relevo', 'relevo2')],
    matches: [match(`${id}-1`)],
    status,
  }
}

function league(sessions: Session[]): League {
  const ids = ['p1', 'p2', 'p3', 'p4']
  return { version: 1, players: ids.map(player), sessions }
}

/**
 * Presencias:      s1   s2   s3   s4
 * p1               ✓    ✓    ✓    ✓   ⇒ puntero +4
 * p2               ✓    ✓    ✓    ✗   ⇒ -1 (falló la última)
 * p3               ✓    ✓    ✗    ✓   ⇒ +1
 * p4               ✓    ✗    ✗    ✗   ⇒ fantasma -3
 */
function ligaBase(): League {
  return league([
    session('s1', '2026-09-14', ['p1', 'p2', 'p3', 'p4']),
    session('s2', '2026-09-21', ['p1', 'p2', 'p3']),
    session('s3', '2026-09-28', ['p1', 'p2']),
    session('s4', '2026-10-05', ['p1', 'p3']),
  ])
}

describe('asistenciaDe', () => {
  it('cuenta los lunes seguidos presentes hacia atrás', () => {
    const l = ligaBase()
    expect(asistenciaDe(l, 'p1')).toBe(4)
    expect(asistenciaDe(l, 'p3')).toBe(1)
  })

  it('la racha arranca desde la última jornada: el que falló la última está en negativo', () => {
    const l = ligaBase()
    expect(asistenciaDe(l, 'p2')).toBe(-1)
    expect(asistenciaDe(l, 'p4')).toBe(-3)
  })

  it('la jornada en curso no cambia la asistencia', () => {
    const l = ligaBase()
    l.sessions.push(session('s5', '2026-10-12', ['p2'], 'live'))
    expect(asistenciaDe(l, 'p1')).toBe(4)
    expect(asistenciaDe(l, 'p4')).toBe(-3)
  })

  it('sin jornadas no hay racha', () => {
    expect(asistenciaDe(league([]), 'p1')).toBe(0)
  })
})

describe('estadoAsistencia', () => {
  it('el puntero es el que viene desde más lunes; el fantasma aparece desde 2 ausencias', () => {
    const e = estadoAsistencia(ligaBase())
    expect(e.punteros).toEqual(['p1'])
    expect(e.rachaPunteros).toBe(4)
    expect(e.fantasmas).toEqual(['p4'])
    expect(e.ausencias).toBe(3)
  })

  it('punteros empatados: van todos', () => {
    const l = league([
      session('s1', '2026-09-14', ['p1', 'p2', 'p3', 'p4']),
      session('s2', '2026-09-21', ['p1', 'p2']),
    ])
    const e = estadoAsistencia(l)
    expect(e.punteros).toEqual(['p1', 'p2'])
    expect(e.rachaPunteros).toBe(2)
  })

  it('una sola ausencia no es fantasma: todos rotan', () => {
    const l = league([
      session('s1', '2026-09-14', ['p1', 'p2', 'p3', 'p4']),
      session('s2', '2026-09-21', ['p1', 'p2', 'p3']),
    ])
    const e = estadoAsistencia(l)
    expect(e.fantasmas).toEqual([])
    expect(e.ausencias).toBe(0)
    expect(e.punteros).toEqual(['p1', 'p2', 'p3'])
  })

  it('sin jornadas: nada de nada', () => {
    const e = estadoAsistencia(league([]))
    expect(e.punteros).toEqual([])
    expect(e.fantasmas).toEqual([])
  })
})
