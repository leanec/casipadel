import type { Match, Player, Team } from '../data/types'
import { scoreLine } from '../logic/results'
import { isRemontada } from '../logic/badges'
import { playerOf } from '../logic/selectors'
import CourtBadge from './CourtBadge'
import { TEAM_HEX } from './colors'

export default function MatchCard({
  match,
  teamA,
  teamB,
  players,
  readOnly = false,
  onOpen,
}: {
  match: Match
  teamA: Team
  teamB: Team
  players: Map<string, Player>
  readOnly?: boolean
  onOpen?: () => void
}) {
  const hexA = TEAM_HEX[teamA.color]
  const hexB = TEAM_HEX[teamB.color]
  const result = match.result
  const winnerIsA = result?.winner === 'A'
  const line = scoreLine(result?.sets)
  const remont = isRemontada(match)
  const nameA = teamA.playerIds.map(id => playerOf(players, id).name).join(' · ')
  const nameB = teamB.playerIds.map(id => playerOf(players, id).name).join(' · ')

  return (
    <button
      disabled={readOnly}
      onClick={onOpen}
      className={`glass w-full rounded-2xl p-4 text-left transition active:scale-[0.99] ${
        result !== undefined ? '' : 'border-dashed'
      } ${readOnly ? 'opacity-80' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-mute">
            R{match.round}
          </span>
          <CourtBadge court={match.court} />
        </div>
        {result !== undefined ? (
          <span className="flex items-center gap-1.5">
            {remont && <span aria-label="Remontada">🔄</span>}
            {line !== null ? (
              <span className="tnum font-display text-sm text-lime">{line}</span>
            ) : (
              <span className="text-xs font-semibold text-lime">✓ Resultado</span>
            )}
          </span>
        ) : (
          <span className="text-xs text-mute">Ingresar →</span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className={`min-w-0 flex-1 ${result !== undefined && !winnerIsA ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: hexA }} />
            <span className="truncate text-sm font-semibold">{nameA}</span>
          </div>
        </div>
        <span className="font-display shrink-0 text-mute/50">
          {result === undefined ? 'VS' : winnerIsA ? '▸' : '◂'}
        </span>
        <div
          className={`min-w-0 flex-1 text-right ${result !== undefined && winnerIsA ? 'opacity-50' : ''}`}
        >
          <div className="flex items-center justify-end gap-2">
            <span className="truncate text-sm font-semibold">{nameB}</span>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: hexB }} />
          </div>
        </div>
      </div>
    </button>
  )
}
