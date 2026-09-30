import { fireEvent, render, screen } from '@testing-library/react'
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

  it('editar jugador cambia el nombre, persiste y queda marcado como editado', async () => {
    window.localStorage.setItem(
      'casi-padel:v1',
      JSON.stringify({
        version: 1,
        players: [{ id: 'p1', name: 'Fede', emoji: '🦈', hue: 200, createdAt: '' }],
        sessions: [],
      }),
    )
    render(
      <MemoryRouter initialEntries={['/players']}>
        <LeagueProvider>
          <App />
        </LeagueProvider>
      </MemoryRouter>,
    )
    fireEvent.click(await screen.findByText('Fede'))
    fireEvent.change(await screen.findByLabelText(/nombre/i), {
      target: { value: 'Federico' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Federico')).toBeInTheDocument()
    const stored = JSON.parse(window.localStorage.getItem('casi-padel:v1')!)
    expect(stored.players[0].name).toBe('Federico')
    // la marca de edición es la que evita que la fusión revierta el nombre
    expect(stored.players[0].updatedAt).toBeTruthy()
  })
})
