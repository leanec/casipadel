import type { League, Match, Session } from '../data/types'
import { chronologicalFinishedSessions, eloHistory } from './elo'
import { formatShortDate } from './dates'
import { isRemontada } from './badges'
import { estadoAsistencia } from './asistencia'
import { scoreLine } from './results'
import { playerMap } from './selectors'
import { venganzasCumplidas } from './venganzas'

/**
 * La Crónica del Lunes 📰: la reseña de la jornada con plantillas determinísticas
 * sobre los datos reales. La previa promete; la crónica cobra. Máx 6 líneas en
 * orden fijo de prioridad; si no hay dato, la línea no va. Todo derivado del
 * historial — retroactiva gratis: cualquier jornada terminada tiene su crónica.
 */

export interface CronicaLinea {
  emoji: string
  texto: string
}

export interface CronicaModel {
  /** "19/10" */
  fechaLabel: string
  /** "J4" (o "LA CRÓNICA" si la jornada no está en el historial) */
  jornadaLabel: string
  /** "LA CRÓNICA · J4" */
  titulo: string
  lineas: CronicaLinea[]
}

const MAX_LINEAS = 6

/** Margen mínimo de juegos para que una diferencia merezca el cartel de goleada */
const GOLEADA_MIN = 3

/** El margen total de juegos de un partido con sets cargados (goleadómetro) */
function margenDe(m: Match): number {
  if (m.result?.sets === undefined) return Number.POSITIVE_INFINITY
  return m.result.sets.reduce((sum, s) => sum + Math.abs(s.a - s.b), 0)
}

/** ΔELO del jugador en la jornada k del historial, usando la serie de eloHistory.
 *  La historia arranca en el debut: h[j] es el ELO tras la jornada debut+j-1. */
function deltaEn(league: League, chronos: Session[], k: number, playerId: string): number {
  const debut = chronos.findIndex(s => s.playerIds.includes(playerId))
  if (debut < 0 || k < debut) return 0
  const h = eloHistory(league, playerId)
  const j = k - debut + 1
  if (j < 1 || j >= h.length) return 0
  return Math.round(h[j] - h[j - 1])
}

export function cronicaDeJornada(
  league: League,
  sessionId: string,
): CronicaModel | undefined {
  const session = league.sessions.find(s => s.id === sessionId)
  if (session === undefined || session.status !== 'finished') return undefined
  const players = playerMap(league)
  const nombre = (id: string) => players.get(id)?.name ?? '¿?'
  const nombresDe = (teamId: string): string => {
    const t = session.teams.find(x => x.id === teamId)
    return (t?.playerIds ?? []).map(nombre).join(' & ')
  }
  const chrono = chronologicalFinishedSessions(league)
  const k = chrono.findIndex(s => s.id === sessionId)
  const lineas: CronicaLinea[] = []

  // 👑 el campeón del día (co-campeones incluidos)
  const campeonas = (session.championTeamIds ?? [])
    .map(id => session.teams.find(t => t.id === id))
    .filter((t): t is NonNullable<typeof t> => t !== undefined)
  if (campeonas.length === 1) {
    lineas.push({
      emoji: '👑',
      texto: `La jornada fue de ${campeonas[0].playerIds.map(nombre).join(' & ')}`,
    })
  } else if (campeonas.length > 1) {
    lineas.push({
      emoji: '👑',
      texto: `La jornada terminó repartida: ${campeonas
        .map(t => t.playerIds.map(nombre).join(' & '))
        .join(' y ')}`,
    })
  }

  const jugados = session.matches
    .filter((m): m is Match & { result: NonNullable<Match['result']> } => m.result !== undefined)
    .sort((a, b) => a.round - b.round)
  const lados = (m: Match & { result: NonNullable<Match['result']> }): { ganadores: string; perdedores: string } => {
    // OJO: winner 'A'/'B' es relativo al teamAId del partido
    const ganadorId = m.result.winner === 'A' ? m.teamAId : m.teamBId
    const perdedorId = m.result.winner === 'A' ? m.teamBId : m.teamAId
    return { ganadores: nombresDe(ganadorId), perdedores: nombresDe(perdedorId) }
  }

  // 💥 la goleada: el mayor margen del día entre los partidos que no fueron
  // remontada (dar vuelta un partido es lo contrario a pasar por encima)
  const conMargen = jugados
    .filter(m => margenDe(m) !== Number.POSITIVE_INFINITY && !isRemontada(m))
    .sort((a, b) => margenDe(b) - margenDe(a))
  const goleada = conMargen[0]
  const goleadaMostrada = goleada !== undefined && margenDe(goleada) >= GOLEADA_MIN
  if (goleadaMostrada) {
    const { ganadores, perdedores } = lados(goleada)
    lineas.push({
      emoji: '💥',
      texto: `${ganadores} pasaron por encima de ${perdedores}: ${scoreLine(goleada.result.sets)}`,
    })
  }

  // 😰 el partido del día: el más apretado (la goleada mostrada queda afuera)
  const apretado = jugados
    .filter(m => (goleadaMostrada ? m.id !== goleada.id : true))
    .sort((a, b) => margenDe(a) - margenDe(b))[0]
  if (jugados.length > 1 && apretado !== undefined) {
    const { ganadores, perdedores } = lados(apretado)
    const score = scoreLine(apretado.result.sets)
    lineas.push({
      emoji: '😰',
      texto: `El partido del día: ${ganadores} sobre ${perdedores}${
        score !== null ? ` ${score}` : ''
      }`,
    })
  }

  // 🔪 la cobranza: revanchas saldadas en esta jornada
  const cobradas = venganzasCumplidas(league).filter(c => c.sessionId === sessionId)
  if (cobradas.length > 0) {
    const c = cobradas[0]
    const extra = cobradas.length - 1
    lineas.push({
      emoji: '🔪',
      texto: `${nombre(c.victimaId)} se la cobró a ${nombre(c.dominadorId)}${
        extra > 0 ? ` (y ${extra} más)` : ''
      }`,
    })
  }

  // 🔄 la remontada: se perdió el primer set y se ganó igual
  const remontada = jugados.find(m => isRemontada(m))
  if (remontada !== undefined) {
    const { ganadores, perdedores } = lados(remontada)
    lineas.push({
      emoji: '🔄',
      texto: `${ganadores} perdieron el primer set contra ${perdedores} y lo dieron vuelta`,
    })
  }

  // 🚀 el salto del día: el mayor ΔELO entre los que jugaron (o la peor caída)
  if (k >= 0) {
    const deltas = session.playerIds.map(id => ({ id, d: deltaEn(league, chrono, k, id) }))
    const sube = deltas.reduce((a, b) => (b.d > a.d ? b : a))
    if (sube.d > 0) {
      lineas.push({ emoji: '🚀', texto: `${nombre(sube.id)} +${sube.d}, nadie subió más` })
    } else {
      const baja = deltas.reduce((a, b) => (b.d < a.d ? b : a))
      if (baja.d < 0) {
        lineas.push({ emoji: '📉', texto: `${nombre(baja.id)} ${baja.d}, noche para olvidar` })
      }
    }
  }

  // 👻 el fantasma se agrava: más ausencias que antes de esta jornada
  if (k >= 0) {
    const hastaAhora = chrono.slice(0, k + 1)
    const despues = estadoAsistencia({ ...league, sessions: hastaAhora })
    const antes = estadoAsistencia({ ...league, sessions: hastaAhora.slice(0, -1) })
    if (despues.fantasmas.length > 0 && despues.ausencias > antes.ausencias) {
      const nombres = despues.fantasmas.map(nombre).join(' y ')
      lineas.push({
        emoji: '👻',
        texto: `${nombres} suma${despues.fantasmas.length > 1 ? 'n' : ''} ${despues.ausencias} lunes sin aparecer`,
      })
    }
  }

  return {
    fechaLabel: formatShortDate(session.date),
    jornadaLabel: k >= 0 ? `J${k + 1}` : 'LA JORNADA',
    titulo: k >= 0 ? `LA CRÓNICA · J${k + 1}` : 'LA CRÓNICA',
    lineas: lineas.slice(0, MAX_LINEAS),
  }
}
