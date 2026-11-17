import { describe, expect, it } from 'vitest'
import type { League, Match, Player, Session, Team } from '../data/types'
import { apodoPrincipal, apodosDe, cinturones, cinturonesEnDisputa } from './apodos'

function player(id: string, invitado?: boolean): Player {
  return { id, name: id.toUpperCase(), emoji: '🎾', hue: 100, createdAt: '', invitado }
}

function team(id: string, p1: string, p2: string): Team {
  return { id, playerIds: [p1, p2], name: `Equipo ${id}`, color: 'lima' }
}

function match(id: string, a: string, b: string, winner: 'A' | 'B'): Match {
  return { id, round: 1, court: 1, teamAId: a, teamBId: b, result: { winner } }
}

function holder(l: League, id: string): string | undefined {
  return cinturones(l).find(c => c.id === id)?.holderIds[0]
}

function idsHolders(l: League, id: string): string[] {
  return cinturones(l).find(c => c.id === id)?.holderIds ?? []
}

function tituloDe(l: League, id: string): { titulo: string; caption: string } | undefined {
  const c = cinturones(l).find(x => x.id === id)
  return c === undefined ? undefined : { titulo: c.titulo, caption: c.caption }
}

/** Jornada tipo museo: A=[pa,pb] B=[pc,pd] C=[pe,pf] D=[pg,ph]; flip = D barre */
function full(id: string, date: string, flip: boolean): Session {
  const t = { A: team('A', 'pa', 'pb'), B: team('B', 'pc', 'pd'), C: team('C', 'pe', 'pf'), D: team('D', 'pg', 'ph') }
  const w = (x: 'A' | 'B') => (flip ? (x === 'A' ? 'B' : 'A') : x) as 'A' | 'B'
  const cruces: [string, string][] = [
    [t.A.id, t.B.id],
    [t.C.id, t.D.id],
    [t.A.id, t.C.id],
    [t.B.id, t.D.id],
    [t.A.id, t.D.id],
    [t.B.id, t.C.id],
  ]
  return {
    id,
    date,
    playerIds: ['pa', 'pb', 'pc', 'pd', 'pe', 'pf', 'pg', 'ph'],
    teams: Object.values(t),
    matches: cruces.map(([a, b], i) => match(`${id}-${i + 1}`, a, b, w(a === t.A.id ? 'A' : 'B'))),
    status: 'finished',
    championTeamIds: flip ? [t.D.id] : [t.A.id],
  }
}

/** A barre dos jornadas seguidas: pa y pb se llevan los cinturones serios */
function ligaBarreDos(): League {
  return {
    version: 1,
    players: ['pa', 'pb', 'pc', 'pd', 'pe', 'pf', 'pg', 'ph'].map(id => player(id)),
    sessions: [full('s1', '2026-09-14', false), full('s2', '2026-09-21', false)],
  }
}

/** A barre la primera, D barre la segunda: hay cambios de cinturón */
function ligaVolteada(): League {
  return {
    version: 1,
    players: ['pa', 'pb', 'pc', 'pd', 'pe', 'pf', 'pg', 'ph'].map(id => player(id)),
    sessions: [full('s1', '2026-09-14', false), full('s2', '2026-09-21', true)],
  }
}

/** Duelo simple [p1,p2] vs [p3,p4], con quién viene */
function cruce(id: string, date: string, winner: 'A' | 'B', presentes = ['p1', 'p2', 'p3', 'p4']): Session {
  const TA = team(`TA-${id}`, 'p1', 'p2')
  const TB = team(`TB-${id}`, 'p3', 'p4')
  return {
    id,
    date,
    playerIds: presentes,
    teams: [TA, TB],
    matches: [match(`${id}-1`, TA.id, TB.id, winner)],
    status: 'finished',
    championTeamIds: [winner === 'A' ? TA.id : TB.id],
  }
}

describe('cinturones', () => {
  it('sin jornadas todo vacante', () => {
    const l: League = { version: 1, players: ['p1', 'p2'].map(id => player(id)), sessions: [] }
    for (const c of cinturones(l)) expect(c.holderIds).toEqual([])
  })

  it('el que barre dos jornadas se queda los serios; el principal es La Dinastía', () => {
    const l = ligaBarreDos()
    expect(holder(l, 'dinastia')).toBe('pa') // pa y pb con 2 títulos: gana el id
    expect(holder(l, 'muro')).toBe('pa') // 6-0, con el piso de 6 partidos
    expect(holder(l, 'escoba')).toBe('pa') // 2 barridas
    expect(holder(l, 'llamas')).toBe('pa') // racha de 6
    // pc sufrió las dos goleadas: la peor caída en un solo lunes
    expect(holder(l, 'armstrong')).toBe('pc')
    expect(tituloDe(l, 'armstrong')!.caption).toBe('-47 en una jornada')
    // cobrador/remontador/fantasma sin dueño
    expect(holder(l, 'cobrador')).toBeUndefined()
    expect(holder(l, 'remontador')).toBeUndefined()
    expect(holder(l, 'fantasma')).toBeUndefined()
    // el apodo visible es el de mayor prestigio; detrás, todos los otros
    expect(apodoPrincipal(l, 'pa')!.id).toBe('dinastia')
    expect(apodosDe(l).get('pa')!.map(c => c.id)).toEqual(['dinastia', 'muro', 'llamas', 'escoba'])
  })

  it('la Dinastía necesita 2 títulos del mismo lado: una cada uno no alcanza', () => {
    const l = ligaVolteada() // s1 campeón A, s2 campeón D: todos con 1 título
    expect(holder(l, 'dinastia')).toBeUndefined()
  })

  it('el 100% con pocos partidos no es El Muro: es suerte', () => {
    const l: League = {
      version: 1,
      players: ['pa', 'pb', 'pc', 'pd'].map(id => player(id)),
      sessions: [full('s1', '2026-09-14', false)],
    }
    expect(holder(l, 'muro')).toBeUndefined() // pa hizo 100% pero con 3 partidos
  })

  it('el Armstrong: la peor caída en una sola jornada (perder lo que se ganó)', () => {
    const l: League = {
      version: 1,
      players: ['p1', 'p2', 'p3', 'p4'].map(id => player(id)),
      sessions: [cruce('s1', '2026-09-14', 'A'), cruce('s2', '2026-09-21', 'B')],
    }
    // p1 ganó el primero (+16) y perdió el segundo (contra más flojo: -17)
    expect(holder(l, 'armstrong')).toBe('p1')
    expect(tituloDe(l, 'armstrong')!.caption).toBe('-17 en una jornada')
  })

  it('El Cobrador: quien más venganzas cobró', () => {
    const l: League = {
      version: 1,
      players: ['p1', 'p2', 'p3', 'p4'].map(id => player(id)),
      sessions: [
        cruce('s1', '2026-09-14', 'A'),
        cruce('s2', '2026-09-21', 'A'),
        cruce('s3', '2026-09-28', 'B'), // p3 y p4 cobran contra p1 y p2: 2 cada uno
      ],
    }
    expect(holder(l, 'cobrador')).toBe('p3') // empate con p4: gana el id
    expect(tituloDe(l, 'cobrador')!.caption).toBe('2 venganzas cobradas')
  })

  it('El Fantasma es el fantasma vigente de la asistencia', () => {
    const l: League = {
      version: 1,
      players: ['p1', 'p2', 'p3', 'p4'].map(id => player(id)),
      sessions: [
        cruce('s1', '2026-09-14', 'A'),
        cruce('s2', '2026-09-21', 'A', ['p1', 'p2', 'p3']),
        cruce('s3', '2026-09-28', 'A', ['p1', 'p2', 'p3']),
      ],
    }
    expect(idsHolders(l, 'fantasma')).toEqual(['p4'])
    expect(tituloDe(l, 'fantasma')!.caption).toBe('2 lunes sin aparecer')
  })

  it('los invitados no llevan cinturones', () => {
    const l: League = {
      version: 1,
      players: ['p1', 'p2', 'p3', 'p4'].map(id => player(id, id === 'p4')),
      sessions: [
        cruce('s1', '2026-09-14', 'A'),
        cruce('s2', '2026-09-21', 'A', ['p1', 'p2', 'p3']),
        cruce('s3', '2026-09-28', 'A', ['p1', 'p2', 'p3']),
      ],
    }
    // p4 sería el fantasma, pero es invitado: el cinturón queda vacante
    expect(idsHolders(l, 'fantasma')).toEqual([])
  })
})

describe('cinturonesEnDisputa', () => {
  it('solo los cambios de dueño a dueño; el primer dueño no hace ruido', () => {
    const l = ligaVolteada()
    const cambios = cinturonesEnDisputa(l)
    expect(cambios.map(c => c.cinturon.id)).toEqual(['llamas', 'armstrong'])
    const llamas = cambios.find(c => c.cinturon.id === 'llamas')!
    expect(llamas.viejoId).toBe('pa')
    expect(llamas.nuevoId).toBe('pc')
    const armstrong = cambios.find(c => c.cinturon.id === 'armstrong')!
    expect(armstrong.viejoId).toBe('pc') // pc fue el Armstrong de la jornada 1
    expect(armstrong.nuevoId).toBe('pa')
    // dinastía: pa la tenía, tras s2 queda vacante ⇒ no es cambio de manos
    expect(cambios.some(c => c.cinturon.id === 'dinastia')).toBe(false)
    // muro nace vacante y sigue vacante (piso de partidos recién con 2 jornadas)
    expect(cambios.some(c => c.cinturon.id === 'muro')).toBe(false)
  })

  it('sin jornadas no hay disputa', () => {
    const l: League = { version: 1, players: ['p1', 'p2'].map(id => player(id)), sessions: [] }
    expect(cinturonesEnDisputa(l)).toEqual([])
  })
})
