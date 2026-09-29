import type { Player } from '../data/types'

const SIZES = {
  sm: 'h-9 w-9 text-base',
  md: 'h-12 w-12 text-xl',
  lg: 'h-16 w-16 text-3xl',
  xl: 'h-24 w-24 text-5xl',
} as const

export default function Avatar({
  player,
  size = 'md',
  ring = false,
}: {
  player: Player
  size?: keyof typeof SIZES
  ring?: boolean
}) {
  return (
    <div
      className={`${SIZES[size]} flex shrink-0 select-none items-center justify-center rounded-full border border-white/10 ${
        ring ? 'ring-2 ring-lime ring-offset-2 ring-offset-night' : ''
      }`}
      style={{
        background: `linear-gradient(135deg, hsl(${player.hue} 70% 55%), hsl(${player.hue} 75% 34%))`,
      }}
    >
      <span className="drop-shadow">{player.emoji}</span>
    </div>
  )
}
