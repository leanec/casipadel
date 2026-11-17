import type { League } from '../data/types'
import { chronologicalFinishedSessions, eloHistory } from './elo'
import { playerBadges } from './badges'
import { estadoAsistencia } from './asistencia'
import { seasonStats } from './stats'
import { venganzasCumplidas } from './venganzas'

/**
 * Apodos 📛: los cinturones de la liga. Cada título tiene UN solo dueño (o es
 * vacante): El Muro es el que mejor porcentaje tiene, punto. La semana próxima
 * te lo pueden quitar — los cinturones se defienden el lunes. Todo derivado del
 * historial, como el ELO: cero storage.
 */

/** Piso de caída de ELO en una sola jornada para que el Armstrong exista */
export const ARMSTRONG_MIN = -15

export interface Cinturon {
  id: string
  emoji: string
  titulo: string
  /** Quién lo sostiene hoy (vacío ⇒ vacante). El Fantasma admite co-titulares */
  holderIds: string[]
  /** El dato que respalda el título, ej "71% ganados" (del primer titular) */
  caption: string
}

/** Todos los cinturones en orden de prestigio; el de mayor prestigio que uno
 *  tenga es el que se le muestra en el perfil. Solo corren titulares. */
export function cinturones(league: League): Cinturon[] {
  const titulares = league.players.filter(p => p.invitado !== true)
  const ids = titulares.map(p => p.id)
  const statsOf = new Map(ids.map(id => [id, seasonStats(league, id)]))
  const badgesOf = new Map(ids.map(id => [id, playerBadges(league, id)]))
  const played = (id: string) => statsOf.get(id)?.played ?? 0
  const cobradas = new Map<string, number>()
  for (const c of venganzasCumplidas(league)) {
    if (cobradas.has(c.victimaId)) cobradas.set(c.victimaId, cobradas.get(c.victimaId)! + 1)
    else cobradas.set(c.victimaId, 1)
  }
  const caidas = new Map<string, number>()
  for (const id of ids) {
    const h = eloHistory(league, id)
    let peor = 0
    for (let i = 1; i < h.length; i++) peor = Math.min(peor, Math.round(h[i] - h[i - 1]))
    if (peor < 0) caidas.set(id, peor)
  }

  // el mejor con la regla del museo: más valor ⇒ más partidos ⇒ id (determinístico)
  const top = (value: (id: string) => number, min: number, elegible?: (id: string) => boolean): string | undefined => {
    let win: string | undefined
    for (const id of ids) {
      if (elegible !== undefined && !elegible(id)) continue
      const v = value(id)
      if (v < min) continue
      if (win === undefined || v > value(win) || (v === value(win) && played(id) > played(win))) {
        win = id
      }
    }
    return win
  }

  const cinturones: Cinturon[] = []

  const dynast = top(id => statsOf.get(id)?.titles ?? 0, 2)
  cinturones.push({
    id: 'dinastia',
    emoji: '👑',
    titulo: 'La Dinastía',
    holderIds: dynast !== undefined ? [dynast] : [],
    caption: dynast !== undefined ? `${statsOf.get(dynast)?.titles} títulos` : '',
  })

  // el muro necesita piso de partidos: el 100% con 3 partidos no es muro, es suerte
  const muro = top(id => Math.round((statsOf.get(id)?.winPct ?? 0) * 1000), 0, id => played(id) >= 6)
  const muroPct = muro !== undefined ? Math.round((statsOf.get(muro)?.winPct ?? 0) * 100) : 0
  cinturones.push({
    id: 'muro',
    emoji: '🧱',
    titulo: 'El Muro',
    holderIds: muro !== undefined ? [muro] : [],
    caption: muro !== undefined ? `${muroPct}% ganados` : '',
  })

  const llamas = top(id => Math.max(statsOf.get(id)?.streak ?? 0, 0), 2)
  cinturones.push({
    id: 'llamas',
    emoji: '🔥',
    titulo: 'En Llamas',
    holderIds: llamas !== undefined ? [llamas] : [],
    caption: llamas !== undefined ? `${statsOf.get(llamas)?.streak} victorias seguidas` : '',
  })

  const remontador = top(id => badgesOf.get(id)?.remontadas ?? 0, 1)
  cinturones.push({
    id: 'remontador',
    emoji: '🔄',
    titulo: 'El Remontador',
    holderIds: remontador !== undefined ? [remontador] : [],
    caption: remontador !== undefined ? `${badgesOf.get(remontador)?.remontadas} remontadas` : '',
  })

  const escoba = top(id => badgesOf.get(id)?.barridas ?? 0, 1)
  cinturones.push({
    id: 'escoba',
    emoji: '🧹',
    titulo: 'La Escoba',
    holderIds: escoba !== undefined ? [escoba] : [],
    caption: escoba !== undefined ? `${badgesOf.get(escoba)?.barridas} barridas` : '',
  })

  const cobrador = top(id => cobradas.get(id) ?? 0, 1)
  cinturones.push({
    id: 'cobrador',
    emoji: '🔪',
    titulo: 'El Cobrador',
    holderIds: cobrador !== undefined ? [cobrador] : [],
    caption: cobrador !== undefined ? `${cobradas.get(cobrador)} venganzas cobradas` : '',
  })

  const fantasma = estadoAsistencia(league)
  cinturones.push({
    id: 'fantasma',
    emoji: '👻',
    titulo: 'El Fantasma',
    holderIds: fantasma.fantasmas,
    caption: fantasma.ausencias > 0 ? `${fantasma.ausencias} lunes sin aparecer` : '',
  })

  // el Armstrong: la peor caída de una sola jornada (decay cuenta: son -10 y no llega)
  let armstrong: string | undefined
  let peorCaida = 0
  for (const id of ids) {
    const caida = caidas.get(id) ?? 0
    if (caida >= ARMSTRONG_MIN) continue
    if (
      armstrong === undefined ||
      caida < peorCaida ||
      (caida === peorCaida && played(id) > played(armstrong))
    ) {
      armstrong = id
      peorCaida = caida
    }
  }
  cinturones.push({
    id: 'armstrong',
    emoji: '📉',
    titulo: 'El Armstrong',
    holderIds: armstrong !== undefined ? [armstrong] : [],
    caption: armstrong !== undefined ? `${peorCaida} en una jornada` : '',
  })

  return cinturones
}

/** Todos los cinturones que sostiene cada jugador, en orden de prestigio */
export function apodosDe(league: League): Map<string, Cinturon[]> {
  const de = new Map<string, Cinturon[]>()
  for (const c of cinturones(league)) {
    for (const id of c.holderIds) {
      const lista = de.get(id) ?? []
      lista.push(c)
      de.set(id, lista)
    }
  }
  return de
}

/** El apodo de mayor prestigio que sostiene el jugador (undefined si ninguno) */
export function apodoPrincipal(league: League, playerId: string): Cinturon | undefined {
  return apodosDe(league).get(playerId)?.[0]
}

/** Cinturones que cambiaron de manos con la última jornada terminada: el
 *  material de la previa. Solo cambios de dueño a dueño — el primer dueño no
 *  hace ruido (si no, la jornada 2 inundaría la previa de cinturones nuevos). */
export function cinturonesEnDisputa(
  league: League,
): { cinturon: Cinturon; nuevoId: string; viejoId: string }[] {
  const chrono = chronologicalFinishedSessions(league)
  if (chrono.length === 0) return []
  const ultima = chrono[chrono.length - 1]
  const antes: League = { ...league, sessions: league.sessions.filter(s => s.id !== ultima.id) }
  const previos = new Map(cinturones(antes).map(c => [c.id, c.holderIds[0]]))
  const cambios: { cinturon: Cinturon; nuevoId: string; viejoId: string }[] = []
  for (const c of cinturones(league)) {
    const viejo = previos.get(c.id)
    const nuevo = c.holderIds[0]
    if (viejo !== undefined && nuevo !== undefined && viejo !== nuevo) {
      cambios.push({ cinturon: c, nuevoId: nuevo, viejoId: viejo })
    }
  }
  return cambios
}
