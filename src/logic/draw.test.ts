import { describe, expect, it } from 'vitest'
import type { Session } from '../data/types'
import { drawTeams, minRepeats, pairHistory, pairKey } from './draw'

describe('drawTeams', () => {
  it('arma 4 parejas disjuntas que cubren los 8 jugadores (500 corridas)', () => {
    const ids = Array.from({ length: 8 }, (_, i) => `p${i}`)
    for (let run = 0; run < 500; run++) {
      const teams = drawTeams(ids)
      const all = teams.flatMap(t => t.playerIds)
      expect(teams).toHaveLength(4)
      expect(teams.every(t => t.playerIds.length === 2)).toBe(true)
      expect(new Set(all).size).toBe(8)
      expect([...all].sort()).toEqual([...ids].sort())
      expect(new Set(teams.map(t => t.color)).size).toBe(4)
      expect(new Set(teams.map(t => t.name)).size).toBe(4)
    }
  })

  it('rechaza cantidades distintas de 8', () => {
    expect(() => drawTeams(['a', 'b'])).toThrow()
    expect(() => drawTeams(Array.from({ length: 7 }, (_, i) => `p${i}`))).toThrow()
  })
})

describe('sorteo con memoria', () => {
  const ids = Array.from({ length: 8 }, (_, i) => `p${i}`)

  function weekSession(date: string, pairs: [string, string][]): Session {
    return {
      id: date,
      date,
      playerIds: pairs.flat(),
      teams: pairs.map(([a, b], i) => ({
        id: `t${i}`,
        playerIds: [a, b],
        name: `T${i}`,
        color: 'lima',
      })),
      matches: [],
      status: 'finished',
    }
  }

  it('pairHistory cuenta encuentros y queda con el ordinal de la última vez', () => {
    // guardadas desordenadas (la app prepende las nuevas): el orden lo da la fecha
    const s2 = weekSession('2026-09-21', [
      ['p0', 'p1'],
      ['p2', 'p3'],
      ['p4', 'p5'],
      ['p6', 'p7'],
    ])
    const s1 = weekSession('2026-09-14', [
      ['p0', 'p1'],
      ['p2', 'p4'],
      ['p3', 'p6'],
      ['p5', 'p7'],
    ])
    const h = pairHistory([s2, s1])
    expect(h.get(pairKey('p0', 'p1'))).toEqual({ count: 2, lastOrdinal: 2 })
    expect(h.get(pairKey('p2', 'p4'))).toEqual({ count: 1, lastOrdinal: 1 })
    expect(h.size).toBe(7)
  })

  it('excluye la sesión indicada (para re-sorteos)', () => {
    const s1 = weekSession('2026-09-14', [
      ['p0', 'p1'],
      ['p2', 'p3'],
      ['p4', 'p5'],
      ['p6', 'p7'],
    ])
    expect(pairHistory([s1], s1.id).size).toBe(0)
    expect(pairHistory([s1], 'otra-id').size).toBe(4)
  })

  it('no repite ninguna dupla mientras queden combinaciones inéditas (50 corridas)', () => {
    const previa = weekSession('2026-09-14', [
      ['p0', 'p1'],
      ['p2', 'p3'],
      ['p4', 'p5'],
      ['p6', 'p7'],
    ])
    const h = pairHistory([previa])
    expect(minRepeats(ids, h)).toBe(0)
    for (let run = 0; run < 50; run++) {
      const teams = drawTeams(ids, h)
      for (const t of teams) {
        expect(h.has(pairKey(t.playerIds[0], t.playerIds[1]))).toBe(false)
      }
    }
  })

  it('con el historial agotado repite exactamente las duplas más viejas (factorización)', () => {
    // 1-factorización de K8 por el método del círculo (p7 fijo):
    // 7 jornadas × 4 duplas = las 28 combinaciones, cada una exactamente una vez
    const byCircle: [string, string][][] = []
    for (let r = 0; r < 7; r++) {
      const round: [string, string][] = [['p7', `p${r}`]]
      for (let k = 1; k <= 3; k++) {
        const a = (r + k) % 7
        const b = (r - k + 7) % 7
        round.push([`p${a}`, `p${b}`])
      }
      byCircle.push(round)
    }
    const sessions = byCircle.map((round, i) =>
      weekSession(`2026-09-${String(7 + i).padStart(2, '0')}`, round),
    )
    const h = pairHistory(sessions)
    expect(h.size).toBe(28)
    expect([...h.values()].every(e => e.count === 1)).toBe(true)
    expect(minRepeats(ids, h)).toBe(4)

    const teams = drawTeams(ids, h)
    const drawn = new Set(teams.map(t => pairKey(t.playerIds[0], t.playerIds[1])))
    // la única forma de minimizar la "vejez" es revivir las 4 duplas de la 1ª jornada
    expect(drawn).toEqual(new Set(byCircle[0].map(([a, b]) => pairKey(a, b))))
  })
})
