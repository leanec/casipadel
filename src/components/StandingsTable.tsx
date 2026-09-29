import { motion } from 'framer-motion'
import type { Player, Session } from '../data/types'
import { computeStandings } from '../logic/standings'
import { playerOf } from '../logic/selectors'
import { TEAM_HEX } from './colors'

export default function StandingsTable({
  session,
  players,
}: {
  session: Session
  players: Map<string, Player>
}) {
  const rows = computeStandings(session.teams, session.matches)
  const teamById = new Map(session.teams.map(t => [t.id, t]))
  const GRID = 'grid grid-cols-[2.2rem_1fr_repeat(4,2.1rem)] items-center gap-1'

  return (
    <div className="glass overflow-hidden rounded-3xl">
      <div
        className={`${GRID} border-b border-white/10 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-mute`}
      >
        <span>#</span>
        <span>Pareja</span>
        <span className="text-right">PJ</span>
        <span className="text-right">PG</span>
        <span className="text-right">Sets</span>
        <span className="text-right">ΔJ</span>
      </div>
      {rows.map((row, i) => {
        const team = teamById.get(row.teamId)
        if (team === undefined) return null
        const hex = TEAM_HEX[team.color]
        const pairNames = team.playerIds.map(id => playerOf(players, id).name).join(' · ')
        const diff = row.gamesWon - row.gamesLost
        return (
          <motion.div
            key={row.teamId}
            layout
            className={`${GRID} px-4 py-2.5 ${i === 0 ? 'bg-lime/5' : ''}`}
          >
            <span className={`font-display text-lg ${i === 0 ? 'text-lime' : 'text-mute'}`}>
              {i + 1}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: hex }} />
                <span className="truncate text-[13px] font-semibold">{team.name}</span>
              </div>
              <p className="truncate text-[10px] text-mute">{pairNames}</p>
            </div>
            <span className="tnum text-right text-sm">{row.played}</span>
            <span className="tnum text-right text-sm font-bold">{row.won}</span>
            <span className="tnum text-right text-xs text-mute">
              {row.setsWon}-{row.setsLost}
            </span>
            <span className="tnum text-right text-xs text-mute">
              {diff > 0 ? '+' : ''}
              {diff}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
