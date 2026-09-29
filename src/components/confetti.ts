import confetti from 'canvas-confetti'
import { prefersReducedMotion } from './anim'

const COLORS = ['#C6F432', '#22D3EE', '#F472B6', '#EDF2FF']

export function celebrate() {
  if (prefersReducedMotion()) return
  confetti({
    particleCount: 90,
    angle: 60,
    spread: 70,
    origin: { x: 0, y: 0.7 },
    colors: COLORS,
  })
  confetti({
    particleCount: 90,
    angle: 120,
    spread: 70,
    origin: { x: 1, y: 0.7 },
    colors: COLORS,
  })
  window.setTimeout(() => {
    confetti({ particleCount: 120, spread: 100, origin: { y: 0.6 }, colors: COLORS })
  }, 450)
}
