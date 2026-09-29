import type { TeamColor } from '../data/types'

export const TEAM_HEX: Record<TeamColor, string> = {
  lima: '#C6F432',
  cian: '#22D3EE',
  magenta: '#F472B6',
  naranja: '#FB923C',
}

export const HUES: number[] = [0, 25, 45, 90, 140, 170, 200, 220, 250, 280, 310, 340]

export const EMOJIS: string[] = [
  '🎾', '🔥', '👑', '🦈', '🐯', '🦅', '🐺', '⚡',
  '🎯', '💥', '🚀', '🧊', '🌶️', '🥷', '🐼', '🦖',
  '🐙', '🦁', '😎', '🧙', '🤠', '👽', '🤖', '🎃',
]
