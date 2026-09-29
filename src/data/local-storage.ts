import { freshLeague, type LeagueRepository } from './repository'
import type { League } from './types'

const STORAGE_KEY = 'casi-padel:v1'

function looksLikeLeague(value: unknown): value is League {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return v.version === 1 && Array.isArray(v.players) && Array.isArray(v.sessions)
}

class LocalStorageRepository implements LeagueRepository {
  load(): Promise<League> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === null) return Promise.resolve(freshLeague())
      const parsed: unknown = JSON.parse(raw)
      if (!looksLikeLeague(parsed)) throw new Error('formato desconocido')
      return Promise.resolve(parsed)
    } catch {
      // backup del dato corrupto y arranque limpio
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw !== null) {
          localStorage.setItem(`${STORAGE_KEY}.corrupto.${Date.now()}`, raw)
          localStorage.removeItem(STORAGE_KEY)
        }
      } catch {
        // sin espacio o sin permiso: seguimos con estado limpio
      }
      return Promise.resolve(freshLeague())
    }
  }

  save(league: League): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(league))
    } catch {
      // sin espacio: la app sigue funcionando en memoria
    }
    return Promise.resolve()
  }
}

export const leagueRepository: LeagueRepository = new LocalStorageRepository()
