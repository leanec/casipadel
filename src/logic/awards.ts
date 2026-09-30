import type { League } from '../data/types'
import { chronologicalFinishedSessions } from './elo'
import { playerBadges } from './badges'
import { pairKey } from './draw'
import { MIN_DUPLA, rankingRows, seasonStats } from './stats'

/**
 * Premios de temporada: derivados del historial (vista viva, nada persistido).
 * Dueño único por premio; empate ⇒ más partidos jugados ⇒ id (determinístico).
 */

export interface Award {
  id: string
  emoji: string
  title: string
  playerIds: string[]
  detail: string
}

interface Candidate<T> {
  item: T
  value: number
  tie: number
  key: string
}

function best<T>(candidates: Candidate<T>[]): Candidate<T> | undefined {
  let winner: Candidate<T> | undefined
  for (const c of candidates) {
    if (winner === undefined) {
      winner = c
      continue
    }
    if (
      c.value > winner.value ||
      (c.value === winner.value &&
        (c.tie > winner.tie || (c.tie === winner.tie && c.key < winner.key)))
    ) {
      winner = c
    }
  }
  return winner
}

/** Partidos por dupla a lo largo de la temporada (solo jornadas terminadas) */
function pairAggregates(league: League): {
  key: string
  ids: [string, string]
  played: number
  won: number
}[] {
  const agg = new Map<string, { ids: [string, string]; played: number; won: number }>()
  for (const session of chronologicalFinishedSessions(league)) {
    for (const t of session.teams) {
      const [p1, p2] = t.playerIds
      if (p1 === p2) continue
      const key = pairKey(p1, p2)
      const entry = agg.get(key) ?? { ids: [p1, p2], played: 0, won: 0 }
      for (const m of session.matches) {
        if (m.result === undefined) continue
        if (m.teamAId !== t.id && m.teamBId !== t.id) continue
        entry.played += 1
        if (m.result.winner === (m.teamAId === t.id ? 'A' : 'B')) entry.won += 1
      }
      agg.set(key, entry)
    }
  }
  return [...agg.entries()].map(([key, e]) => ({ key, ...e }))
}

export function seasonAwards(league: League): Award[] {
  if (chronologicalFinishedSessions(league).length === 0) return []
  const awards: Award[] = []

  const statsOf = new Map(league.players.map(p => [p.id, seasonStats(league, p.id)]))
  const badgesOf = new Map(league.players.map(p => [p.id, playerBadges(league, p.id)]))
  const stats = (id: string) => statsOf.get(id) ?? { played: 0, won: 0, winPct: 0, titles: 0, streak: 0, form: [] }

  // 🏆 Campeón de la temporada: #1 del ranking ELO
  const top = rankingRows(league)[0]
  if (top !== undefined) {
    const t = stats(top.playerId).titles
    awards.push({
      id: 'campeon',
      emoji: '🏆',
      title: 'Campeón de la temporada',
      playerIds: [top.playerId],
      detail: `ELO ${top.elo}${t > 0 ? ` · ${t} título${t > 1 ? 's' : ''}` : ''}`,
    })
  }

  // 👑 La corona: más títulos de jornada
  const conTitulos = league.players.filter(p => stats(p.id).titles > 0)
  const corona = best(
    conTitulos.map(p => ({ item: p, value: stats(p.id).titles, tie: stats(p.id).played, key: p.id })),
  )
  if (corona !== undefined) {
    const t = stats(corona.item.id).titles
    awards.push({
      id: 'corona',
      emoji: '👑',
      title: 'La corona',
      playerIds: [corona.item.id],
      detail: `${t} título${t > 1 ? 's' : ''} de jornada`,
    })
  }

  // 💥 Mejor dupla: ≥ MIN_DUPLA partidos juntos con mejor %
  const duplas = pairAggregates(league).filter(d => d.played >= MIN_DUPLA)
  const dupla = best(duplas.map(d => ({ item: d, value: d.won / d.played, tie: d.won, key: d.key })))
  if (dupla !== undefined) {
    awards.push({
      id: 'dupla',
      emoji: '💥',
      title: 'Mejor dupla',
      playerIds: [...dupla.item.ids],
      detail: `${dupla.item.won} de ${dupla.item.played} juntos (${Math.round((dupla.item.won / dupla.item.played) * 100)}%)`,
    })
  }

  // 🌋 Racha imparable: pico histórico ≥ 3 victorias seguidas
  const conRacha = league.players.filter(p => (badgesOf.get(p.id)?.bestStreak ?? 0) >= 3)
  const racha = best(
    conRacha.map(p => ({ item: p, value: badgesOf.get(p.id)!.bestStreak, tie: stats(p.id).played, key: p.id })),
  )
  if (racha !== undefined) {
    awards.push({
      id: 'racha',
      emoji: '🌋',
      title: 'Racha imparable',
      playerIds: [racha.item.id],
      detail: `${racha.value} victorias seguidas`,
    })
  }

  // 🔄 Rey de la remontada
  const conRemontadas = league.players.filter(p => (badgesOf.get(p.id)?.remontadas ?? 0) >= 1)
  const remontador = best(
    conRemontadas.map(p => ({ item: p, value: badgesOf.get(p.id)!.remontadas, tie: stats(p.id).played, key: p.id })),
  )
  if (remontador !== undefined) {
    awards.push({
      id: 'remontador',
      emoji: '🔄',
      title: 'Rey de la remontada',
      playerIds: [remontador.item.id],
      detail: `${remontador.value} remontada${remontador.value > 1 ? 's' : ''}`,
    })
  }

  // 🧹 La escoba: más barridas del día
  const conBarridas = league.players.filter(p => (badgesOf.get(p.id)?.barridas ?? 0) >= 1)
  const escoba = best(
    conBarridas.map(p => ({ item: p, value: badgesOf.get(p.id)!.barridas, tie: stats(p.id).played, key: p.id })),
  )
  if (escoba !== undefined) {
    awards.push({
      id: 'escoba',
      emoji: '🧹',
      title: 'La escoba',
      playerIds: [escoba.item.id],
      detail: `${escoba.value} barrida${escoba.value > 1 ? 's' : ''} del día`,
    })
  }

  // 💪 Más wins: mejor % con al menos 6 partidos
  const regulares = league.players.filter(p => stats(p.id).played >= 6)
  const masWins = best(
    regulares.map(p => ({ item: p, value: stats(p.id).winPct, tie: stats(p.id).won, key: p.id })),
  )
  if (masWins !== undefined) {
    awards.push({
      id: 'mas-wins',
      emoji: '💪',
      title: 'Más wins',
      playerIds: [masWins.item.id],
      detail: `${Math.round(stats(masWins.item.id).winPct * 100)}% de victorias`,
    })
  }

  // 😅 El Casi: % de victorias más cercano al 50% (el que le da nombre a la app)
  const elCasi = best(
    regulares.map(p => ({
      item: p,
      value: -Math.abs(stats(p.id).winPct - 0.5),
      tie: stats(p.id).played,
      key: p.id,
    })),
  )
  if (elCasi !== undefined) {
    awards.push({
      id: 'el-casi',
      emoji: '😅',
      title: 'El Casi',
      playerIds: [elCasi.item.id],
      detail: `${Math.round(stats(elCasi.item.id).winPct * 100)}% — ni para arriba ni para abajo`,
    })
  }

  return awards
}
