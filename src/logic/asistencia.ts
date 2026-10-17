import type { League } from '../data/types'
import { chronologicalFinishedSessions } from './elo'

/**
 * El puntero 👟 vs el fantasma 👻: la racha de asistencia sobre las jornadas
 * terminadas. Positivo = lunes seguidos presentes; negativo = lunes seguidos
 * ausente. Con 10 jugadores y 8 por lunes todos rotan, así que una ausencia
 * no es noticia: el fantasma aparece desde las 2 seguidas.
 */
export function asistenciaDe(league: League, playerId: string): number {
  const sesiones = chronologicalFinishedSessions(league)
  if (sesiones.length === 0) return 0
  // caminar hacia atrás desde la última jornada
  let n = 0
  for (let i = sesiones.length - 1; i >= 0; i--) {
    const presente = sesiones[i].playerIds.includes(playerId)
    if (i === sesiones.length - 1) {
      n = presente ? 1 : -1
      continue
    }
    if (presente && n > 0) n += 1
    else if (!presente && n < 0) n -= 1
    else break
  }
  return n
}

export interface EstadoAsistencia {
  /** Los que vienen desde más lunes seguidos (con esa cantidad) */
  punteros: string[]
  rachaPunteros: number
  /** Los que acumulan más lunes ausentes seguidos (con esa cantidad) */
  fantasmas: string[]
  ausencias: number
}

export function estadoAsistencia(league: League): EstadoAsistencia {
  const mejores: string[] = []
  let maxRacha = 0
  const peores: string[] = []
  let maxAusencias = 0
  for (const p of league.players) {
    const racha = asistenciaDe(league, p.id)
    if (racha > 0) {
      if (racha > maxRacha) {
        maxRacha = racha
        mejores.length = 0
      }
      if (racha === maxRacha) mejores.push(p.id)
    }
    if (racha < 0) {
      const ausencias = -racha
      if (ausencias > maxAusencias) {
        maxAusencias = ausencias
        peores.length = 0
      }
      if (ausencias === maxAusencias) peores.push(p.id)
    }
  }
  return {
    punteros: mejores,
    rachaPunteros: maxRacha,
    // una ausencia no es fantasma: con 8 de 10 por lunes, todos rotan
    fantasmas: maxAusencias >= 2 ? peores : [],
    ausencias: maxAusencias >= 2 ? maxAusencias : 0,
  }
}
