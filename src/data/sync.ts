import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase'
import { storedPin } from './pin'
import type { League } from './types'

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'offline' | 'pin'

export type SyncErrorCode = 'red' | 'pin' | 'rate' | 'sin-liga' | 'interno'

export class SyncError extends Error {
  constructor(
    public code: SyncErrorCode,
    message: string,
  ) {
    super(message)
  }
}

export interface RemoteSnapshot {
  data: League
  revision: number
}

export type PushResult =
  | { ok: true; revision: number }
  | { ok: false; conflict: RemoteSnapshot }

async function postEdge(
  name: string,
  body: unknown,
): Promise<{ status: number; json: Record<string, unknown> }> {
  let res: Response
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY ?? '',
        Authorization: `Bearer ${SUPABASE_ANON_KEY ?? ''}`,
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new SyncError('red', 'sin conexión con el grupo')
  }
  let json: Record<string, unknown>
  try {
    json = (await res.json()) as Record<string, unknown>
  } catch {
    json = {}
  }
  return { status: res.status, json }
}

/** Trae la liga del servidor (verifica el PIN en la edge function) */
export async function fetchRemote(pin: string): Promise<RemoteSnapshot> {
  const { status, json } = await postEdge('league-load', { pin })
  if (status === 200 && 'data' in json) {
    return { data: json.data as League, revision: Number(json.revision) }
  }
  throw syncErrorFrom(status, json)
}

/** Empuja la liga con la revisión esperada; 409 ⇒ conflicto con el estado del servidor */
export async function pushRemote(pin: string, revision: number, data: League): Promise<PushResult> {
  const { status, json } = await postEdge('league-save', { pin, revision, data })
  if (status === 200) return { ok: true, revision: Number(json.revision) }
  if (status === 409) {
    return { ok: false as const, conflict: { data: json.data as League, revision: Number(json.revision) } }
  }
  throw syncErrorFrom(status, json)
}

function syncErrorFrom(status: number, json: Record<string, unknown>): SyncError {
  const code = typeof json.error === 'string' ? json.error : ''
  if (status === 401 || code === 'pin') return new SyncError('pin', 'PIN incorrecto')
  if (status === 429 || code === 'rate') return new SyncError('rate', 'demasiados intentos')
  if (status === 404 || code === 'sin-liga') return new SyncError('sin-liga', 'el grupo no existe')
  return new SyncError('interno', 'error del servidor')
}

export interface SyncEngineOpts {
  getLeague(): League
  /** aplica la fusión local↔remota en el estado (sin marcar dirty) */
  applyRemote(remote: League, revision: number): void
  onPinInvalid(): void
  onStatus(status: SyncStatus): void
}

const PUSH_DEBOUNCE_MS = 1000

/**
 * Motor de sincronización: push con debounce de cada mutación local, pull ante
 * realtime/foco/conexión, concurrencia optimista por revisión con una fusión y
 * un reintento si el servidor reporta 409.
 */
export class SyncEngine {
  private dirty = false
  private pushing = false
  private stopped = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private revision: number

  constructor(private opts: SyncEngineOpts) {
    this.revision = 0
  }

  getRevision(): number {
    return this.revision
  }

  isDirty(): boolean {
    return this.dirty
  }

  isPushing(): boolean {
    return this.pushing
  }

  /** tras "salir del grupo" el motor se detiene; un nuevo desbloqueo lo revive */
  restart(): void {
    this.stopped = false
  }

  setRevision(revision: number): void {
    this.revision = revision
  }

  /** aplica un snapshot ya traído (sin volver a pedirlo) */
  applySnapshot(snap: RemoteSnapshot): void {
    this.revision = snap.revision
    this.opts.applyRemote(snap.data, snap.revision)
  }

  /** cada mutación local programa un push (debounce) */
  localChanged(): void {
    if (this.stopped) return
    this.dirty = true
    if (this.timer === null) {
      this.timer = setTimeout(() => {
        this.timer = null
        void this.pushNow()
      }, PUSH_DEBOUNCE_MS)
    }
  }

  async pushNow(): Promise<void> {
    const pin = storedPin()
    if (this.stopped || this.pushing || pin === null) return
    this.pushing = true
    this.opts.onStatus('syncing')
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await pushRemote(pin, this.revision, this.opts.getLeague())
          if (res.ok) {
            this.revision = res.revision
            this.dirty = false
            this.opts.onStatus('synced')
            return
          }
          // 409: el servidor está más avanzado ⇒ fusionar y reintentar una vez
          this.revision = res.conflict.revision
          this.applySnapshot(res.conflict)
        } catch (err) {
          if (err instanceof SyncError && err.code === 'pin') {
            this.opts.onPinInvalid()
            return
          }
          throw err
        }
      }
      // el reintento tampoco cerró (p. ej. otro 409): queda dirty, reintenta luego
      this.opts.onStatus('offline')
    } catch {
      this.opts.onStatus('offline')
    } finally {
      this.pushing = false
      if (this.dirty && !this.stopped) this.localChanged()
    }
  }

  /**
   * Pull: silencioso de arranque — es una actualización de fondo (foco,
   * realtime, reconexión) y anunciarla hacía parpadear el chip. Solo cambia el
   * estado si trajo cambios (⇒ push), cerró bien o falló la red.
   */
  async pull(): Promise<void> {
    const pin = storedPin()
    if (this.stopped || pin === null) return
    try {
      const snap = await fetchRemote(pin)
      // aplica si el servidor avanzó o si el contenido difiere (cambios locales
      // varados sin sincronizar: la fusión los devuelve al grupo)
      const sameRevision = snap.revision === this.revision
      const sameContent = JSON.stringify(snap.data) === JSON.stringify(this.opts.getLeague())
      if (!sameRevision || !sameContent) {
        this.applySnapshot(snap)
      }
      if (this.dirty) await this.pushNow()
      else this.opts.onStatus('synced')
    } catch (err) {
      if (err instanceof SyncError && err.code === 'pin') this.opts.onPinInvalid()
      else this.opts.onStatus('offline')
    }
  }

  stop(): void {
    this.stopped = true
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
  }
}
