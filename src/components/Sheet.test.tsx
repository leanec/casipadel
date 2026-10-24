import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Sheet from './Sheet'

// sin título para que los únicos enfocables del panel sean los botones hijos
function abrir(onClose = vi.fn()) {
  const utils = render(
    <Sheet onClose={onClose}>
      <button type="button">Primero</button>
      <button type="button">Último</button>
    </Sheet>,
  )
  return { ...utils, onClose }
}

describe('Sheet', () => {
  it('al abrir, el foco entra al panel del diálogo', () => {
    abrir()
    expect(screen.getByRole('dialog')).toHaveFocus()
  })

  it('Escape cierra el sheet', () => {
    const onClose = vi.fn()
    abrir(onClose)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('Tab desde el último enfocable vuelve al primero (trampa de foco)', () => {
    abrir()
    screen.getByRole('button', { name: 'Último' }).focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(screen.getByRole('button', { name: 'Primero' })).toHaveFocus()
  })

  it('Shift+Tab desde el primero salta al último', () => {
    abrir()
    screen.getByRole('button', { name: 'Primero' }).focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(screen.getByRole('button', { name: 'Último' })).toHaveFocus()
  })

  it('al cerrar devuelve el foco a lo que estaba enfocado antes de abrir', () => {
    const fuera = document.createElement('button')
    fuera.textContent = 'Fuera'
    document.body.appendChild(fuera)
    fuera.focus()
    const { unmount } = abrir()
    unmount()
    expect(fuera).toHaveFocus()
    fuera.remove()
  })
})
