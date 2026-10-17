import { describe, expect, it } from 'vitest'
import type { League, Match, Player, Session, Team } from '../data/types'
import { buildPrevia } from './previa'

function player(id: string, name: string): Player {
  return { id, name, emoji: '🎾', hue: 100, createdAt: '' }
}

function team(id: string, p1: string, p2: string): Team {
  return { id, playerIds: [p1, p2], name: `Equipo ${id}`, color: 'lima' }
}

function match(id: string, a: string, b: string, winner: 'A' | 'B'): Match {
  return { id, round: 1, court: 1, teamAId: a, teamBId: b, result: { winner } }
}

const NOMBRES = {
  fede: 'Fede',
  nico: 'Nico',
  vale: 'Vale',
  cams: 'Cami',
  gonza: 'Gonza',
  lu: 'Lu',
  martu: 'Martu',
  diego: 'Diego',
} as const

const TODOS = Object.keys(NOMBRES)

/** Jornada con el fixture de siempre; winner de cada partido en orden */
function jornada(
  id: string,
  date: string,
  presentes: string[],
  winners: ('A' | 'B')[],
  status: Session['status'] = 'finished',
): Session {
  const t = [
    team('T1', 'fede', 'nico'),
    team('T2', 'vale', 'gonza'),
    team('T3', 'cams', 'lu'),
    team('T4', 'martu', 'diego'),
  ]
  const cruces: [number, number][] = [
    [0, 1],
    [2, 3],
    [0, 2],
    [1, 3],
    [0, 3],
    [1, 2],
  ]
  return {
    id,
    date,
    playerIds: presentes,
    teams: t,
    matches: cruces.map(([a, b], i) => match(`${id}-${i + 1}`, t[a].id, t[b].id, winners[i])),
    status,
    championTeamIds: ['T1'],
  }
}

function league(sessions: Session[]): League {
  return {
    version: 1,
    players: TODOS.map(id => player(id, NOMBRES[id as keyof typeof NOMBRES])),
    sessions,
  }
}

/** Tres jornadas donde A barre todas y martu falta las dos últimas */
function ligaBase(): League {
  const win = (x: 'A' | 'B') => Array(6).fill(x) as ('A' | 'B')[]
  const sinMartu = TODOS.filter(id => id !== 'martu')
  return league([
    jornada('s1', '2026-09-14', TODOS, win('A')),
    jornada('s2', '2026-09-21', sinMartu, win('A')),
    jornada('s3', '2026-09-28', sinMartu, win('A')),
  ])
}

describe('buildPrevia', () => {
  it('sin jornada en curso: se viene el lunes, sin parejas y con líneas de color', () => {
    const m = buildPrevia(ligaBase(), new Date(2026, 9, 17)) // sábado ⇒ lunes 19/10
    expect(m.live).toBe(false)
    expect(m.statusLabel).toBe('SE VIENE EL LUNES')
    expect(m.equipos).toEqual([])
    expect(m.fechaLabel).toContain('19')
    // líder, racha y fantasma (martu falló la última)
    expect(m.lineas.some(l => l.texto.includes('manda con'))).toBe(true)
    expect(m.lineas.some(l => l.texto.includes('victorias seguidas'))).toBe(true)
    expect(m.lineas.some(l => l.emoji === '👻' && l.texto.includes('Martu'))).toBe(true)
  })

  it('con jornada en curso: muestra las 4 parejas sorteadas', () => {
    const l = ligaBase()
    l.sessions.push(jornada('s4', '2026-10-12', TODOS, Array(6).fill('A') as ('A' | 'B')[], 'live'))
    const m = buildPrevia(l, new Date(2026, 9, 17))
    expect(m.live).toBe(true)
    expect(m.statusLabel).toBe('EN CANCHA HOY')
    expect(m.equipos).toHaveLength(4)
    expect(m.equipos[0].jugadores).toBe('Fede & Nico')
    expect(m.fechaLabel).toContain('12')
    // con parejas a la vista, la previa se achica a 4 líneas
    expect(m.lineas.length).toBeLessThanOrEqual(4)
  })

  it('una sola ausencia no genera línea de fantasma', () => {
    const l = league([
      jornada('s1', '2026-09-14', TODOS, Array(6).fill('A') as ('A' | 'B')[]),
      jornada('s2', '2026-09-21', TODOS.filter(id => id !== 'martu'), Array(6).fill('A') as ('A' | 'B')[]),
    ])
    const m = buildPrevia(l, new Date(2026, 9, 17))
    expect(m.lineas.some(l => l.emoji === '👻')).toBe(false)
  })

  it('sin temporada no hay líneas pero la previa existe igual', () => {
    const m = buildPrevia(league([]), new Date(2026, 9, 17))
    expect(m.lineas).toEqual([])
    expect(m.equipos).toEqual([])
    expect(m.statusLabel).toBe('SE VIENE EL LUNES')
  })
})
