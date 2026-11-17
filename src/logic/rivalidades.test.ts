import { describe, expect, it } from 'vitest'
import type { League, Match, Player, Session, Team } from '../data/types'
import {
  RIVALIDAD_MIN,
  nemesisYVictima,
  puestoDeRivalidad,
  rivalidadDe,
  rivalidadTop,
  rivalidades,
} from './rivalidades'

function player(id: string, invitado?: boolean): Player {
  return { id, name: id.toUpperCase(), emoji: '🎾', hue: 100, createdAt: '', invitado }
}

function team(id: string, p1: string, p2: string): Team {
  return { id, playerIds: [p1, p2], name: `Equipo ${id}`, color: 'lima' }
}

function match(id: string, teamAId: string, teamBId: string, winner: 'A' | 'B'): Match {
  return { id, round: 1, court: 1, teamAId, teamBId, result: { winner } }
}

/** Jornada con un único partido: TA vs TB con el winner relativo al partido */
function duelSession(
  id: string,
  date: string,
  tA: [string, string],
  tB: [string, string],
  winner: 'A' | 'B',
  status: Session['status'] = 'finished',
): Session {
  const TA = team(`TA-${id}`, tA[0], tA[1])
  const TB = team(`TB-${id}`, tB[0], tB[1])
  return {
    id,
    date,
    playerIds: [...tA, ...tB],
    teams: [TA, TB],
    matches: [match(`${id}-1`, TA.id, TB.id, winner)],
    status,
  }
}

const fechas = [
  '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09',
  '2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07', '2026-12-14', '2026-12-21',
]

/**
 * Dos cuarteles que no se mezclan:
 * - quad1: [p1,p2] vs [p3,p4] en 6 jornadas (5-1 para TA) ⇒ 4 series de 6 cruces 5-1
 * - quad2: [p5,p1] vs [p6,p2] en 6 jornadas alternando ⇒ 4 series de 6 cruces 3-3 🔥
 * (p1-p2 son dupla en quad1 pero rivales en quad2: solo cruza lo de quad2)
 */
function ligaMixta(): League {
  const quad1: Array<'A' | 'B'> = ['A', 'A', 'A', 'A', 'B', 'A']
  const quad2: Array<'A' | 'B'> = ['A', 'B', 'A', 'B', 'A', 'B']
  const sessions = [
    ...quad1.map((w, i) => duelSession(`q1-${i}`, fechas[i], ['p1', 'p2'], ['p3', 'p4'], w)),
    ...quad2.map((w, i) => duelSession(`q2-${i}`, fechas[i + 6], ['p5', 'p1'], ['p6', 'p2'], w)),
  ]
  return {
    version: 1,
    players: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map(id => player(id)),
    sessions,
  }
}

describe('rivalidades', () => {
  it('sin jornadas terminadas no hay rivalidades', () => {
    const vacia: League = { version: 1, players: ['p1', 'p2'].map(id => player(id)), sessions: [] }
    expect(rivalidades(vacia)).toEqual([])
    const soloLive: League = {
      version: 1,
      players: ['p1', 'p2', 'p3', 'p4'].map(id => player(id)),
      sessions: [duelSession('live', fechas[0], ['p1', 'p2'], ['p3', 'p4'], 'A', 'live')],
    }
    expect(rivalidades(soloLive)).toEqual([])
  })

  it(`la rivalidad nace con ${RIVALIDAD_MIN} cruces: cuatro no alcanzan`, () => {
    const corta: League = {
      version: 1,
      players: ['p1', 'p2', 'p3', 'p4'].map(id => player(id)),
      sessions: [0, 1, 2, 3].map(i => duelSession(`s${i}`, fechas[i], ['p1', 'p2'], ['p3', 'p4'], 'A')),
    }
    expect(rivalidades(corta)).toEqual([])
  })

  it('cuenta los 4 cruces por partido con el winner relativo al teamAId', () => {
    const l = ligaMixta()
    // p1 dominó a p3 en quad1: 5 de 6 (aId = 'p1' porque 'p1' < 'p3')
    const serie = rivalidadDe(l, 'p1', 'p3')!
    expect(serie.cruzados).toBe(6)
    expect(serie.aWon).toBe(5)
    expect(serie.caliente).toBe(false)
  })

  it('la dupla no cruza: p1-p2 solo suma los rivales de quad2', () => {
    const l = ligaMixta()
    const serie = rivalidadDe(l, 'p1', 'p2')!
    expect(serie.cruzados).toBe(6)
    expect(serie.aWon).toBe(3)
    expect(serie.caliente).toBe(true)
  })

  it('orden: más cruces, desempata la serie más pareja, después la clave', () => {
    // quad2 (3-3, dif 0) antes que quad1 (5-1, dif 4) con igual cantidad de cruces
    const llaves = rivalidades(ligaMixta()).map(r => `${r.aId}|${r.bId}`)
    expect(llaves).toEqual([
      'p1|p2', 'p1|p6', 'p2|p5', 'p5|p6', // 🔥 las cuatro de quad2
      'p1|p3', 'p1|p4', 'p2|p3', 'p2|p4', // las cuatro de quad1
    ])
  })

  it('rivalidadTop es la primera del ranking', () => {
    const top = rivalidadTop(ligaMixta())!
    expect(top.aId).toBe('p1')
    expect(top.bId).toBe('p2')
    expect(top.caliente).toBe(true)
  })

  it('rivalidadDe no existe para sí mismo ni bajo el umbral, y es simétrica', () => {
    const l = ligaMixta()
    expect(rivalidadDe(l, 'p1', 'p1')).toBeUndefined()
    expect(rivalidadDe(l, 'p3', 'p5')).toBeUndefined() // nunca se cruzaron
    const invertida = rivalidadDe(l, 'p3', 'p1')!
    expect(invertida.aId).toBe('p1') // la orientación es canónica
    expect(invertida.aWon).toBe(5)
  })

  it('los invitados cruzan como cualquiera', () => {
    const l: League = {
      version: 1,
      players: ['p1', 'p2', 'p3', 'p4'].map(id => player(id, id === 'p4')),
      sessions: [0, 1, 2, 3, 4].map(i => duelSession(`s${i}`, fechas[i], ['p1', 'p2'], ['p3', 'p4'], 'A')),
    }
    expect(rivalidadDe(l, 'p1', 'p4')).toBeDefined()
  })

  it('puestoDeRivalidad: 1-based, 0 si no llega al umbral', () => {
    const l = ligaMixta()
    expect(puestoDeRivalidad(l, 'p1', 'p2')).toBe(1)
    expect(puestoDeRivalidad(l, 'p1', 'p3')).toBe(5)
    expect(puestoDeRivalidad(l, 'p3', 'p5')).toBe(0)
  })
})

describe('nemesisYVictima', () => {
  it('tu némesis es el que más te pasa por arriba; tu víctima, la que más pasás', () => {
    const l = ligaMixta()
    const p3 = nemesisYVictima(l, 'p3')
    expect(p3.nemesisId).toBe('p1') // p1 le ganó 5 de 6
    expect(p3.victimaId).toBeUndefined() // a nadie le gana la serie
    const p1 = nemesisYVictima(l, 'p1')
    expect(p1.victimaId).toBe('p3') // empatado con p4 en 5-1: gana el primero del orden
    expect(p1.nemesisId).toBeUndefined() // contra p2 va 3-3
    expect(nemesisYVictima(l, 'p6').nemesisId).toBeUndefined() // todas sus series van 3-3
  })
})
