import { useRef, useState } from 'react'
import { BackupError, buildBackup, parseBackup, shareBackupFile } from '../data/backup'
import { storedRevision } from '../data/pin'
import { useLeague } from '../data/store'
import type { League } from '../data/types'

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/**
 * Exportar/importar el backup de la liga desde Ajustes. El import reemplaza la
 * liga entera (y en modo grupo sube el reemplazo a la nube con el sync normal),
 * así que pide confirmación mostrando qué trae el archivo.
 */
export default function BackupSection() {
  const { league, actions, group } = useLeague()
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState<League | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const exportar = async () => {
    try {
      const res = await shareBackupFile(buildBackup(league, storedRevision()))
      if (res === 'shared') setMensaje('Backup compartido ✓')
      else if (res === 'downloaded') setMensaje('Backup descargado ✓')
    } catch {
      setMensaje('No se pudo generar el archivo')
    }
  }

  const leerArchivo = async (file: File) => {
    try {
      setPendiente(parseBackup(await file.text()))
      setMensaje(null)
    } catch (err) {
      setMensaje(err instanceof BackupError ? err.message : 'No se pudo leer el archivo')
    }
  }

  const confirmarImport = () => {
    if (pendiente === null) return
    actions.replaceLeague(pendiente)
    setPendiente(null)
    setMensaje('Backup restaurado ✓')
  }

  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs text-mute">
        Copia de toda la liga: jugadores, jornadas y récords. Restaurar reemplaza lo que hay ahora.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void exportar()}
          className="shrink-0 rounded-[0.85rem] bg-lime px-4 py-2 text-xs font-bold uppercase tracking-wider text-night active:scale-95"
        >
          📤 Exportar
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="shrink-0 rounded-[0.85rem] border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink active:scale-95"
        >
          📥 Importar
        </button>
      </div>

      {pendiente !== null && (
        <div className="mt-3 rounded-[0.85rem] border border-lime/30 p-3">
          <p className="text-xs">
            ¿Restaurar este backup? {plural(pendiente.players.length, 'jugador', 'jugadores')} ·{' '}
            {plural(pendiente.sessions.length, 'jornada', 'jornadas')}.
          </p>
          <p className="mt-1 text-[10px] text-mute">
            {group.modoGrupo
              ? 'En modo grupo el reemplazo se sube a la nube'
              : 'Modo local: los datos de este dispositivo'}
            .
          </p>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setPendiente(null)}
              className="flex-1 rounded-full border border-white/15 bg-white/5 py-2 text-xs font-bold uppercase tracking-wide text-ink"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarImport}
              className="flex-1 rounded-full border border-lime/40 py-2 text-xs font-bold uppercase tracking-wide text-lime"
            >
              Restaurar
            </button>
          </div>
        </div>
      )}

      {mensaje !== null && <p className="mt-2 text-xs font-semibold text-lime">{mensaje}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file !== undefined) void leerArchivo(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
