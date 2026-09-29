import type { Team, TeamColor } from '../data/types'
import { pickTeamNames } from './names'
import { shuffle, uuid } from './random'

const TEAM_COLORS: TeamColor[] = ['lima', 'cian', 'magenta', 'naranja']

/** Sortea 4 parejas a partir de los 8 jugadores seleccionados */
export function drawTeams(playerIds: string[]): Team[] {
  if (playerIds.length !== 8) throw new Error('El sorteo necesita exactamente 8 jugadores')
  const shuffled = shuffle(playerIds)
  const names = pickTeamNames(4)
  const teams: Team[] = []
  for (let i = 0; i < 8; i += 2) {
    teams.push({
      id: uuid(),
      playerIds: [shuffled[i], shuffled[i + 1]],
      name: names[i / 2],
      color: TEAM_COLORS[i / 2],
    })
  }
  return teams
}
