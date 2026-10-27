import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { LeagueProvider } from '../data/store'
import type { League, Match, Session } from '../data/types'

vi.mock('../components/confetti', () => ({ celebrate: vi.fn() }))

const p = (id: string, name: string) => ({ id, name, emoji: '🎾', hue: 100, createdAt: '' })

const players = [
  p('p1', 'Ana'),
  p('p2', 'Ari'),
  p('p3', 'Ivo'),
  p('p4', 'Oti'),
  p('p5', 'Uva'),
  p('p6', 'Ema'),
  p('p7', 'Noe'),
  p('p8', 'Sol'),
]

const teams = [
  { id: 'TA', playerIds: ['p1', 'p2'] as [string, string], name: 'Equipo A', color: 'lima' as const },
  { id: 'TB', playerIds: ['p3', 'p4'] as [string, string], name: 'Equipo B', color: 'cian' as const },
  { id: 'TC', playerIds: ['p5', 'p6'] as [string, string], name: 'Equipo C', color: 'magenta' as const },
  { id: 'TD', playerIds: ['p7', 'p8'] as [string, string], name: 'Equipo D', color: 'naranja' as const },
]

const m = (id: string, round: 1 | 2 | 3, court: 1 | 2, a: string, b: string, winner?: 'A' | 'B'): Match => ({
  id,
  round,
  court,
  teamAId: a,
  teamBId: b,
  ...(winner === undefined ? {} : { result: { winner } }),
})

/** Sorteo completo de 6 partidos; `ganadores` dice quién gana cada uno (undefined = sin jugar) */
function sessionCon(ganadores: ('A' | 'B' | undefined)[]): Session {
  return {
    id: 's1',
    date: '2026-10-26',
    playerIds: players.map(x => x.id),
    teams,
    matches: [
      m('m1', 1, 1, 'TA', 'TB', ganadores[0]),
      m('m2', 1, 2, 'TC', 'TD', ganadores[1]),
      m('m3', 2, 1, 'TA', 'TC', ganadores[2]),
      m('m4', 2, 2, 'TB', 'TD', ganadores[3]),
      m('m5', 3, 1, 'TA', 'TD', ganadores[4]),
      m('m6', 3, 2, 'TB', 'TC', ganadores[5]),
    ],
    status: 'live',
  }
}

function renderApp() {
  render(
    <MemoryRouter initialEntries={['/session/s1']}>
      <LeagueProvider>
        <App />
      </LeagueProvider>
    </MemoryRouter>,
  )
}

const ligaEnLocalStorage = () => JSON.parse(window.localStorage.getItem('casi-padel:v1') ?? '') as League

describe('Session: cierre de jornada', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('permite cerrar con menos de 6 partidos, pidiendo confirmación', async () => {
    // 4 jugados (TA gana 2), 2 quedan sin jugar
    window.localStorage.setItem('casi-padel:v1', JSON.stringify({ version: 1, players, sessions: [sessionCon(['A', 'A', 'A', 'B', undefined, undefined])] }))
    renderApp()
    expect(await screen.findByText('4/6 partidos')).toBeInTheDocument()
    expect(screen.getByText(/jornada incompleta/i)).toBeInTheDocument()

    // primero pide confirmación
    fireEvent.click(screen.getByText(/cerrar y coronar/i))
    expect(screen.getByText('Cerrar con 4/6')).toBeInTheDocument()
    expect(screen.getByText(/seguir jugando/i)).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cerrar con 4/6'))

    // termina en la celebración con TA de campeón
    expect(await screen.findByText(/campeones del día/i)).toBeInTheDocument()
    expect(screen.getByText('Ana & Ari')).toBeInTheDocument()
    await waitFor(() => {
      const liga = ligaEnLocalStorage()
      expect(liga.sessions[0].status).toBe('finished')
      expect(liga.sessions[0].championTeamIds).toEqual(['TA'])
    })
  })

  it('con los 6 jugados cierra directo, sin confirmación', async () => {
    window.localStorage.setItem('casi-padel:v1', JSON.stringify({ version: 1, players, sessions: [sessionCon(['A', 'B', 'A', 'B', 'A', 'B'])] }))
    renderApp()
    expect(await screen.findByText(/jornada completa/i)).toBeInTheDocument()

    fireEvent.click(screen.getByText(/cerrar y coronar/i))

    expect(await screen.findByText(/campeones del día/i)).toBeInTheDocument()
    expect(screen.queryByText(/seguir jugando/i)).not.toBeInTheDocument()
  })

  it('con 0 partidos jugados no ofrece cerrar', async () => {
    window.localStorage.setItem('casi-padel:v1', JSON.stringify({ version: 1, players, sessions: [sessionCon([undefined, undefined, undefined, undefined, undefined, undefined])] }))
    renderApp()
    expect(await screen.findByText('0/6 partidos')).toBeInTheDocument()
    expect(screen.queryByText(/cerrar y coronar/i)).not.toBeInTheDocument()
    expect(screen.getByText(/volver a sortear/i)).toBeInTheDocument()
  })
})
