import { randInt, shuffle } from './random'

export const TEAM_NAMES = [
  'Pared y Punto',
  'Smash Bros',
  'Los Globitos',
  'La Chiquita',
  'Revés Mortal',
  'Doble Pared',
  'Bandeja Club',
  'Los Rulos',
  'Víbora FC',
  'Remate Perfecto',
  'Los Tanques',
  'Punto de Oro',
  'Tres Paredes',
  'Los Drop Shots',
  'Contra Pared',
  'Globazo',
  'Salida de Pared',
  'Los Zurdos',
  'Rally Infinito',
  'Pique Limpio',
  'Dueños de la Red',
  'Fondo de Cancha',
  'Los Espejos',
  'Nivel 10',
  'Los Provisorios',
  'Pala Vieja',
  'Ultra Soft',
  'Los Invictos',
  'Bajo la Red',
  'Cristales Rotos',
]

/** Nombres sin repetir dentro del sorteo (y evitando los ya usados en la jornada) */
export function pickTeamNames(count: number, taken: Iterable<string> = []): string[] {
  const used = new Set(taken)
  const pool = shuffle(TEAM_NAMES.filter(n => !used.has(n)))
  const out: string[] = []
  for (let i = 0; out.length < count; i++) {
    if (i >= pool.length) {
      out.push(`Equipo ${out.length + 1}`)
    } else {
      out.push(pool[i])
    }
  }
  return out
}

/** Nombre alternativo para regenerar (evita repetir los presentes) */
export function randomTeamName(taken: Iterable<string>): string {
  const used = new Set(taken)
  const pool = TEAM_NAMES.filter(n => !used.has(n))
  if (pool.length === 0) return 'Equipo Random'
  return pool[randInt(pool.length)]
}
