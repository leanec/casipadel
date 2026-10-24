import type { League } from '../data/types'
import { chronologicalFinishedSessions } from './elo'
import { defaultSessionDate, formatShortDate } from './dates'
import { activeSession } from './selectors'
import { estadoAsistencia } from './asistencia'
import { bestDupla, chemistryOf } from './awards'
import { rankingRows, seasonStats } from './stats'
import { venganzasEnJuego, venganzasPendientes } from './venganzas'
import type { Session } from '../data/types'

/**
 * La Previa 📣: la tarjeta para calentar el WhatsApp antes de (o durante) el
 * lunes. Con jornada en curso muestra las parejas sorteadas; sin jornada, se
 * viene el próximo lunes. Las líneas de color las arma el historial.
 */
export interface PreviaLinea {
  emoji: string
  texto: string
}

export interface PreviaEquipo {
  nombre: string
  jugadores: string
  hue1: number
  hue2: number
  emoji1: string
  emoji2: string
}

export interface PreviaModel {
  fechaLabel: string
  statusLabel: string
  live: boolean
  equipos: PreviaEquipo[]
  lineas: PreviaLinea[]
}

function nombresDe(league: League, session: Session, teamIds: string[]): string {
  const nombres = teamIds
    .map(tid => session.teams.find(t => t.id === tid))
    .flatMap(t => t?.playerIds ?? [])
    .map(id => league.players.find(p => p.id === id)?.name ?? '¿?')
  const unicos = [...new Set(nombres)]
  return unicos.join(' & ')
}

export function buildPrevia(league: League, now: Date = new Date()): PreviaModel {
  const live = activeSession(league)
  const players = (id: string) => league.players.find(p => p.id === id)
  const lineas: PreviaLinea[] = []

  // 🥇 el líder (solo con temporada: sin jornadas todos tienen el ELO base)
  const filas = rankingRows(league)
  const lider = chronologicalFinishedSessions(league).length > 0 ? filas[0] : undefined
  if (lider !== undefined) {
    lineas.push({
      emoji: '🥇',
      texto: `${players(lider.playerId)?.name ?? '¿?'} manda con ${lider.elo} puntos`,
    })
  }

  // 🔥 la racha más caliente
  const conRacha = league.players
    .map(p => ({ p, streak: seasonStats(league, p.id).streak }))
    .filter(x => x.streak >= 2)
    .sort((a, b) => b.streak - a.streak)[0]
  if (conRacha !== undefined) {
    lineas.push({
      emoji: '🔥',
      texto: `${conRacha.p.name}: ${conRacha.streak} victorias seguidas`,
    })
  }

  // 🔪 la revancha pendiente (y si el sorteo de hoy la cruza, mejor aún)
  const pendientes = venganzasPendientes(league)
  const cruzadas = live !== undefined ? venganzasEnJuego(league, live).flatMap(e => e.deudas) : []
  const deuda =
    cruzadas.length > 0
      ? cruzadas.reduce((a, b) => (b.racha > a.racha ? b : a))
      : pendientes[0]
  if (deuda !== undefined) {
    const dominador = players(deuda.dominadorId)?.name ?? '¿?'
    const victima = players(deuda.victimaId)?.name ?? '¿?'
    lineas.push({
      emoji: '🔪',
      texto:
        cruzadas.length > 0
          ? `HOY se puede cobrar: ${victima} le debe una a ${dominador}`
          : `${victima} le debe la revancha a ${dominador}`,
    })
  }

  // 👻 el fantasma de la semana
  const asist = estadoAsistencia(league)
  if (asist.fantasmas.length > 0) {
    const nombres = asist.fantasmas.map(id => players(id)?.name ?? '¿?').join(' y ')
    lineas.push({
      emoji: '👻',
      texto: `${nombres}: ${asist.ausencias} lunes sin aparecer`,
    })
  }

  // 💥 la dupla del momento
  const dupla = bestDupla(league)
  if (dupla !== undefined) {
    const nombres = dupla.ids.map(id => players(id)?.name ?? '¿?').join(' & ')
    lineas.push({
      emoji: '💥',
      texto: `${nombres} ganan el ${Math.round(dupla.winPct * 100)}% juntos`,
    })
  }

  // 🧪 la química que el sorteo decide si repite
  const quimica = chemistryOf(league)
  if (quimica !== undefined) {
    const nombres = quimica.ids.map(id => players(id)?.name ?? '¿?').join(' & ')
    lineas.push({
      emoji: '🧪',
      texto: `${nombres} vienen del ${Math.round(quimica.winPct * 100)}%. El sorteo decide`,
    })
  }

  // 👑 el último campeón cierra la previa si faltó algo de lo anterior
  const ultima = [...chronologicalFinishedSessions(league)].pop()
  if (lineas.length < 5 && ultima !== undefined) {
    const campeones = nombresDe(league, ultima, ultima.championTeamIds ?? [])
    if (campeones !== '') {
      lineas.push({ emoji: '👑', texto: `La última jornada la ganaron ${campeones}` })
    }
  }

  if (live !== undefined) {
    return {
      fechaLabel: formatShortDate(live.date),
      statusLabel: 'EN CANCHA HOY',
      live: true,
      equipos: live.teams.map(t => {
        const [id1, id2] = t.playerIds
        const p1 = players(id1)
        const p2 = players(id2)
        return {
          nombre: t.name,
          jugadores: `${p1?.name ?? '¿?'} & ${p2?.name ?? '¿?'}`,
          hue1: p1?.hue ?? 220,
          hue2: p2?.hue ?? 220,
          emoji1: p1?.emoji ?? '🎾',
          emoji2: p2?.emoji ?? '🎾',
        }
      }),
      lineas: lineas.slice(0, 4),
    }
  }

  return {
    fechaLabel: formatShortDate(defaultSessionDate(now)),
    statusLabel: 'SE VIENE EL LUNES',
    live: false,
    equipos: [],
    lineas: lineas.slice(0, 6),
  }
}
