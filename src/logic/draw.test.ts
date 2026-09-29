import { describe, expect, it } from 'vitest'
import { drawTeams } from './draw'

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
