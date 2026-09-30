import type { League, Player, Session } from './types'

/**
 * Fusión local ↔ servidor para cuando dos dispositivos cargaron cosas distintas
 * (el lunes real). Reglas del PLAN-FASE-2 §5:
 *  - players: unión por id; conflicto ⇒ la copia con `updatedAt` más nuevo
 *    (si una sola lo tiene, esa; sin marca en ninguna ⇒ servidor)
 *  - sessions: unión por id (nunca se pierde una jornada)
 *  - misma jornada: base = la copia con más resultados (empate ⇒ servidor);
 *    si alguna está cerrada gana esa para estado/campeón; partido a partido,
 *    resultado cargado le gana a vacío y el del servidor gana conflictos
 *  - eliminados: los tombstones se unionan y ganan a la unión (borrar en un
 *    dispositivo borra en todos)
 */

const progress = (s: Session) => s.matches.filter(m => m.result !== undefined).length

/** Jugador en conflicto entre lados: gana la copia editada más reciente */
function mergePlayer(local: Player, remote: Player): Player {
  if (local.updatedAt === undefined) return remote
  if (remote.updatedAt === undefined) return local
  return local.updatedAt > remote.updatedAt ? local : remote
}

export function mergePlayers(local: Player[], remote: Player[]): Player[] {
  const remoteById = new Map(remote.map(p => [p.id, p]))
  const merged = local.map(p => {
    const r = remoteById.get(p.id)
    return r === undefined ? p : mergePlayer(p, r)
  })
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
  // unión de tombstones (ordenada ⇒ JSON estable para comparar snapshots)
  const deletedPlayerIds = unionDeleted(local.deletedPlayerIds, remote.deletedPlayerIds)
  const deletedSessionIds = unionDeleted(local.deletedSessionIds, remote.deletedSessionIds)
  return {
    version: 1,
    players: mergePlayers(local.players, remote.players).filter(
      p => !deletedPlayerIds.includes(p.id),
    ),
    sessions: mergeSessions(local.sessions, remote.sessions).filter(
      s => !deletedSessionIds.includes(s.id),
    ),
    ...(deletedPlayerIds.length > 0 ? { deletedPlayerIds } : {}),
    ...(deletedSessionIds.length > 0 ? { deletedSessionIds } : {}),
  }
}

function unionDeleted(local: string[] | undefined, remote: string[] | undefined): string[] {
  return [...new Set([...(local ?? []), ...(remote ?? [])])].sort()
}
