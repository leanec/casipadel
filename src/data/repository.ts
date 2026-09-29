import type { League } from './types'

/**
 * Abstracción de persistencia: en Fase 1 es localStorage;
 * en Fase 2 se implementa un adaptador Supabase sin tocar la app.
 */
export interface LeagueRepository {
  load(): Promise<League>
  save(league: League): Promise<void>
}

export function freshLeague(): League {
  return { version: 1, players: [], sessions: [] }
}
