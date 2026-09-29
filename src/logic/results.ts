import type { SetScore } from '../data/types'

/** Valida un set: sets 1 y 2 a 6 (o 7 en tiebreak), 3º set super tiebreak a 10 */
export function validateSetScore(s: SetScore, isTiebreak: boolean): string | null {
  if (s.a === s.b) return 'no puede haber empate'
  const w = Math.max(s.a, s.b)
  const l = Math.min(s.a, s.b)
  if (isTiebreak) {
    if (w !== 10) return 'el súper tiebreak se gana con 10'
    if (l > 9) return 'el perdedor no puede pasar de 9'
    return null
  }
  if (w !== 6 && w !== 7) return 'un set se gana con 6 (o 7 en tiebreak)'
  if (w === 6 && l > 4) return 'con 6, el rival necesita 4 o menos'
  if (w === 7 && (l < 5 || l > 6)) return '7 solo vale con 7-5 o 7-6'
  return null
}

/** Quién lleva más sets; null si están iguales */
export function winnerFromSets(sets: SetScore[]): 'A' | 'B' | null {
  let a = 0
  let b = 0
  for (const s of sets) {
    if (s.a > s.b) a++
    else if (s.b > s.a) b++
  }
  return a > b ? 'A' : b > a ? 'B' : null
}

/** Valida la carga completa de sets de un partido (2 sets o 2 + super TB) */
export function validateMatchSets(sets: SetScore[]): string | null {
  if (sets.length !== 2 && sets.length !== 3) return 'Cargá los 2 sets (y el tiebreak si hace falta)'
  for (let i = 0; i < sets.length; i++) {
    const err = validateSetScore(sets[i], i === 2)
    if (err) return `Set ${i + 1}: ${err}`
  }
  if (sets.length === 2 && winnerFromSets(sets) === null) {
    return 'Quedó 1-1: agregá el súper tiebreak'
  }
  if (sets.length === 3) {
    const firstTwo: SetScore[] = [sets[0], sets[1]]
    if (winnerFromSets(firstTwo) !== null) return 'El tercer set solo va si los primeros dos quedaron 1-1'
  }
  return null
}

/** Resumen legible: "6-4 3-6 10-8" */
export function scoreLine(sets: SetScore[] | undefined): string | null {
  if (!sets || sets.length === 0) return null
  return sets.map(s => `${s.a}-${s.b}`).join(' ')
}
