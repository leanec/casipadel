import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ErrorBoundary from './ErrorBoundary'
import { STORAGE_KEY } from '../data/local-storage'

/** Explota en render cuando se le pide; lo demás del tiempo renderiza sano */
function Bomba({ explota }: { explota: boolean }) {
  if (explota) throw new Error('bum')
  return <p>todo bien</p>
}

/** El error típico de "reiniciar arregla": tira mientras el flag está prendido */
let explotaGlobal = false
function BombaGlobal() {
  if (explotaGlobal) throw new Error('transitorio')
  return <p>todo bien</p>
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    explotaGlobal = false
    vi.restoreAllMocks()
    window.localStorage.removeItem(STORAGE_KEY)
  })

  it('muestra la pantalla de rescate cuando un hijo crashea', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Bomba explota />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/se rompió algo/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reiniciar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /guardar copia/i })).toBeInTheDocument()
    expect(screen.queryByText('todo bien')).not.toBeInTheDocument()
  })

  it('Reintentar recupera la app cuando el error era transitorio', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    explotaGlobal = true
    render(
      <ErrorBoundary>
        <BombaGlobal />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/se rompió algo/i)).toBeInTheDocument()
    // la condición que rompía desaparece (p. ej. una carrera que ya cerró)
    explotaGlobal = false
    fireEvent.click(screen.getByRole('button', { name: /reiniciar/i }))
    expect(screen.getByText('todo bien')).toBeInTheDocument()
  })

  it('borrar datos pide confirmación y limpia el storage', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    window.localStorage.setItem(STORAGE_KEY, '{"version":1,"players":[],"sessions":[]}')
    render(
      <ErrorBoundary>
        <Bomba explota />
      </ErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: /borrar datos/i }))
    // primer toque: solo confirma, no borra
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /sí, borrar/i }))
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
