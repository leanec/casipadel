import { describe, expect, it } from 'vitest'
import { BackupError, buildBackup, parseBackup } from './backup'
import type { League } from './types'

const liga: League = {
  version: 1,
  players: [
    { id: 'p1', name: 'Fede', emoji: '🦈', hue: 200, createdAt: '' },
    { id: 'p2', name: 'Vale', emoji: '🌺', hue: 320, createdAt: '' },
  ],
  sessions: [],
}

describe('buildBackup', () => {
  it('arma el wrapper con fecha, revisión y resumen', () => {
    const b = buildBackup(liga, 2409, new Date('2026-10-19T12:00:00Z'))
    expect(b.league).toBe(liga)
    expect(b.revision).toBe(2409)
    expect(b._backup.hechoEn).toBe('2026-10-19T12:00:00.000Z')
    expect(b._backup.resumen).toBe('2 jugadores · 0 jornadas')
  })

  it('en modo local la revisión viaja en 0 sin romper', () => {
    const b = buildBackup(liga, 0)
    expect(b.revision).toBe(0)
    expect(parseBackup(JSON.stringify(b))).toEqual(liga)
  })
})

describe('parseBackup', () => {
  it('acepta el wrapper completo (ida y vuelta con buildBackup)', () => {
    const vuelta = parseBackup(JSON.stringify(buildBackup(liga, 7)))
    expect(vuelta).toEqual(liga)
  })

  it('acepta un League crudo sin wrapper', () => {
    expect(parseBackup(JSON.stringify(liga))).toEqual(liga)
  })

  it('rechaza JSON roto', () => {
    expect(() => parseBackup('{roto')).toThrow(BackupError)
    try {
      parseBackup('{roto')
    } catch (err) {
      expect((err as BackupError).reason).toBe('formato')
    }
  })

  it('rechaza un objeto que no es una liga', () => {
    expect(() => parseBackup('{"hola":1}')).toThrow(BackupError)
  })

  it('rechaza una liga vacía: restaurarla borraría todo sin ganancia', () => {
    try {
      parseBackup(JSON.stringify({ version: 1, players: [], sessions: [] }))
      expect.unreachable()
    } catch (err) {
      expect((err as BackupError).reason).toBe('vacio')
    }
  })
})
