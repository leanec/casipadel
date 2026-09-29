import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LeagueProvider } from '../data/store'
import PinGate from './PinGate'

describe('PinGate', () => {
  it('muestra el teclado del PIN', async () => {
    window.localStorage.removeItem('casi-padel:v1')
    render(
      <MemoryRouter>
        <LeagueProvider>
          <PinGate migrationPending={false} />
        </LeagueProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByText(/ingresá el pin del grupo/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeDisabled()
  })
})
