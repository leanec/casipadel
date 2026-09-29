import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { League } from './types'
import { freshLeague } from './repository'
import { fetchRemote, pushRemote, SyncEngine, SyncError } from './sync'

const PIN = '4271'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const league: League = { version: 1, players: [], sessions: [] }

beforeEach(() => {
  window.localStorage.setItem('casi-padel:pin', PIN)
})

afterEach(() => {
  window.localStorage.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('fetchRemote', () => {
  it('trae data y revisión', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { data: league, revision: 7 }))
    vi.stubGlobal('fetch', fetchMock)
    const snap = await fetchRemote(PIN)
    expect(snap.revision).toBe(7)
    expect(snap.data).toEqual(league)
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ pin: PIN })
  })

  it('PIN incorrecto ⇒ SyncError pin', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { error: 'pin' })))
    await expect(fetchRemote('0000')).rejects.toMatchObject({ code: 'pin' })
  })

  it('bloqueo por intentos ⇒ SyncError rate', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(429, { error: 'rate' })))
    await expect(fetchRemote(PIN)).rejects.toMatchObject({ code: 'rate' })
  })

  it('sin red ⇒ SyncError red', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    await expect(fetchRemote(PIN)).rejects.toBeInstanceOf(SyncError)
    await expect(fetchRemote(PIN)).rejects.toMatchObject({ code: 'red' })
  })
})

describe('pushRemote', () => {
  it('guarda y devuelve la revisión nueva', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { revision: 8 }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await pushRemote(PIN, 7, league)
    expect(res).toEqual({ ok: true, revision: 8 })
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({ pin: PIN, revision: 7, data: league })
  })

  it('revisión vieja ⇒ conflicto con el estado del servidor', async () => {
    const server = { version: 1, players: [{ id: 'x' }], sessions: [] }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(409, { error: 'revision', data: server, revision: 9 })),
    )
    const res = await pushRemote(PIN, 7, league)
    expect(res).toEqual({ ok: false, conflict: { data: server, revision: 9 } })
  })
})

describe('SyncEngine', () => {
  it('localChanged empuja con debounce y marca sincronizado', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { revision: 3 }))
    vi.stubGlobal('fetch', fetchMock)
    const statuses: string[] = []
    const engine = new SyncEngine({
      getLeague: () => league,
      applyRemote: vi.fn(),
      onPinInvalid: vi.fn(),
      onStatus: s => statuses.push(s),
    })
    engine.setRevision(2)
    engine.localChanged()
    expect(fetchMock).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1100)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(engine.getRevision()).toBe(3)
    expect(engine.isDirty()).toBe(false)
    expect(statuses).toEqual(['syncing', 'synced'])
    engine.stop()
    vi.useRealTimers()
  })

  it('conflicto 409: fusiona con applyRemote, reintenta una vez y cierra', async () => {
    vi.useFakeTimers()
    const serverLeague = freshLeague()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(409, { data: serverLeague, revision: 5 }))
      .mockResolvedValueOnce(jsonResponse(200, { revision: 6 }))
    vi.stubGlobal('fetch', fetchMock)
    const applyRemote = vi.fn()
    const engine = new SyncEngine({
      getLeague: () => league,
      applyRemote,
      onPinInvalid: vi.fn(),
      onStatus: () => {},
    })
    engine.setRevision(4)
    engine.localChanged()
    await vi.advanceTimersByTimeAsync(1100)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(applyRemote).toHaveBeenCalledWith(serverLeague, 5)
    expect(engine.getRevision()).toBe(6)
    expect(engine.isDirty()).toBe(false)
    engine.stop()
    vi.useRealTimers()
  })

  it('sin conexión queda offline y dirty para reintentar', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    const statuses: string[] = []
    const engine = new SyncEngine({
      getLeague: () => league,
      applyRemote: vi.fn(),
      onPinInvalid: vi.fn(),
      onStatus: s => statuses.push(s),
    })
    engine.setRevision(1)
    engine.localChanged()
    await vi.advanceTimersByTimeAsync(1100)
    expect(engine.isDirty()).toBe(true)
    expect(statuses).toEqual(['syncing', 'offline'])
    engine.stop()
    vi.useRealTimers()
  })

  it('sin PIN guardado no empuja', async () => {
    window.localStorage.removeItem('casi-padel:pin')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const engine = new SyncEngine({
      getLeague: () => league,
      applyRemote: vi.fn(),
      onPinInvalid: vi.fn(),
      onStatus: () => {},
    })
    await engine.pushNow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('PIN inválido durante el push ⇒ onPinInvalid', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { error: 'pin' })))
    const onPinInvalid = vi.fn()
    const engine = new SyncEngine({
      getLeague: () => league,
      applyRemote: vi.fn(),
      onPinInvalid,
      onStatus: () => {},
    })
    engine.setRevision(1)
    engine.localChanged()
    await vi.advanceTimersByTimeAsync(1100)
    expect(onPinInvalid).toHaveBeenCalled()
    engine.stop()
    vi.useRealTimers()
  })
})
