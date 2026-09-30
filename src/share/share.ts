export type ShareResult = 'shared' | 'downloaded' | 'cancel'

/**
 * Comparte el contenido del canvas: Web Share con archivo (abre WhatsApp directo
 * en iOS/Android) y, si no está soportado, descarga del PNG para mandar a mano.
 */
export async function shareCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
): Promise<ShareResult> {
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  if (blob === null) throw new Error('no se pudo generar la imagen')

  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean
  }
  if (typeof nav.share === 'function' && nav.canShare?.({ files: [new File([], filename)] })) {
    const file = new File([blob], filename, { type: 'image/png' })
    try {
      await nav.share({ files: [file], title: 'Casi Pádel' })
      return 'shared'
    } catch (err) {
      // cancelar la hoja de compartir no es un error para el usuario
      if ((err as DOMException).name === 'AbortError') return 'cancel'
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
