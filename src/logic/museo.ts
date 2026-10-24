import type { League, Player } from '../data/types'
import { chronologicalFinishedSessions, eloPeaks } from './elo'
import { playerBadges } from './badges'
import { bestDupla, chemistryOf } from './awards'
import { seasonStats } from './stats'
import { venganzasCumplidas } from './venganzas'

/**
 * El Museo 🏛️: los récords históricos de la liga, derivados del historial como
 * todo lo demás. Solo corren titulares; empate ⇒ más partidos ⇒ id (determinístico).
 */
export interface MuseoRecord {
  id: string
  emoji: string
  titulo: string
  playerIds: string[]
  valor: string
}

export function recordsMuseo(league: League): MuseoRecord[] {
  if (chronologicalFinishedSessions(league).length === 0) return []
  const players = league.players.filter(p => p.invitado !== true)

  const statsOf = new Map(players.map(p => [p.id, seasonStats(league, p.id)]))
  const badgesOf = new Map(players.map(p => [p.id, playerBadges(league, p.id)]))
  const peaks = eloPeaks(league)
  const played = (id: string) => statsOf.get(id)?.played ?? 0

  const top = (valueOf: (id: string) => number): Player | undefined => {
    let win: Player | undefined
    for (const p of players) {
      if (win === undefined) {
        win = p
        continue
      }
      const v = valueOf(p.id)
      const w = valueOf(win.id)
      if (v > w || (v === w && played(p.id) > played(win.id))) win = p
    }
    return win
  }

  const records: MuseoRecord[] = []

  // 👑 la corona eterna: más títulos de jornada
  const rey = top(id => statsOf.get(id)?.titles ?? 0)
  if (rey !== undefined && (statsOf.get(rey.id)?.titles ?? 0) > 0) {
    records.push({
      id: 'titulos',
      emoji: '👑',
      titulo: 'La corona eterna',
      playerIds: [rey.id],
      valor: `${statsOf.get(rey.id)!.titles} títulos`,
    })
  }

  // 🌋 la racha histórica: pico de victorias seguidas
  const racha = top(id => badgesOf.get(id)?.bestStreak ?? 0)
  if (racha !== undefined && (badgesOf.get(racha.id)?.bestStreak ?? 0) >= 2) {
    records.push({
      id: 'racha',
      emoji: '🌋',
      titulo: 'La racha histórica',
      playerIds: [racha.id],
      valor: `${badgesOf.get(racha.id)!.bestStreak} victorias seguidas`,
    })
  }

  // 🚀 el ELO dorado: pico histórico de puntos
  const dorado = top(id => peaks.get(id) ?? 0)
  if (dorado !== undefined) {
    records.push({
      id: 'elo',
      emoji: '🚀',
      titulo: 'El ELO dorado',
      playerIds: [dorado.id],
      valor: `${Math.round(peaks.get(dorado.id) ?? 0)} pts`,
    })
  }

  // 🔄 alma de remontador
  const remontador = top(id => badgesOf.get(id)?.remontadas ?? 0)
  if (remontador !== undefined && (badgesOf.get(remontador.id)?.remontadas ?? 0) > 0) {
    const n = badgesOf.get(remontador.id)!.remontadas
    records.push({
      id: 'remontadas',
      emoji: '🔄',
      titulo: 'Alma de remontador',
      playerIds: [remontador.id],
      valor: `${n} ${n === 1 ? 'remontada' : 'remontadas'}`,
    })
  }

  // 🧹 la escoba de oro: más barridas
  const escoba = top(id => badgesOf.get(id)?.barridas ?? 0)
  if (escoba !== undefined && (badgesOf.get(escoba.id)?.barridas ?? 0) > 0) {
    const n = badgesOf.get(escoba.id)!.barridas
    records.push({
      id: 'barridas',
      emoji: '🧹',
      titulo: 'La escoba de oro',
      playerIds: [escoba.id],
      valor: `${n} ${n === 1 ? 'barrida' : 'barridas'}`,
    })
  }

  // 🔪 la venganza más épica: la racha más larga que alguien se animó a cortar
  const vencidas = new Map<string, number>()
  for (const c of venganzasCumplidas(league)) {
    vencidas.set(c.victimaId, Math.max(vencidas.get(c.victimaId) ?? 0, c.rachaVencida))
  }
  const vengador = top(id => vencidas.get(id) ?? 0)
  if (vengador !== undefined && (vencidas.get(vengador.id) ?? 0) >= 3) {
    records.push({
      id: 'venganza',
      emoji: '🔪',
      titulo: 'La venganza más épica',
      playerIds: [vengador.id],
      valor: `cortó una racha de ${vencidas.get(vengador.id)}`,
    })
  }

  // 🎾 piernas de acero: más partidos jugados
  const pierna = top(played)
  if (pierna !== undefined && played(pierna.id) > 0) {
    records.push({
      id: 'partidos',
      emoji: '🎾',
      titulo: 'Piernas de acero',
      playerIds: [pierna.id],
      valor: `${played(pierna.id)} partidos`,
    })
  }

  // 💥 la dupla del siglo
  const dupla = bestDupla(league)
  if (dupla !== undefined) {
    records.push({
      id: 'dupla',
      emoji: '💥',
      titulo: 'La dupla del siglo',
      playerIds: [...dupla.ids],
      valor: `${dupla.won} de ${dupla.played} · ${Math.round(dupla.winPct * 100)}%`,
    })
  }

  // 🧪 sala de la vergüenza
  const quimica = chemistryOf(league)
  if (quimica !== undefined) {
    records.push({
      id: 'quimica',
      emoji: '🧪',
      titulo: 'Sala de la vergüenza',
      playerIds: [...quimica.ids],
      valor: `${quimica.won} de ${quimica.played} · ${Math.round(quimica.winPct * 100)}%`,
    })
  }

  return records
}
