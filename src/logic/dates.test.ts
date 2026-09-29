import { describe, expect, it } from 'vitest'
import { defaultSessionDate, formatLongDate, formatShortDate, parseISODate } from './dates'

describe('dates', () => {
  it('si hoy es lunes, devuelve hoy', () => {
    const monday = new Date(2026, 8, 28) // lunes 28/09/2026
    expect(defaultSessionDate(monday)).toBe('2026-09-28')
  })

  it('si no es lunes, devuelve el próximo lunes', () => {
    const wednesday = new Date(2026, 8, 30) // miércoles 30/09/2026
    expect(defaultSessionDate(wednesday)).toBe('2026-10-05')
    const sunday = new Date(2026, 8, 27) // domingo 27/09/2026
    expect(defaultSessionDate(sunday)).toBe('2026-09-28')
  })

  it('parsea y formatea en español', () => {
    const d = parseISODate('2026-10-05')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(9)
    expect(d.getDate()).toBe(5)
    expect(formatLongDate('2026-10-05')).toMatch(/lunes/)
    expect(formatShortDate('2026-10-05')).toBeTruthy()
  })
})
