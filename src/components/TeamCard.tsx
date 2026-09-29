import type { Player, Team } from '../data/types'
import { playerOf } from '../logic/selectors'
import Avatar from './Avatar'
import { TEAM_HEX } from './colors'

export default function TeamCard({
  team,
  players,
  onRename,
  glow = false,
}: {
  team: Team
  players: Map<string, Player>
  onRename?: () => void
  glow?: boolean
}) {
  const hex = TEAM_HEX[team.color]
  const pair = team.playerIds.map(id => playerOf(players, id))
  return (
    <div
      className={`glass relative h-full overflow-hidden rounded-3xl p-4 pl-5 ${
        glow ? 'border-lime/50' : ''
      }`}
      style={glow ? { boxShadow: '0 0 30px rgba(198,244,50,0.18)' } : undefined}
    >
      <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: hex }} />
      <div className="flex items-start justify-between gap-2">
        <span className="font-display text-lg uppercase leading-tight" style={{ color: hex }}>
          {team.name}
        </span>
        {onRename !== undefined && (
          <button
            onClick={onRename}
            className="rounded-full border border-white/10 px-2 py-0.5 text-xs"
            aria-label="Cambiar nombre"
          >
            🎲
          </button>
        )}
      </div>
      <div className="mt-2.5 flex items-center gap-5">
        {pair.map(p => (
          <div key={p.id} className="flex min-w-0 items-center gap-2">
            <Avatar player={p} size="sm" />
            <span className="truncate text-sm font-semibold">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
