import { describe, expect, it } from 'vitest'
import type { Team, TeamColor } from '../data/types'
import { buildFixture } from './fixture'

const COLORS: TeamColor[] = ['lima', 'cian', 'magenta', 'naranja']

function makeTeams(): Team[] {
  return ['A', 'B', 'C', 'D'].map((label, i) => ({
    id: label,
    playerIds: [`p${i * 2}`, `p${i * 2 + 1}`],
    name: `Equipo ${label}`,
    color: COLORS[i],
  }))
}

describe('buildFixture', () => {
  const matches = buildFixture(makeTeams())

  it('genera 6 partidos', () => {
    expect(matches).toHaveLength(6)
  })

  it('cada par de equipos se enfrenta exactamente una vez', () => {
    const pairs = matches.map(m => [m.teamAId, m.teamBId].sort().join(''))
    expect(new Set(pairs).size).toBe(6)
    expect(pairs.sort()).toEqual(['AB', 'AC', 'AD', 'BC', 'BD', 'CD'])
  })

  it('cada ronda tiene 2 partidos, uno por cancha', () => {
    for (const round of [1, 2, 3] as const) {
      const roundMatches = matches.filter(m => m.round === round)
      expect(roundMatches).toHaveLength(2)
      expect(new Set(roundMatches.map(m => m.court)).size).toBe(2)
    }
  })

  it('necesita exactamente 4 equipos', () => {
    expect(() => buildFixture(makeTeams().slice(0, 3))).toThrow()
  })
})
