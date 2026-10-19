import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LeagueProvider } from '../data/store'
import { buildBackup } from '../data/backup'
import { STORAGE_KEY } from '../data/local-storage'
import type { League } from '../data/types'
import BackupSection from './BackupSection'

const ligaVieja: League = {
  version: 1,
  players: [{ id: 'p0', name: 'Viejo', emoji: '🎾', hue: 0, createdAt: '' }],
  sessions: [],
}

const ligaNueva: League = {
  version: 1,
  players: [{ id: 'p1', name: 'Nuevo', emoji: '🦈', hue: 200, createdAt: '' }],
  sessions: [],
}

/** El input de archivo está escondido: hay que agarrarlo del DOM */
function elegirArchivo(contenido: string) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File([contenido], 'backup.json', { type: 'application/json' })
  Object.defineProperty(input, 'files', { value: [file] })
  fireEvent.change(input)
}

describe('BackupSection', () => {
  afterEach(() => window.localStorage.removeItem(STORAGE_KEY))

  it('importa un backup válido tras confirmar y reemplaza la liga', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ligaVieja))
    render(
      <LeagueProvider>
        <BackupSection />
      </LeagueProvider>,
    )
    await screen.findByRole('button', { name: /exportar/i })
    elegirArchivo(JSON.stringify(buildBackup(ligaNueva, 5)))

    // confirmación con el contenido del archivo, sin aplicar todavía
    expect(await screen.findByText(/restaurar este backup/i)).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).players[0].name).toBe('Viejo')

    fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }))
    await screen.findByText(/backup restaurado/i)
    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).players[0].name).toBe('Nuevo'),
    )
  })

  it('cancelar la confirmación deja la liga como estaba', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ligaVieja))
    render(
      <LeagueProvider>
        <BackupSection />
      </LeagueProvider>,
    )
    await screen.findByRole('button', { name: /exportar/i })
    elegirArchivo(JSON.stringify(buildBackup(ligaNueva, 5)))
    await screen.findByText(/restaurar este backup/i)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText(/restaurar este backup/i)).not.toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).players[0].name).toBe('Viejo')
  })

  it('rechaza un archivo que no es un backup con un mensaje claro', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ligaVieja))
    render(
      <LeagueProvider>
        <BackupSection />
      </LeagueProvider>,
    )
    await screen.findByRole('button', { name: /exportar/i })
    elegirArchivo('{"hola":1}')
    expect(await screen.findByText(/no parece un backup/i)).toBeInTheDocument()
    expect(screen.queryByText(/restaurar este backup/i)).not.toBeInTheDocument()
  })
})
