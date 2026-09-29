import type { Match, Team } from '../data/types'

/**
 * Todos contra todos para 4 equipos en 2 canchas (tabla Berger fija).
 * Cada par de equipos se enfrenta exactamente una vez:
 *   R1: A-B (c1)  C-D (c2)
 *   R2: A-C (c1)  B-D (c2)
 *   R3: A-D (c2)  B-C (c1)
 */
export function buildFixture(teams: Team[]): Match[] {
  if (teams.length !== 4) throw new Error('El fixture necesita exactamente 4 equipos')
  const [A, B, C, D] = teams.map(t => t.id)
  const mk = (round: 1 | 2 | 3, court: 1 | 2, teamAId: string, teamBId: string): Match => ({
    id: `${teamAId}vs${teamBId}`,
    round,
    court,
    teamAId,
    teamBId,
  })
  return [
    mk(1, 1, A, B),
    mk(1, 2, C, D),
    mk(2, 1, A, C),
    mk(2, 2, B, D),
    mk(3, 1, B, C),
    mk(3, 2, A, D),
  ]
}
