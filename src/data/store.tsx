import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { leagueRepository } from './local-storage'
import { freshLeague } from './repository'
import { championTeamIds } from '../logic/standings'
import { drawTeams, pairHistory } from '../logic/draw'
import { buildFixture } from '../logic/fixture'
import { uuid } from '../logic/random'
import { SUPABASE_ANON_KEY, SUPABASE_URL, modoGrupo } from './supabase'
import {
  clearLeagueStorage,
  clearPin,
  savePin,
  saveRevision,
  storedPin,
  storedRevision,
} from './pin'
import { mergeLeagues } from './merge'
import { fetchRemote, SyncEngine, type RemoteSnapshot, type SyncStatus } from './sync'
import PinGate from '../screens/PinGate'
import type { League, MatchResult, Session } from './types'

export interface PlayerInput {
  name: string
  emoji: string
  hue: number
}

interface LeagueActions {
  addPlayer(input: PlayerInput): void
  updatePlayer(id: string, patch: Partial<PlayerInput>): void
  deletePlayer(id: string): void
  createSession(date: string, playerIds: string[]): string
  setMatchResult(sessionId: string, matchId: string, result: MatchResult | undefined): void
  swapCourt(sessionId: string, matchId: string): void
  setTeamName(sessionId: string, teamId: string, name: string): void
  /** Solo permitido si ningún partido tiene resultado */
  redrawTeams(sessionId: string): void
  finishSession(sessionId: string): void
  /** Corrección: una jornada cerrada vuelve a estar en curso (resultados editables) */
  reopenSession(sessionId: string): void
  /** Borra la jornada y deja el tombstone para que el sync no la reviva */
  deleteSession(sessionId: string): void
}

export type UnlockResult = 'ok' | 'empty' | 'pin' | 'rate' | 'sin-liga' | 'red'

interface GroupApi {
  modoGrupo: boolean
  status: SyncStatus
  unlock(pin: string): Promise<UnlockResult>
  resolveMigration(choice: 'upload' | 'fresh'): void
  leaveGroup(): void
  refresh(): void
}

interface LeagueContextValue {
  league: League
  actions: LeagueActions
  group: GroupApi
}

const LeagueContext = createContext<LeagueContextValue | null>(null)

function updateSession(league: League, sessionId: string, fn: (s: Session) => Session): League {
  return { ...league, sessions: league.sessions.map(s => (s.id === sessionId ? fn(s) : s)) }
}

export function LeagueProvider({ children }: { children: ReactNode }) {
  const [league, setLeague] = useState<League | null>(null)
  const [locked, setLocked] = useState(false)
  const [migrationPending, setMigrationPending] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(modoGrupo ? 'syncing' : 'local')

  // la primera corrida del efecto de guardado hidrata desde localStorage: no es
  // una mutación y no debe disparar un push
  const hydratingRef = useRef(true)
  // aplicamos datos del servidor sin marcar dirty (ya están guardados allá)
  const suppressSyncRef = useRef(false)
  const lockedRef = useRef(false)
  lockedRef.current = locked

  const leagueRef = useRef<League>(league ?? freshLeague())
  leagueRef.current = league ?? freshLeague()

  const engineRef = useRef<SyncEngine | null>(null)
  const migrationSnapRef = useRef<{ pin: string; snap: RemoteSnapshot } | null>(null)
  if (engineRef.current === null) {
    engineRef.current = new SyncEngine({
      getLeague: () => leagueRef.current,
      applyRemote: (remote, revision) => {
        const merged = mergeLeagues(leagueRef.current, remote)
        saveRevision(revision)
        suppressSyncRef.current = true
        setLeague(merged)
        // la fusión aportó algo local que el servidor no tiene ⇒ hay que subirlo
        const engine = engineRef.current
        if (
          engine !== null &&
          !engine.isPushing() &&
          JSON.stringify(merged) !== JSON.stringify(remote)
        ) {
          engine.localChanged()
        }
      },
      onPinInvalid: () => {
        clearPin()
        setSyncStatus('pin')
        setLocked(true)
      },
      onStatus: setSyncStatus,
    })
  }
  const engine = engineRef.current

  useEffect(() => {
    let alive = true
    void leagueRepository.load().then(l => {
      if (!alive) return
      setLeague(l)
      if (!modoGrupo) return
      if (storedPin() !== null) {
        engine.setRevision(storedRevision())
        void engine.pull()
      } else {
        setLocked(true)
      }
    })
    return () => {
      alive = false
    }
  }, [])

  // persistencia local en cada cambio + aviso al motor de sync
  useEffect(() => {
    if (league === null) return
    void leagueRepository.save(league)
    if (hydratingRef.current) {
      hydratingRef.current = false
      return
    }
    if (suppressSyncRef.current) {
      suppressSyncRef.current = false
      return
    }
    if (modoGrupo && !lockedRef.current && storedPin() !== null) engine.localChanged()
  }, [league])

  // respaldo al ocultar la pestaña + empujar lo pendiente
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState !== 'hidden') return
      void leagueRepository.save(leagueRef.current)
      if (modoGrupo && engine.isDirty()) void engine.pushNow()
    }
    document.addEventListener('visibilitychange', onHidden)
    return () => document.removeEventListener('visibilitychange', onHidden)
  }, [])

  // realtime + refresh al volver: solo con el grupo desbloqueado.
  // supabase-js se carga recién acá (dinámico) para no pesar en el modo local.
  useEffect(() => {
    if (!modoGrupo || locked) return
    let cancelado = false
    let client: SupabaseClient | null = null
    let channel: RealtimeChannel | null = null

    void import('@supabase/supabase-js').then(({ createClient }) => {
      if (cancelado) return
      client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY!)
      channel = client
        .channel('casi-padel:meta')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'league_meta' },
          (payload: { new: { revision?: number } }) => {
            const rev = Number(payload.new?.revision)
            if (Number.isFinite(rev) && rev > engine.getRevision() && !engine.isDirty()) {
              void engine.pull()
            }
          },
        )
        .subscribe()
    })

    let ultimaPull = 0
    // foco: pull de fondo a lo sumo cada 15 s (el realtime cubre el resto)
    const onFocus = () => {
      if (engine.isDirty()) {
        void engine.pushNow()
        return
      }
      if (Date.now() - ultimaPull > 15_000) {
        ultimaPull = Date.now()
        void engine.pull()
      }
    }
    // reconexión: refresco inmediato
    const onOnline = () => {
      void (engine.isDirty() ? engine.pushNow() : engine.pull())
    }
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onOnline)
    return () => {
      cancelado = true
      if (client !== null && channel !== null) void client.removeChannel(channel)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onOnline)
    }
  }, [locked])

  const finalizeUnlock = (pin: string, snap: RemoteSnapshot) => {
    savePin(pin)
    engine.restart()
    engine.applySnapshot(snap)
    setLocked(false)
  }

  const actions = useMemo<LeagueActions>(() => {
    // las acciones solo se exponen con la liga cargada; TS no lo sabe
    const update = (fn: (league: League) => League) =>
      setLeague(l => (l === null ? l : fn(l)))
    return {
      addPlayer: input =>
        update(l => ({
          ...l,
          players: [
            ...l.players,
            { id: uuid(), createdAt: new Date().toISOString(), ...input },
          ],
        })),
      updatePlayer: (id, patch) =>
        update(l => ({
          ...l,
          players: l.players.map(p => (p.id === id ? { ...p, ...patch } : p)),
        })),
      deletePlayer: id =>
        update(l => ({
          ...l,
          players: l.players.filter(p => p.id !== id),
          deletedPlayerIds: [...(l.deletedPlayerIds ?? []), id].sort(),
        })),
      createSession: (date, playerIds) => {
        const id = uuid()
        update(l => {
          const teams = drawTeams(playerIds, pairHistory(l.sessions))
          const session: Session = {
            id,
            date,
            playerIds,
            teams,
            matches: buildFixture(teams),
            status: 'live',
          }
          return { ...l, sessions: [session, ...l.sessions] }
        })
        return id
      },
      setMatchResult: (sessionId, matchId, result) =>
        update(l =>
          updateSession(l, sessionId, s => ({
            ...s,
            matches: s.matches.map(m => (m.id === matchId ? { ...m, result } : m)),
          })),
        ),
      swapCourt: (sessionId, matchId) =>
        update(l =>
          updateSession(l, sessionId, s => ({
            ...s,
            matches: s.matches.map(m =>
              m.id === matchId ? { ...m, court: m.court === 1 ? 2 : 1 } : m,
            ),
          })),
        ),
      setTeamName: (sessionId, teamId, name) =>
        update(l =>
          updateSession(l, sessionId, s => ({
            ...s,
            teams: s.teams.map(t => (t.id === teamId ? { ...t, name } : t)),
          })),
        ),
      redrawTeams: sessionId =>
        update(l =>
          updateSession(l, sessionId, s => {
          if (s.matches.some(m => m.result !== undefined)) return s
          // el re-sorteo no se cuenta a sí mismo en el historial de duplas
          const teams = drawTeams(s.playerIds, pairHistory(l.sessions, sessionId))
            return { ...s, teams, matches: buildFixture(teams) }
          }),
        ),
      finishSession: sessionId =>
        update(l =>
          updateSession(l, sessionId, s => {
            if (s.status === 'finished') return s
            return {
              ...s,
              status: 'finished',
              championTeamIds: championTeamIds(s.teams, s.matches),
            }
          }),
        ),
      reopenSession: sessionId =>
        update(l =>
          updateSession(l, sessionId, s => {
            if (s.status !== 'finished') return s
            return { ...s, status: 'live', championTeamIds: undefined }
          }),
        ),
      deleteSession: sessionId =>
        update(l => ({
          ...l,
          sessions: l.sessions.filter(s => s.id !== sessionId),
          deletedSessionIds: [...(l.deletedSessionIds ?? []), sessionId].sort(),
        })),
    }
  }, [])

  const group = useMemo<GroupApi>(
    () => ({
      modoGrupo,
      status: syncStatus,
      async unlock(pin) {
        setSyncStatus('syncing')
        let snap: RemoteSnapshot
        try {
          snap = await fetchRemote(pin)
        } catch (err) {
          const code = (err as { code?: string }).code
          if (code === 'pin') {
            setSyncStatus('pin')
            return 'pin'
          }
          if (code === 'rate') {
            setSyncStatus('offline')
            return 'rate'
          }
          if (code === 'sin-liga') {
            setSyncStatus('offline')
            return 'sin-liga'
          }
          setSyncStatus('offline')
          return 'red'
        }
        // grupo vacío + liga local con datos ⇒ ofrecer subir la local (migración F1)
        if (snap.data.players.length === 0 && leagueRef.current.players.length > 0) {
          migrationSnapRef.current = { pin, snap }
          setMigrationPending(true)
          return 'empty'
        }
        finalizeUnlock(pin, snap)
        return 'ok'
      },
      resolveMigration(choice) {
        const pending = migrationSnapRef.current
        if (pending === null) return
        migrationSnapRef.current = null
        setMigrationPending(false)
        if (choice === 'fresh') {
          // arrancar de cero: se descartan los datos de este dispositivo
          suppressSyncRef.current = true
          setLeague(freshLeague())
        }
        finalizeUnlock(pending.pin, pending.snap)
      },
      leaveGroup() {
        engine.stop()
        clearLeagueStorage()
        suppressSyncRef.current = true
        setLeague(freshLeague())
        setMigrationPending(false)
        setSyncStatus('local')
        setLocked(true)
      },
      refresh() {
        void engine.pull()
      },
    }),
    [syncStatus],
  )

  // placeholder si la liga aún no cargó: en ese caso no se renderiza el Provider
  const value = useMemo<LeagueContextValue>(
    () => ({ league: league ?? freshLeague(), actions, group }),
    [league, actions, group],
  )

  if (league === null) {
    // pantalla de carga: wordmark latiendo
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="font-display animate-pulse -skew-x-6 text-4xl uppercase">
          <span className="text-ink">Casi</span> <span className="text-lime">Pádel</span>
        </p>
      </div>
    )
  }

  return (
    <LeagueContext.Provider value={value}>
      {locked ? <PinGate migrationPending={migrationPending} /> : children}
    </LeagueContext.Provider>
  )
}

export function useLeague(): LeagueContextValue {
  const ctx = useContext(LeagueContext)
  if (ctx === null) throw new Error('useLeague tiene que usarse dentro de LeagueProvider')
  return ctx
}
