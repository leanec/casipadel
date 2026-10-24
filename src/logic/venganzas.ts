import type { League, Match, Session } from '../data/types'
import { chronologicalFinishedSessions } from './elo'
import { pairKey } from './draw'

/**
 * Venganzas 🔪: la deuda personal entre dos jugadores que se cruzan como
 * rivales. Si uno ganó los últimos VENGANZA_UMBRAL cruces seguidos, el otro le
 * debe una revancha; el día que la cobra, la venganza queda registrada con la
 * racha que cortó. Todo derivado del historial, como el ELO: reabrir o editar
 * una jornada se refleja solo. Jugar como dupla no toca la deuda.
 */

/** Con cuántas derrotas seguidas ante el mismo rival nace la revancha */
export const VENGANZA_UMBRAL = 2

/** Deuda viva: `dominadorId` le ganó a `victimaId` los últimos `racha` cruces */
export interface VenganzaPendiente {
  dominadorId: string
  victimaId: string
  racha: number
}

/** Deuda saldada: `victimaId` cortó una racha de `rachaVencida` contra `dominadorId` */
export interface VenganzaCumplida {
  victimaId: string
  dominadorId: string
  rachaVencida: number
  sessionId: string
  matchId: string
}

/** Racha de cruces de una pareja: quién va ganando y cuántas seguidas */
interface Rachas {
  key: string
  ids: [string, string]
  ganadorId: string
  count: number
}

interface MarchaVenganzas {
  rachas: Map<string, Rachas>
  cumplidas: VenganzaCumplida[]
}

function marchaVenganzas(league: League): MarchaVenganzas {
  const marcha: MarchaVenganzas = { rachas: new Map(), cumplidas: [] }
  for (const session of chronologicalFinishedSessions(league)) {
    const teamById = new Map(session.teams.map(t => [t.id, t]))
    const matches = session.matches
      .filter((m): m is Match & { result: NonNullable<Match['result']> } => m.result !== undefined)
      .sort((a, b) => a.round - b.round)
    for (const match of matches) {
      const teamA = teamById.get(match.teamAId)
      const teamB = teamById.get(match.teamBId)
      if (teamA === undefined || teamB === undefined) continue
      // OJO: winner 'A'/'B' es relativo al teamAId del partido
      const ganadores = match.result.winner === 'A' ? teamA : teamB
      const perdedores = match.result.winner === 'A' ? teamB : teamA
      // los 4 cruces del partido: cada jugador de una pareja contra cada uno de la otra
      for (const ganador of ganadores.playerIds) {
        for (const perdedor of perdedores.playerIds) {
          registrarCruce(marcha, ganador, perdedor, session.id, match.id)
        }
      }
    }
  }
  return marcha
}

function registrarCruce(
  marcha: MarchaVenganzas,
  ganadorId: string,
  perdedorId: string,
  sessionId: string,
  matchId: string,
): void {
  const key = pairKey(ganadorId, perdedorId)
  const racha = marcha.rachas.get(key)
  if (racha === undefined) {
    marcha.rachas.set(key, {
      key,
      ids: [ganadorId, perdedorId],
      ganadorId,
      count: 1,
    })
    return
  }
  if (racha.ganadorId === ganadorId) {
    racha.count += 1
    return
  }
  // se dio vuelta: si la racha vencida llegó al umbral, la deuda se saldó
  if (racha.count >= VENGANZA_UMBRAL) {
    marcha.cumplidas.push({
      victimaId: ganadorId,
      dominadorId: perdedorId,
      rachaVencida: racha.count,
      sessionId,
      matchId,
    })
  }
  marcha.rachas.set(key, { key, ids: racha.ids, ganadorId, count: 1 })
}

/** 🔪 Deudas vivas, la más larga primero (empate ⇒ clave, determinístico) */
export function venganzasPendientes(league: League): VenganzaPendiente[] {
  return [...marchaVenganzas(league).rachas.values()]
    .filter(r => r.count >= VENGANZA_UMBRAL)
    .map(r => ({
      dominadorId: r.ganadorId,
      victimaId: r.ids.find(id => id !== r.ganadorId) ?? r.ids[0],
      racha: r.count,
    }))
    .sort((a, b) => {
      const ka = pairKey(a.dominadorId, a.victimaId)
      const kb = pairKey(b.dominadorId, b.victimaId)
      return b.racha - a.racha || (ka < kb ? -1 : ka > kb ? 1 : 0)
    })
}

/** 🔪 Historial de deudas saldadas, en orden cronológico */
export function venganzasCumplidas(league: League): VenganzaCumplida[] {
  return marchaVenganzas(league).cumplidas
}

/** Venganzas saldadas por los resultados ya cargados de esta jornada, aunque
 *  siga en curso: el banner del momento. La historia oficial la confirma al
 *  cerrar la jornada (mismos partidos ⇒ mismos eventos). */
export function venganzasCumplidasEn(league: League, session: Session): VenganzaCumplida[] {
  if (session.matches.every(m => m.result === undefined)) return []
  const patched: League = {
    ...league,
    sessions: league.sessions.map(s => (s.id === session.id ? { ...s, status: 'finished' } : s)),
  }
  return venganzasCumplidas(patched).filter(c => c.sessionId === session.id)
}

/** Estado de la deuda entre dos jugadores (undefined si nadie debe nada) */
export function venganzaDe(league: League, aId: string, bId: string): VenganzaPendiente | undefined {
  if (aId === bId) return undefined
  const racha = marchaVenganzas(league).rachas.get(pairKey(aId, bId))
  if (racha === undefined || racha.count < VENGANZA_UMBRAL) return undefined
  return {
    dominadorId: racha.ganadorId,
    victimaId: racha.ids.find(id => id !== racha.ganadorId) ?? racha.ids[0],
    racha: racha.count,
  }
}

/** Partidos de esta jornada (sorteados, en curso o no) con deuda en juego.
 *  La deuda se mide contra el historial terminado; los resultados de la propia
 *  jornada aún no cuentan. */
export function venganzasEnJuego(
  league: League,
  session: Session,
): { matchId: string; deudas: VenganzaPendiente[] }[] {
  const rachas = marchaVenganzas(league).rachas
  const deudaDe = (aId: string, bId: string): VenganzaPendiente | undefined => {
    const racha = rachas.get(pairKey(aId, bId))
    if (racha === undefined || racha.count < VENGANZA_UMBRAL) return undefined
    return {
      dominadorId: racha.ganadorId,
      victimaId: racha.ids.find(id => id !== racha.ganadorId) ?? racha.ids[0],
      racha: racha.count,
    }
  }
  const teamById = new Map(session.teams.map(t => [t.id, t]))
  const enJuego: { matchId: string; deudas: VenganzaPendiente[] }[] = []
  for (const match of session.matches) {
    const teamA = teamById.get(match.teamAId)
    const teamB = teamById.get(match.teamBId)
    if (teamA === undefined || teamB === undefined) continue
    const deudas = new Map<string, VenganzaPendiente>()
    for (const a of teamA.playerIds) {
      for (const b of teamB.playerIds) {
        const deuda = deudaDe(a, b)
        if (deuda !== undefined) deudas.set(pairKey(a, b), deuda)
      }
    }
    if (deudas.size > 0) enJuego.push({ matchId: match.id, deudas: [...deudas.values()] })
  }
  return enJuego
}
