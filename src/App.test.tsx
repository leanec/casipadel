import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'
import { LeagueProvider } from './data/store'

describe('App', () => {
  it('muestra el onboarding cuando no hay jugadores', async () => {
    window.localStorage.removeItem?.('casi-padel:v1')
    render(
      <MemoryRouter>
        <LeagueProvider>
          <App />
        </LeagueProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByText(/armá el grupo/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cargar jugadores/i })).toBeInTheDocument()
  })
})
