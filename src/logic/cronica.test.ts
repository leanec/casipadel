import { describe, expect, it } from 'vitest'
import type { League, Match, Player, Session, SetScore, Team } from '../data/types'
import { cronicaDeJornada } from './cronica'

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
  winner: 'A' | 'B',
  sets?: SetScore[],
): Match {
  return { id, round, court: 1, teamAId: a, teamBId: b, result: { winner, sets } }
}

/** Jornada de 4 con dos equipos y un partido por ronda (winner con sets opcionales) */
function duelo(
  id: string,
  date: string,
  ganador: 'A' | 'B',
  sets?: SetScore[],
  status: Session['status'] = 'finished',
): Session {
  const TA = team(`TA-${id}`, 'p1', 'p2')
  const TB = team(`TB-${id}`, 'p3', 'p4')
  return {
    id,
    date,
    playerIds: ['p1', 'p2', 'p3', 'p4'],
    teams: [TA, TB],
    matches: [match(`${id}-1`, TA.id, TB.id, 1, ganador, sets)],
    status,
    championTeamIds: [ganador === 'A' ? TA.id : TB.id],
  }
}

/** Jornada completa de 8: T1=[p1,p2] T2=[p3,p4] T3=[p5,p6] T4=[p7,p8], con sets por partido */
function jornada(
  id: string,
  date: string,
  ganadores: ('A' | 'B')[],
  setsPorPartido: (SetScore[] | undefined)[],
  championTeamIds: string[] = ['T1'],
): Session {
  const t = [team('T1', 'p1', 'p2'), team('T2', 'p3', 'p4'), team('T3', 'p5', 'p6'), team('T4', 'p7', 'p8')]
  const cruces: [number, number, 1 | 2 | 3][] = [
    [0, 1, 1],
    [2, 3, 1],
    [0, 2, 2],
    [1, 3, 2],
    [0, 3, 3],
    [1, 2, 3],
  ]
  return {
    id,
    date,
    playerIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'],
    teams: t,
    matches: cruces.map(([a, b, round], i) =>
      match(`${id}-${i + 1}`, t[a].id, t[b].id, round, ganadores[i], setsPorPartido[i]),
    ),
    status: 'finished',
    championTeamIds,
  }
}

function league(sessions: Session[]): League {
  return {
    version: 1,
    players: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'].map(player),
    sessions,
  }
}

const fechas = ['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12']

describe('cronicaDeJornada', () => {
  it('jornadas live o inexistentes no tienen crónica', () => {
    const l = league([duelo('live', fechas[0], 'A', undefined, 'live')])
    expect(cronicaDeJornada(l, 'live')).toBeUndefined()
    expect(cronicaDeJornada(l, 'no-existe')).toBeUndefined()
  })

  it('la crónica arranca por el campeón y numera la jornada', () => {
    const l = league([duelo('s1', fechas[0], 'A')])
    const c = cronicaDeJornada(l, 's1')!
    expect(c.titulo).toBe('LA CRÓNICA · J1')
    expect(c.lineas[0]).toEqual({ emoji: '👑', texto: 'La jornada fue de P1 & P2' })
  })

  it('co-campeones: la jornada terminó repartida', () => {
    const s = duelo('s1', fechas[0], 'A')
    s.championTeamIds = [s.teams[0].id, s.teams[1].id]
    const c = cronicaDeJornada(league([s]), 's1')!
    expect(c.lineas[0].texto).toBe('La jornada terminó repartida: P1 & P2 y P3 & P4')
  })

  it('la goleada y el partido del día salen de los sets cargados', () => {
    const l = league([
      jornada(
        's1',
        fechas[0],
        ['A', 'A', 'A', 'A', 'A', 'A'],
        [
          [{ a: 6, b: 0 }, { a: 6, b: 1 }], // goleada: 6-0 6-1 (T1 sobre T2)
          [{ a: 6, b: 5 }, { a: 10, b: 9 }], // apretado: T3 sobre T4
          [{ a: 6, b: 3 }, { a: 6, b: 3 }],
          [{ a: 6, b: 3 }, { a: 6, b: 3 }],
          [{ a: 6, b: 3 }, { a: 6, b: 3 }],
          [{ a: 6, b: 3 }, { a: 6, b: 3 }],
        ],
      ),
    ])
    const c = cronicaDeJornada(l, 's1')!
    const goleada = c.lineas.find(x => x.emoji === '💥')
    expect(goleada?.texto).toContain('P1 & P2 pasaron por encima de P3 & P4: 6-0 6-1')
    const apretado = c.lineas.find(x => x.emoji === '😰')
    expect(apretado?.texto).toContain('P5 & P6 sobre P7 & P8 6-5 10-9')
  })

  it('con un solo partido no hay línea de partido del día', () => {
    const c = cronicaDeJornada(league([duelo('s1', fechas[0], 'A', [{ a: 6, b: 0 }])]), 's1')!
    expect(c.lineas.some(x => x.emoji === '😰')).toBe(false)
  })

  it('la remontada no puede ser la goleada (dar vuelta no es pasar por encima)', () => {
    // único partido con sets: es remontada ⇒ sin línea 💥 aunque tenga el mayor margen
    const c = cronicaDeJornada(
      league([duelo('s1', fechas[0], 'A', [{ a: 3, b: 6 }, { a: 6, b: 1 }, { a: 10, b: 3 }])]),
      's1',
    )!
    expect(c.lineas.some(x => x.emoji === '💥')).toBe(false)
    expect(c.lineas.some(x => x.emoji === '🔄')).toBe(true)
  })

  it('la remontada: se perdió el primer set y se dio vuelta', () => {
    const l = league([
      jornada(
        's1',
        fechas[0],
        ['B', 'A', 'A', 'A', 'A', 'A'], // primer partido: gana T2 (p3 & p4)
        [
          [{ a: 6, b: 4 }, { a: 5, b: 7 }, { a: 8, b: 10 }], // T2 pierde el 1º y lo da vuelta
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
        ],
      ),
    ])
    const c = cronicaDeJornada(l, 's1')!
    const remontada = c.lineas.find(x => x.emoji === '🔄')
    expect(remontada?.texto).toContain('P3 & P4 perdieron el primer set contra P1 & P2')
  })

  it('el salto del día es el mayor ΔELO entre los que jugaron', () => {
    const l = league([
      jornada('s1', fechas[0], ['A', 'A', 'A', 'A', 'A', 'A'], Array(6).fill(undefined)),
      jornada('s2', fechas[1], ['B', 'B', 'A', 'A', 'A', 'A'], Array(6).fill(undefined)),
    ])
    const c = cronicaDeJornada(l, 's2')!
    const salto = c.lineas.find(x => x.emoji === '🚀')
    // en s2 los ganadores del primer partido suben contra favoritos
    expect(salto?.texto).toMatch(/^P[34] \+\d+, nadie subió más$/)
  })

  it('con salto positivo no hay línea de caída', () => {
    const c = cronicaDeJornada(league([duelo('s1', fechas[0], 'A')]), 's1')!
    // el campeón sube +16: hay salto, entonces no va la caída
    expect(c.lineas.some(x => x.emoji === '📉')).toBe(false)
    expect(c.lineas.some(x => x.emoji === '🚀')).toBe(true)
  })

  it('el fantasma entra en la crónica cuando la jornada lo convierte en fantasma', () => {
    const j1 = jornada('s1', fechas[0], Array(6).fill('A') as ('A' | 'B')[], Array(6).fill(undefined))
    const j2 = jornada('s2', fechas[1], Array(6).fill('A') as ('A' | 'B')[], Array(6).fill(undefined))
    const j3 = jornada('s3', fechas[2], Array(6).fill('A') as ('A' | 'B')[], Array(6).fill(undefined))
    // p4 falta j2 y j3
    j2.playerIds = j2.playerIds.filter(id => id !== 'p4')
    j3.playerIds = j3.playerIds.filter(id => id !== 'p4')
    const l = league([j1, j2, j3])
    // j1: nadie falta. j2: p4 acumula 1, todavía no es fantasma
    expect(cronicaDeJornada(l, 's1')!.lineas.some(x => x.emoji === '👻')).toBe(false)
    expect(cronicaDeJornada(l, 's2')!.lineas.some(x => x.emoji === '👻')).toBe(false)
    // j3 es la jornada que lo convierte en fantasma: la crónica lo canta
    expect(cronicaDeJornada(l, 's3')!.lineas.find(x => x.emoji === '👻')?.texto).toBe(
      'P4 suma 2 lunes sin aparecer',
    )
  })

  it('la cobranza: la venganza cumplida en la jornada entra en la crónica', () => {
    const l = league([
      duelo('s1', fechas[0], 'A'),
      duelo('s2', fechas[1], 'A'),
      duelo('s3', fechas[2], 'B'), // p3 y p4 cobran contra p1 y p2
    ])
    const c = cronicaDeJornada(l, 's3')!
    const cobranza = c.lineas.find(x => x.emoji === '🔪')
    expect(cobranza?.texto).toContain('P3 se la cobró a P1')
    expect(cobranza?.texto).toContain('(y 3 más)')
  })

  it('máximo 6 líneas: las de menor prioridad se recortan', () => {
    const l = league([
      jornada(
        's1',
        fechas[0],
        ['A', 'A', 'A', 'A', 'A', 'A'],
        [
          [{ a: 6, b: 0 }, { a: 6, b: 1 }],
          [{ a: 6, b: 5 }, { a: 10, b: 9 }],
          [{ a: 6, b: 3 }, { a: 6, b: 3 }],
          [{ a: 6, b: 3 }, { a: 6, b: 3 }],
          [{ a: 6, b: 3 }, { a: 6, b: 3 }],
          [{ a: 6, b: 3 }, { a: 6, b: 3 }],
        ],
      ),
    ])
    const c = cronicaDeJornada(l, 's1')!
    expect(c.lineas.length).toBeLessThanOrEqual(6)
  })
})
