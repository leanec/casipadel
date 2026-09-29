import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { LeagueProvider } from '../data/store'
import type { League } from '../data/types'

/** Liga mínima con una jornada cerrada: A (Ana/Ari) barre y es campeón */
function ligaConTemporada(): League {
  const p = (id: string, name: string) => ({
    id,
    name,
    emoji: '🎾',
    hue: 100,
    createdAt: '',
  })
  const teams = [
    { id: 'TA', playerIds: ['pa', 'pe'] as [string, string], name: 'Equipo A', color: 'lima' as const },
    { id: 'TB', playerIds: ['pi', 'po'] as [string, string], name: 'Equipo B', color: 'cian' as const },
  ]
  const m = (id: string, a: string, b: string, winner: 'A' | 'B') => ({
    id,
    round: 1 as const,
    court: 1 as const,
    teamAId: a,
    teamBId: b,
    result: { winner },
  })
  return {
    version: 1,
    players: [p('pa', 'Ana'), p('pe', 'Ari'), p('pi', 'Ivo'), p('po', 'Oti')],
    sessions: [
      {
        id: 's1',
        date: '2026-09-21',
        playerIds: ['pa', 'pe', 'pi', 'po'],
        teams,
        matches: [m('m1', 'TA', 'TB', 'A')],
        status: 'finished',
        championTeamIds: ['TA'],
      },
    ],
  }
}

describe('Ranking', () => {
  it('muestra la tabla con ELO cuando hay temporada cerrada', async () => {
    window.localStorage.setItem('casi-padel:v1', JSON.stringify(ligaConTemporada()))
    render(
      <MemoryRouter initialEntries={['/ranking']}>
        <LeagueProvider>
          <App />
        </LeagueProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByText('Ana')).toBeInTheDocument()
    // los que barrieron quedaron arriba de 1000 (los dos del equipo campeón)
    expect(await screen.findAllByText('1016')).toHaveLength(2)
    expect(screen.getByText(/temporada elo/i)).toBeInTheDocument()
  })

  it('estado vacío sin jornadas cerradas', async () => {
    window.localStorage.setItem(
      'casi-padel:v1',
      JSON.stringify({ version: 1, players: [], sessions: [] }),
    )
    render(
      <MemoryRouter initialEntries={['/ranking']}>
        <LeagueProvider>
          <App />
        </LeagueProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByText(/todavía no hay temporada/i)).toBeInTheDocument()
  })
})
