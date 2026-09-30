import { describe, expect, it } from 'vitest'
import { validateMatchSets, validateSetScore, winnerFromSets } from './results'

describe('validateSetScore', () => {
  it('acepta sets normales y 7-5 / 7-6', () => {
    expect(validateSetScore({ a: 6, b: 4 }, false)).toBeNull()
    expect(validateSetScore({ a: 6, b: 0 }, false)).toBeNull()
    expect(validateSetScore({ a: 7, b: 5 }, false)).toBeNull()
    expect(validateSetScore({ a: 7, b: 6 }, false)).toBeNull()
    expect(validateSetScore({ a: 4, b: 6 }, false)).toBeNull()
  })

  it('rechaza empates y marcadores imposibles', () => {
    expect(validateSetScore({ a: 6, b: 6 }, false)).not.toBeNull()
    expect(validateSetScore({ a: 6, b: 5 }, false)).not.toBeNull()
    expect(validateSetScore({ a: 7, b: 4 }, false)).not.toBeNull()
    expect(validateSetScore({ a: 5, b: 3 }, false)).not.toBeNull()
    expect(validateSetScore({ a: 8, b: 6 }, false)).not.toBeNull()
  })

  it('super tiebreak: se gana con 10 y el rival no pasa de 9', () => {
    expect(validateSetScore({ a: 10, b: 8 }, true)).toBeNull()
    expect(validateSetScore({ a: 10, b: 0 }, true)).toBeNull()
    expect(validateSetScore({ a: 11, b: 9 }, true)).not.toBeNull()
    expect(validateSetScore({ a: 10, b: 10 }, true)).not.toBeNull()
    expect(validateSetScore({ a: 9, b: 7 }, true)).not.toBeNull()
  })
})

describe('winnerFromSets', () => {
  it('devuelve quién lleva más sets o null si están iguales', () => {
    expect(winnerFromSets([{ a: 6, b: 4 }, { a: 6, b: 2 }])).toBe('A')
    expect(winnerFromSets([{ a: 3, b: 6 }, { a: 6, b: 2 }, { a: 2, b: 10 }])).toBe('B')
    expect(winnerFromSets([{ a: 6, b: 4 }, { a: 4, b: 6 }])).toBeNull()
  })
})

describe('validateMatchSets', () => {
  it('acepta 2 sets decisivos y 2 + tiebreak', () => {
    expect(
      validateMatchSets([
        { a: 6, b: 4 },
        { a: 6, b: 2 },
      ]),
    ).toBeNull()
    expect(
      validateMatchSets([
        { a: 6, b: 4 },
        { a: 4, b: 6 },
        { a: 10, b: 8 },
      ]),
    ).toBeNull()
  })

  it('acepta partido corto de 1 solo set', () => {
    expect(validateMatchSets([{ a: 6, b: 4 }])).toBeNull()
    expect(validateMatchSets([{ a: 3, b: 6 }])).toBeNull()
    expect(winnerFromSets([{ a: 6, b: 4 }])).toBe('A')
    expect(winnerFromSets([{ a: 3, b: 6 }])).toBe('B')
  })

  it('rechaza 1 set inválido', () => {
    expect(validateMatchSets([{ a: 6, b: 6 }])).not.toBeNull()
    expect(validateMatchSets([{ a: 5, b: 3 }])).not.toBeNull()
  })

  it('rechaza 1-1 sin tiebreak', () => {
    expect(
      validateMatchSets([
        { a: 6, b: 4 },
        { a: 4, b: 6 },
      ]),
    ).not.toBeNull()
  })

  it('rechaza tiebreak cuando ya había 2-0', () => {
    expect(
      validateMatchSets([
        { a: 6, b: 4 },
        { a: 6, b: 2 },
        { a: 10, b: 8 },
      ]),
    ).not.toBeNull()
  })
})
