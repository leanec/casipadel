import { Component, type ErrorInfo, type ReactNode } from 'react'
import { STORAGE_KEY } from '../data/local-storage'
import { clearLeagueStorage } from '../data/pin'

interface Estado {
  error: Error | null
  /** el borrado es destructivo: pide confirmación en dos pasos */
  confirmandoBorrado: boolean
}

/**
 * Última red de seguridad: si algo explota en render (p. ej. datos con forma
 * válida pero contenido inesperado), muestra una pantalla de recuperación en
 * vez de la pantalla blanca. Reiniciar vuelve a montar el árbol; borrar datos
 * es la salida nuclear — la copia del grupo se recupera entrando con el PIN.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { error: null, confirmandoBorrado: false }

  static getDerivedStateFromError(error: Error): Partial<Estado> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Casi Pádel crasheó:', error, info.componentStack)
  }

  /** rescata la copia local antes de que el usuario la borre */
  private descargarBackup(): void {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw === null) return
      const blob = new Blob([raw], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `casi-padel-rescate-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch {
      // sin descarga: quedan las otras salidas
    }
  }

  private renderRescate(error: Error): ReactNode {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
        <span className="text-6xl">🎾</span>
        <h1 className="font-display mt-4 text-2xl uppercase">Ups, acá se rompió algo</h1>
        <p className="mt-2 max-w-xs text-sm text-mute">
          No es culpa tuya. Reiniciá la app; si vuelve a fallar, guardá una copia de seguridad y
          arrancá de cero.
        </p>
        <div className="mt-7 flex w-full max-w-xs flex-col gap-3">
          <button
            type="button"
            onClick={() => this.setState({ error: null, confirmandoBorrado: false })}
            className="font-display btn-glow flex h-14 w-full items-center justify-center rounded-full bg-lime text-lg uppercase tracking-wide text-night"
          >
            ↻ Reiniciar
          </button>
          <button
            type="button"
            onClick={() => this.descargarBackup()}
            className="font-display flex h-14 w-full items-center justify-center rounded-full border border-white/15 bg-white/5 text-lg uppercase tracking-wide text-ink"
          >
            📤 Guardar copia
          </button>
          {this.state.confirmandoBorrado ? (
            <>
              <p className="text-xs text-mute">
                Se borra la copia local de este dispositivo. Si el grupo está en la nube, entrás de
                nuevo con el PIN y todo vuelve.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => this.setState({ confirmandoBorrado: false })}
                  className="font-display flex-1 rounded-full border border-white/15 bg-white/5 py-3 text-sm uppercase tracking-wide text-ink"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearLeagueStorage()
                    window.location.reload()
                  }}
                  className="font-display flex-1 rounded-full border border-danger/40 py-3 text-sm uppercase tracking-wide text-danger"
                >
                  Sí, borrar
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => this.setState({ confirmandoBorrado: true })}
              className="w-full py-2 text-xs font-semibold text-danger/80"
            >
              Borrar datos de este dispositivo
            </button>
          )}
        </div>
        {import.meta.env.DEV && (
          <pre className="mt-6 max-w-full overflow-x-auto rounded-2xl bg-white/5 p-3 text-left text-[10px] text-mute">
            {error.message}
          </pre>
        )}
      </div>
    )
  }

  render(): ReactNode {
    return this.state.error === null ? this.props.children : this.renderRescate(this.state.error)
  }
}
