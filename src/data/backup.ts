import { looksLikeLeague } from './local-storage'
import type { League } from './types'

/**
 * Backup de la liga en un archivo JSON. Mismo formato que los backups manuales:
 * { _backup: { origen, hechoEn, revision, resumen }, revision, league }.
 * parseBackup acepta además un League crudo, por si el archivo se editó a mano.
 */

export interface BackupFile {
  _backup: {
    origen: string
    hechoEn: string
    revision: number
    resumen: string
  }
  revision: number
  league: League
}

export class BackupError extends Error {
  constructor(public reason: 'formato' | 'vacio') {
    super(
      reason === 'vacio'
        ? 'El backup está vacío (0 jugadores y 0 jornadas).'
        : 'Este archivo no parece un backup de Casi Pádel.',
    )
  }
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

export function buildBackup(league: League, revision: number, now = new Date()): BackupFile {
  return {
    _backup: {
      origen: 'app · Ajustes',
      hechoEn: now.toISOString(),
      revision,
      resumen: `${plural(league.players.length, 'jugador', 'jugadores')} · ${plural(
        league.sessions.length,
        'jornada',
        'jornadas',
      )}`,
    },
    revision,
    league,
  }
}

export function parseBackup(texto: string): League {
  let raw: unknown
  try {
    raw = JSON.parse(texto)
  } catch {
    throw new BackupError('formato')
  }
  const league =
    typeof raw === 'object' && raw !== null && 'league' in raw
      ? (raw as { league: unknown }).league
      : raw
  if (!looksLikeLeague(league)) throw new BackupError('formato')
  if (league.players.length === 0 && league.sessions.length === 0) throw new BackupError('vacio')
  return league
}

export type ShareBackupResult = 'shared' | 'downloaded' | 'cancel'

/**
 * Comparte el archivo: Web Share con archivo (abre la hoja de WhatsApp en
 * iOS/Android) y, si no está soportado, descarga directa. Mismo fallback que
 * shareCanvas para las imágenes.
 */
export async function shareBackupFile(backup: BackupFile): Promise<ShareBackupResult> {
  const filename = `casi-padel-backup-${backup._backup.hechoEn.slice(0, 10)}.json`
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })

  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean
  }
  if (typeof nav.share === 'function' && nav.canShare?.({ files: [new File([], filename)] })) {
    const file = new File([blob], filename, { type: 'application/json' })
    try {
      await nav.share({ files: [file], title: 'Casi Pádel — backup' })
      return 'shared'
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return 'cancel'
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
