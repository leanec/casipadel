import { describe, expect, it } from 'vitest'
import type { League, Match, Player, Session, Team } from '../data/types'
import { computeElo, eloHistory, ELO_BASE } from './elo'

function team(id: string, p1: string, p2: string): Team {
  return { id, playerIds: [p1, p2], name: `Equipo ${id}`, color: 'lima' }
}

function match(
  id: string,
  a: string,
  b: string,
  round: 1 | 2 | 3,
  winner: 'A' | 'B',
): Match {
  return { id, round, court: 1, teamAId: a, teamBId: b, result: { winner } }
}

function session(
  id: string,
  date: string,
  teams: Team[],
  matches: Match[],
  status: 'live' | 'finished' = 'finished',
): Session {
  return { id, date, playerIds: teams.flatMap(t => t.playerIds), teams, matches, status }
}

function league(sessions: Session[], players: Player[] = []): League {
  return { version: 1, players, sessions }
}

describe('computeElo', () => {
  it('sin jornadas terminadas no hay ELO calculado (default 1000 en quien lo use)', () => {
    expect(computeElo(league([])).size).toBe(0)
  })

  it('las jornadas en curso no cuentan', () => {
    const t1 = team('T1', 'p1', 'p2')
    const t2 = team('T2', 'p3', 'p4')
    const s = session('s1', '2026-09-21', [t1, t2], [match('m', 'T1', 'T2', 1, 'A')], 'live')
    expect(computeElo(league([s])).size).toBe(0)
  })

  it('partidos parejos: +16 / −16 y cero-suma', () => {
    const t1 = team('T1', 'p1', 'p2')
    const t2 = team('T2', 'p3', 'p4')
    const s = session('s1', '2026-09-21', [t1, t2], [match('m', 'T1', 'T2', 1, 'A')])
    const elo = computeElo(league([s]))
    expect(elo.get('p1')).toBe(ELO_BASE + 16)
    expect(elo.get('p2')).toBe(ELO_BASE + 16)
    expect(elo.get('p3')).toBe(ELO_BASE - 16)
    expect(elo.get('p4')).toBe(ELO_BASE - 16)
    const total = [...elo.values()].reduce((a, b) => a + b, 0)
    expect(total).toBe(4 * ELO_BASE)
  })

  it('ganarle al favorito pesa más que defenderlo', () => {
    const t1 = team('T1', 'p1', 'p2')
    const t2 = team('T2', 'p3', 'p4')
    const first = session('s1', '2026-09-14', [t1, t2], [match('m', 'T1', 'T2', 1, 'A')])
    // p1/p2 quedaron en 1016 y p3/p4 en 984; ahora la pareja de abajo se recupera
    const upset = session('s2', '2026-09-21', [t1, t2], [match('m', 'T1', 'T2', 1, 'B')])
    const elo = computeElo(league([first, upset]))
    const p1 = elo.get('p1')!
    const p3 = elo.get('p3')!
    expect(p3).toBeGreaterThan(ELO_BASE) // ganancia neta pese a haber perdido la primera
    // el golpe del favorito (desde 1016) pasa de 16: la sorpresa pesa más
    expect(ELO_BASE + 16 - p1).toBeGreaterThan(16)
    // sigue siendo cero-suma
    expect([...elo.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(4 * ELO_BASE, 6)
  })

  it('procesa en orden cronológico aunque la lista venga nueva→vieja (como la app)', () => {
    const t1 = team('T1', 'p1', 'p2')
    const t2 = team('T2', 'p3', 'p4')
    const s1 = session('s1', '2026-09-14', [t1, t2], [match('m', 'T1', 'T2', 1, 'A')])
    const s2 = session('s2', '2026-09-21', [t1, t2], [match('m', 'T1', 'T2', 1, 'A')])
    const elo = computeElo(league([s2, s1])) // s2 primero, como queda tras unshift
    // segunda victoria seguida: el favorito gana menos que 16
    expect(elo.get('p1')!).toBeGreaterThan(ELO_BASE + 16)
    expect(elo.get('p1')!).toBeLessThan(ELO_BASE + 32)
    // determinista
    expect(computeElo(league([s2, s1]))).toEqual(elo)
  })
})

describe('eloHistory', () => {
  it('un punto por cada jornada terminada en la que jugó (más la base)', () => {
    const t1 = team('T1', 'p1', 'p2')
    const t2 = team('T2', 'p3', 'p4')
    const s1 = session('s1', '2026-09-14', [t1, t2], [match('m', 'T1', 'T2', 1, 'A')])
    const s2 = session('s2', '2026-09-21', [t1, t2], [match('m', 'T1', 'T2', 1, 'A')])
    expect(eloHistory(league([s2, s1]), 'p1')).toHaveLength(3)
    expect(eloHistory(league([s2, s1]), 'p1')[0]).toBe(ELO_BASE)
  })

  it('si no jugó una jornada, su ELO no cambia (salvo decaimiento) pero la jornada ocupa su lugar', () => {
    const t1 = team('T1', 'p1', 'p2')
    const t2 = team('T2', 'p3', 'p4')
    const s1 = session('s1', '2026-09-14', [t1, t2], [match('m', 'T1', 'T2', 1, 'A')])
    // p1 no juega la segunda; p3/p4 evolucionan igual
    const t3 = team('T3', 'p3', 'p9')
    const t4 = team('T4', 'p8', 'p7')
    const s2 = session('s2', '2026-09-21', [t3, t4], [match('m', 'T3', 'T4', 1, 'A')])
    const history = eloHistory(league([s2, s1]), 'p1')
    // 1 falta (dentro de la gracia): la jornada entra al historial sin mover su ELO
    expect(history).toEqual([ELO_BASE, ELO_BASE + 16, ELO_BASE + 16])
  })
})

describe('decaimiento por inactividad', () => {
  const t1 = team('W1', 'p1', 'p2')
  const t2 = team('W2', 'p3', 'p4')
  const gano = session('j1', '2026-09-14', [t1, t2], [match('m1', 'W1', 'W2', 1, 'A')])
  // p1/p2 ganan la primera (+16) y después no vuelven a jugar
  const jornadaSinP1 = (id: string, date: string): Session => {
    const a = team(`A-${id}`, 'r1', 'r2')
    const b = team(`B-${id}`, 'r3', 'r4')
    return session(id, date, [a, b], [match(`m-${id}`, `A-${id}`, `B-${id}`, 1, 'A')])
  }

  it('las primeras 2 ausencias seguidas no cobran (gracia por la rotación)', () => {
    const j2 = jornadaSinP1('j2', '2026-09-21')
    const j3 = jornadaSinP1('j3', '2026-09-28')
    expect(computeElo(league([gano, j2, j3])).get('p1')).toBe(ELO_BASE + 16)
  })

  it('desde la 3ª ausencia seguida resta 10 por jornada y frena en 1000', () => {
    const j2 = jornadaSinP1('j2', '2026-09-21')
    const j3 = jornadaSinP1('j3', '2026-09-28')
    const j4 = jornadaSinP1('j4', '2026-10-05')
    const j5 = jornadaSinP1('j5', '2026-10-12')
    const elo = computeElo(league([gano, j2, j3, j4, j5]))
    expect(elo.get('p1')).toBe(ELO_BASE) // 1016 − 10 (3ª falta) − 10 (4ª, clava en 1000)
    // el drenaje se ve en la sparkline: base, jornadas post-debut una a una
    expect(eloHistory(league([gano, j2, j3, j4, j5]), 'p1')).toEqual([
      ELO_BASE,
      ELO_BASE + 16,
      ELO_BASE + 16,
      ELO_BASE + 16,
      ELO_BASE + 6,
      ELO_BASE, // 1006 − 10 clava en 1000, no baja de ahí
    ])
  })

  it('quien está debajo de 1000 no cambia: la inactividad no regala ni quita', () => {
    const j2 = jornadaSinP1('j2', '2026-09-21')
    const j3 = jornadaSinP1('j3', '2026-09-28')
    const j4 = jornadaSinP1('j4', '2026-10-05')
    const j5 = jornadaSinP1('j5', '2026-10-12')
    // p3/p4 perdieron la primera (984) y luego faltaron siempre
    const elo = computeElo(league([gano, j2, j3, j4, j5]))
    expect(elo.get('p3')).toBe(ELO_BASE - 16)
  })

  it('volver a jugar resetea el contador de ausencias', () => {
    const j2 = jornadaSinP1('j2', '2026-09-21')
    const j3 = jornadaSinP1('j3', '2026-09-28')
    const regreso = session('j4', '2026-10-05', [t1, t2], [match('m4', 'W1', 'W2', 1, 'A')])
    const j5 = jornadaSinP1('j5', '2026-10-12')
    const j6 = jornadaSinP1('j6', '2026-10-19')
    // tras volver, 2 faltas nuevas siguen dentro de la gracia
    const hastaRegreso = computeElo(league([gano, j2, j3, regreso]))
    const conFaltas = computeElo(league([gano, j2, j3, regreso, j5, j6]))
    expect(conFaltas.get('p1')).toBe(hastaRegreso.get('p1'))
  })

  it('quien todavía no debutó no decae aunque pasen jornadas', () => {
    const j1 = jornadaSinP1('x1', '2026-09-14')
    const j2 = jornadaSinP1('x2', '2026-09-21')
    const j3 = jornadaSinP1('x3', '2026-09-28')
    const j4 = jornadaSinP1('x4', '2026-10-05')
    const elo = computeElo(league([j1, j2, j3, j4]))
    expect(elo.has('p1')).toBe(false)
    expect(eloHistory(league([j1, j2, j3, j4]), 'p1')).toEqual([ELO_BASE])
  })

  it('los invitados no decaen (no se los espera)', () => {
    const jugadores: Player[] = [
      { id: 'g1', name: 'Suplente', emoji: '🧢', hue: 120, createdAt: '', invitado: true },
      { id: 'r1', name: 'R1', emoji: '🔵', hue: 200, createdAt: '' },
      { id: 'r2', name: 'R2', emoji: '🔴', hue: 20, createdAt: '' },
      { id: 'r3', name: 'R3', emoji: '🟢', hue: 100, createdAt: '' },
      { id: 'r4', name: 'R4', emoji: '🟡', hue: 60, createdAt: '' },
    ]
    const ga = team('GA', 'g1', 'r1')
    const gb = team('GB', 'r2', 'r3')
    const ganoInvitado = session('i1', '2026-09-14', [ga, gb], [match('mi', 'GA', 'GB', 1, 'A')])
    const j2 = jornadaSinP1('i2', '2026-09-21')
    const j3 = jornadaSinP1('i3', '2026-09-28')
    const j4 = jornadaSinP1('i4', '2026-10-05')
    const j5 = jornadaSinP1('i5', '2026-10-12')
    expect(computeElo(league([ganoInvitado, j2, j3, j4, j5], jugadores)).get('g1')).toBe(
      ELO_BASE + 16,
    )
  })
})
