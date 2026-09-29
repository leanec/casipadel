import { describe, expect, it } from 'vitest'
import { TEAM_NAMES, pickTeamNames, randomTeamName } from './names'

describe('names', () => {
  it('sortea nombres sin repetir dentro del sorteo', () => {
    for (let run = 0; run < 200; run++) {
      const names = pickTeamNames(4)
      expect(names).toHaveLength(4)
      expect(new Set(names).size).toBe(4)
      for (const n of names) expect(TEAM_NAMES).toContain(n)
    }
  })

  it('evita los nombres ya usados en la jornada', () => {
    const taken = TEAM_NAMES.slice(0, TEAM_NAMES.length - 4)
    const names = pickTeamNames(4, taken)
    expect(names).toHaveLength(4)
    for (const n of names) expect(taken).not.toContain(n)
  })

  it('randomTeamName no repite los presentes', () => {
    const taken = TEAM_NAMES.slice(1)
    const name = randomTeamName(taken)
    expect(taken).not.toContain(name)
    expect(name).toBe(TEAM_NAMES[0])
  })
})
