import type { League, Player, Session } from './types'

/**
 * Fusión local ↔ servidor para cuando dos dispositivos cargaron cosas distintas
 * (el lunes real). Reglas del PLAN-FASE-2 §5:
 *  - players: unión por id; conflicto ⇒ servidor
 *  - sessions: unión por id (nunca se pierde una jornada)
 *  - misma jornada: base = la copia con más resultados (empate ⇒ servidor);
 *    si alguna está cerrada gana esa para estado/campeón; partido a partido,
 *    resultado cargado le gana a vacío y el del servidor gana conflictos
 */

const progress = (s: Session) => s.matches.filter(m => m.result !== undefined).length

export function mergePlayers(local: Player[], remote: Player[]): Player[] {
  const remoteById = new Map(remote.map(p => [p.id, p]))
  const merged = local.map(p => remoteById.get(p.id) ?? p)
  const localIds = new Set(local.map(p => p.id))
  remote.forEach(p => {
    if (!localIds.has(p.id)) merged.push(p)
  })
  return merged
}

export function mergeSession(local: Session, remote: Session): Session {
  const base =
    remote.status === 'finished'
      ? remote
      : local.status === 'finished'
        ? local
        : progress(remote) >= progress(local)
          ? remote
          : local

  const resultsOf = (s: Session) =>
    new Map(s.matches.filter(m => m.result !== undefined).map(m => [m.id, m.result!]))
  const localResults = resultsOf(local)
  const remoteResults = resultsOf(remote)

  const matches = base.matches.map(m => {
    const remoteResult = remoteResults.get(m.id)
    if (remoteResult !== undefined) return m.result === remoteResult ? m : { ...m, result: remoteResult }
    const localResult = localResults.get(m.id)
    if (localResult !== undefined && m.result === undefined) return { ...m, result: localResult }
    return m
  })

  return { ...base, matches }
}

export function mergeSessions(local: Session[], remote: Session[]): Session[] {
  const localById = new Map(local.map(s => [s.id, s]))
  const merged = remote.map(rs => {
    const ls = localById.get(rs.id)
    return ls === undefined ? rs : mergeSession(ls, rs)
  })
  const remoteIds = new Set(remote.map(s => s.id))
  local.forEach(ls => {
    if (!remoteIds.has(ls.id)) merged.push(ls)
  })
  // más reciente primero (como el flujo local de F1)
  return merged.sort((a, b) =>
    a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1,
  )
}

export function mergeLeagues(local: League, remote: League): League {
  return {
    version: 1,
    players: mergePlayers(local.players, remote.players),
    sessions: mergeSessions(local.sessions, remote.sessions),
  }
}
