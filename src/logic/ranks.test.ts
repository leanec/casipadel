import { describe, expect, it } from 'vitest'
import { RANKS, nextRank, rankOf, rankProgress } from './ranks'

describe('Casi Rangos', () => {
  it('cortes exactos de cada rango', () => {
    expect(rankOf(0).id).toBe('principiante')
    expect(rankOf(919).id).toBe('principiante')
    expect(rankOf(920).id).toBe('promesa')
    expect(rankOf(969).id).toBe('promesa')
    expect(rankOf(970).id).toBe('titular')
    expect(rankOf(1029).id).toBe('titular')
    expect(rankOf(1030).id).toBe('crack')
    expect(rankOf(1079).id).toBe('crack')
    expect(rankOf(1080).id).toBe('leyenda')
    expect(rankOf(2000).id).toBe('leyenda')
  })

  it('el ELO base (1000) cae en el rango central', () => {
    expect(rankOf(1000).id).toBe('titular')
  })

  it('progreso dentro del rango, lleno en la cima', () => {
    expect(rankProgress(920)).toBe(0)
    // 945 está a mitad de camino entre 920 y 970
    expect(rankProgress(945)).toBeCloseTo(0.5)
    expect(rankProgress(969)).toBeLessThan(1)
    expect(rankProgress(1080)).toBe(1)
    expect(rankProgress(1500)).toBe(1)
  })

  it('nextRank: sin siguiente en Casi Leyenda', () => {
    expect(nextRank(1079)?.id).toBe('leyenda')
    expect(nextRank(1080)).toBeUndefined()
  })

  it('la escala es creciente y cubre cualquier ELO', () => {
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].min).toBeGreaterThan(RANKS[i - 1].min)
    }
    expect(rankOf(-100).id).toBe('principiante')
  })
})
