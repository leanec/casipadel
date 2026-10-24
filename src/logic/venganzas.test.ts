import { describe, expect, it } from 'vitest'
import type { League, Match, Player, Session, Team } from '../data/types'
import {
  VENGANZA_UMBRAL,
  venganzaDe,
  venganzasCumplidas,
  venganzasCumplidasEn,
  venganzasEnJuego,
  venganzasPendientes,
} from './venganzas'

function player(id: string): Player {
  return { id, name: id.toUpperCase(), emoji: '🎾', hue: 100, createdAt: '' }
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

/** Cruce único (p1,p2) contra (p3,p4); winner 'B' ejercita el relativo al teamAId */
function session(
  id: string,
  date: string,
  winner: 'A' | 'B',
  status: Session['status'] = 'finished',
): Session {
  return {
    id,
    date,
    playerIds: ['p1', 'p2', 'p3', 'p4'],
    teams: [team('T1', 'p1', 'p2'), team('T2', 'p3', 'p4')],
    matches: [match(`${id}-1`, 'T1', 'T2', winner)],
    status,
    ...(status === 'finished' ? { championTeamIds: [winner === 'A' ? 'T1' : 'T2'] } : {}),
  }
}

function league(sessions: Session[], ids = ['p1', 'p2', 'p3', 'p4']): League {
  return { version: 1, players: ids.map(player), sessions }
}

describe('venganzasPendientes', () => {
  it('una sola victoria no alcanza el umbral', () => {
    expect(venganzasPendientes(league([session('s1', '2026-09-14', 'A')]))).toEqual([])
    expect(VENGANZA_UMBRAL).toBe(2)
  })

  it('dos cruces seguidos del mismo lado generan las 4 deudas del partido', () => {
    const l = league([session('s1', '2026-09-14', 'A'), session('s2', '2026-09-21', 'A')])
    // p1 y p2 le ganaron a p3 y p4 dos lunes: cada cruce individual es una deuda
    expect(venganzasPendientes(l)).toEqual([
      { dominadorId: 'p1', victimaId: 'p3', racha: 2 },
      { dominadorId: 'p1', victimaId: 'p4', racha: 2 },
      { dominadorId: 'p2', victimaId: 'p3', racha: 2 },
      { dominadorId: 'p2', victimaId: 'p4', racha: 2 },
    ])
  })

  it('la racha sigue creciendo mientras el dominador siga ganando', () => {
    const l = league([
      session('s1', '2026-09-14', 'A'),
      session('s2', '2026-09-21', 'A'),
      session('s3', '2026-09-28', 'A'),
    ])
    expect(venganzasPendientes(l).every(d => d.racha === 3)).toBe(true)
  })

  it('la deuda más larga va primero y el orden es determinístico', () => {
    // s1 y s2: p1 domina a p3 (racha 2). s3: p1/p2 contra otros → p1-p4 queda en 2,
    // pero p1-p3 sigue en 3 tras s3 con winner A
    const l = league([
      session('s1', '2026-09-14', 'A'),
      session('s2', '2026-09-21', 'A'),
      session('s3', '2026-09-28', 'A'),
    ])
    const pend = venganzasPendientes(l)
    expect(JSON.stringify(pend)).toBe(JSON.stringify(venganzasPendientes(l)))
    expect(pend[0].racha).toBeGreaterThanOrEqual(pend[pend.length - 1].racha)
  })

  it('como dupla no hay venganza', () => {
    const l = league([session('s1', '2026-09-14', 'A'), session('s2', '2026-09-21', 'A')])
    expect(venganzaDe(l, 'p1', 'p2')).toBeUndefined()
    expect(venganzaDe(l, 'p1', 'p3')).toEqual({ dominadorId: 'p1', victimaId: 'p3', racha: 2 })
    expect(venganzaDe(l, 'p3', 'p1')).toEqual({ dominadorId: 'p1', victimaId: 'p3', racha: 2 })
  })

  it('mismo jugador ⇒ sin deuda', () => {
    expect(venganzaDe(league([]), 'p1', 'p1')).toBeUndefined()
  })

  it('el invitado también domina: su deuda existe igual', () => {
    const l = league([session('s1', '2026-09-14', 'B'), session('s2', '2026-09-21', 'B')])
    l.players = l.players.map(p => (p.id === 'p3' ? { ...p, invitado: true } : p))
    expect(venganzaDe(l, 'p1', 'p3')).toEqual({ dominadorId: 'p3', victimaId: 'p1', racha: 2 })
  })

  it('partidos sin resultado y jornadas en curso no cuentan', () => {
    const sinResultado: Session = {
      ...session('s1', '2026-09-14', 'A'),
      matches: [match('s1-1', 'T1', 'T2', undefined)],
    }
    expect(venganzasPendientes(league([sinResultado, session('s2', '2026-09-21', 'A', 'live')]))).toEqual([])
  })
})

describe('venganzasCumplidas', () => {
  it('cobrar la deuda registra la venganza con la racha vencida', () => {
    const l = league([
      session('s1', '2026-09-14', 'A'),
      session('s2', '2026-09-21', 'A'),
      session('s3', '2026-09-28', 'B'), // p3 y p4 cobran
    ])
    const cumplidas = venganzasCumplidas(l)
    expect(cumplidas).toHaveLength(4)
    expect(cumplidas[0]).toEqual({
      victimaId: 'p3',
      dominadorId: 'p1',
      rachaVencida: 2,
      sessionId: 's3',
      matchId: 's3-1',
    })
    // cobrada la deuda no queda pendiente: la racha nueva arranca en 1
    expect(venganzasPendientes(l)).toEqual([])
  })

  it('ganar con racha de 1 no es venganza', () => {
    const l = league([session('s1', '2026-09-14', 'A'), session('s2', '2026-09-21', 'B')])
    expect(venganzasCumplidas(l)).toEqual([])
  })

  it('después de cobrada, el dominio puede dar vuelta', () => {
    const l = league([
      session('s1', '2026-09-14', 'A'),
      session('s2', '2026-09-21', 'A'),
      session('s3', '2026-09-28', 'B'),
      session('s4', '2026-10-05', 'B'),
    ])
    expect(venganzaDe(l, 'p1', 'p3')).toEqual({ dominadorId: 'p3', victimaId: 'p1', racha: 2 })
    expect(venganzasCumplidas(l)).toHaveLength(4)
  })

  it('dos cruces en la misma jornada también acumulan deuda', () => {
    const doble: Session = {
      id: 's1',
      date: '2026-09-14',
      playerIds: ['p1', 'p2', 'p3', 'p4'],
      teams: [team('T1', 'p1', 'p2'), team('T2', 'p3', 'p4')],
      matches: [match('s1-1', 'T1', 'T2', 'A'), match('s1-2', 'T1', 'T2', 'A')],
      status: 'finished',
      championTeamIds: ['T1'],
    }
    expect(venganzaDe(league([doble]), 'p1', 'p3')).toEqual({
      dominadorId: 'p1',
      victimaId: 'p3',
      racha: 2,
    })
  })

  it('venganzasCumplidasEn: la venganza de una jornada en curso ya cargada', () => {
    const base = league([session('s1', '2026-09-14', 'A'), session('s2', '2026-09-21', 'A')])
    // hoy: la víctima carga el resultado que salda, pero la jornada sigue abierta
    const hoy = session('s3', '2026-09-28', 'B', 'live')
    const l = { ...base, sessions: [...base.sessions, hoy] }
    // la historia oficial todavía no la registra
    expect(venganzasCumplidas(l)).toEqual([])
    // el banner del momento sí
    const aqui = venganzasCumplidasEn(l, hoy)
    expect(aqui).toHaveLength(4)
    expect(aqui[0]).toEqual({
      victimaId: 'p3',
      dominadorId: 'p1',
      rachaVencida: 2,
      sessionId: 's3',
      matchId: 's3-1',
    })
    // jornada sin resultados cargados: nada que celebrar todavía
    const vacia = { ...hoy, matches: [match('s4-1', 'T1', 'T2', undefined)] }
    expect(venganzasCumplidasEn(l, vacia)).toEqual([])
  })
})

describe('venganzasEnJuego', () => {
  it('marca el partido del sorteo donde hay deuda pendiente', () => {
    const l = league(
      [session('s1', '2026-09-14', 'A'), session('s2', '2026-09-21', 'A')],
      ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
    )
    // hoy juegan (p1,p5) contra (p3,p6): el cruce p1-p3 tiene deuda
    const hoy: Session = {
      id: 'hoy',
      date: '2026-10-05',
      playerIds: ['p1', 'p5', 'p3', 'p6'],
      teams: [team('T5', 'p1', 'p5'), team('T6', 'p3', 'p6')],
      // resultado cargado pero la jornada sigue en curso: la deuda se mide contra el historial terminado
      matches: [match('hoy-1', 'T5', 'T6', 'B')],
      status: 'live',
    }
    expect(venganzasEnJuego(l, hoy)).toEqual([
      { matchId: 'hoy-1', deudas: [{ dominadorId: 'p1', victimaId: 'p3', racha: 2 }] },
    ])
  })

  it('un partido puede llevar varias deudas a la vez', () => {
    const l = league([session('s1', '2026-09-14', 'A'), session('s2', '2026-09-21', 'A')])
    const hoy: Session = {
      id: 'hoy',
      date: '2026-10-05',
      playerIds: ['p1', 'p2', 'p3', 'p4'],
      teams: [team('T1', 'p1', 'p2'), team('T2', 'p3', 'p4')],
      matches: [match('hoy-1', 'T1', 'T2', undefined)],
      status: 'live',
    }
    expect(venganzasEnJuego(l, hoy)[0]?.deudas).toHaveLength(4)
  })

  it('sin deudas no lista ningún partido', () => {
    const hoy: Session = {
      id: 'hoy',
      date: '2026-10-05',
      playerIds: ['p1', 'p2', 'p3', 'p4'],
      teams: [team('T1', 'p1', 'p2'), team('T2', 'p3', 'p4')],
      matches: [match('hoy-1', 'T1', 'T2', undefined)],
      status: 'live',
    }
    expect(venganzasEnJuego(league([]), hoy)).toEqual([])
  })
})
