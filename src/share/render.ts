import type { SeasonSummaryModel, SessionSummaryModel } from '../logic/summary'

/**
 * Motor de dibujo de las imágenes compartibles (canvas 2D puro, sin dependencias).
 * El contenido lo decide `src/logic/summary.ts`; acá solo se dibuja con el look
 * de la casa: noche, glass, lima neón, Anton + Inter.
 */

export const IMAGE_SIZE = { w: 1080, h: 1350 }

const NIGHT = '#070D1B'
const INK = '#EDF2FF'
const MUTE = '#8A97B8'
const LIME = '#C6F432'

const FONT_DISPLAY = 'Anton, "Arial Narrow", sans-serif'
const FONT_BODY = 'Inter, system-ui, sans-serif'

async function ensureFonts(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load(`76px ${FONT_DISPLAY}`),
      document.fonts.load(`600 40px ${FONT_BODY}`),
      document.fonts.load(`800 40px ${FONT_BODY}`),
    ])
    await document.fonts.ready
  } catch {
    /* sin fuentes cargadas ⇒ el sistema responde con su fallback */
  }
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function glassCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 28,
) {
  rr(ctx, x, y, w, h, r)
  ctx.fillStyle = 'rgba(21, 32, 58, 0.55)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = 2
  ctx.stroke()
}

/** Líneas de cancha sutiles de fondo */
function courtBackdrop(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.strokeStyle = 'rgba(198, 244, 50, 0.05)'
  ctx.lineWidth = 3
  // red central vertical + dos service lines
  ctx.beginPath()
  ctx.moveTo(540, 0)
  ctx.lineTo(540, IMAGE_SIZE.h)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(0, 380)
  ctx.lineTo(IMAGE_SIZE.w, 380)
  ctx.moveTo(0, 1000)
  ctx.lineTo(IMAGE_SIZE.w, 1000)
  ctx.stroke()
  ctx.restore()
}

function wordmark(ctx: CanvasRenderingContext2D, y: number) {
  ctx.save()
  ctx.translate(540, y)
  ctx.transform(1, 0, -0.14, 1, 0, 0)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `76px ${FONT_DISPLAY}`
  const wCasi = ctx.measureText('CASI ').width
  const wPadel = ctx.measureText('PÁDEL').width
  const startX = -(wCasi + wPadel) / 2
  ctx.textAlign = 'left'
  ctx.fillStyle = INK
  ctx.fillText('CASI ', startX, 0)
  ctx.fillStyle = LIME
  ctx.fillText('PÁDEL', startX + wCasi, 0)
  ctx.restore()
}

function tracking(ctx: CanvasRenderingContext2D, px: number) {
  ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`
}

function avatar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  hue: number,
  emoji: string,
) {
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  g.addColorStop(0, `hsl(${hue} 70% 55%)`)
  g.addColorStop(1, `hsl(${hue} 75% 34%)`)
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.font = `${Math.round(r * 0.95)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = INK
  ctx.fillText(emoji, cx, cy + r * 0.06)
}

/** Reduce el cuerpo de la fuente hasta que el texto entre en maxWidth (mínimo 34px) */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: string,
  max: number,
  maxWidth: number,
  family: string,
): number {
  let size = max
  for (; size > 34; size -= 2) {
    ctx.font = weight !== '' ? `${weight} ${size}px ${family}` : `${size}px ${family}`
    if (ctx.measureText(text).width <= maxWidth) break
  }
  return size
}

function ellipsis(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let out = text
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1)
  }
  return `${out}…`
}

function footer(ctx: CanvasRenderingContext2D, y = IMAGE_SIZE.h - 56) {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `800 22px ${FONT_BODY}`
  tracking(ctx, 4)
  ctx.fillStyle = MUTE
  ctx.fillText('CASIPADEL · LEANEC.GITHUB.IO/CASIPADEL', 540, y)
  tracking(ctx, 0)
}

function setup(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  canvas.width = IMAGE_SIZE.w
  canvas.height = IMAGE_SIZE.h
  const ctx = canvas.getContext('2d')
  if (ctx === null) throw new Error('canvas 2d no disponible')
  ctx.fillStyle = NIGHT
  ctx.fillRect(0, 0, IMAGE_SIZE.w, IMAGE_SIZE.h)
  courtBackdrop(ctx)
  return ctx
}

export async function drawSessionSummary(
  canvas: HTMLCanvasElement,
  model: SessionSummaryModel,
): Promise<void> {
  await ensureFonts()
  const ctx = setup(canvas)

  wordmark(ctx, 110)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `800 26px ${FONT_BODY}`
  tracking(ctx, 5)
  ctx.fillStyle = MUTE
  ctx.fillText(model.dateLabel.toUpperCase(), 540, 168)
  tracking(ctx, 0)

  ctx.font = '150px sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText('🏆', 540, 300)

  ctx.textBaseline = 'alphabetic'
  ctx.font = `800 24px ${FONT_BODY}`
  tracking(ctx, 6)
  ctx.fillStyle = MUTE
  ctx.fillText(
    model.coChampions ? 'CO-CAMPEONES DEL DÍA' : 'CAMPEONES DEL DÍA',
    540,
    424,
  )
  tracking(ctx, 0)

  const nameSize = fitFont(ctx, model.championNames, '', 84, 950, FONT_DISPLAY)
  ctx.font = `${nameSize}px ${FONT_DISPLAY}`
  ctx.save()
  ctx.shadowColor = 'rgba(198, 244, 50, 0.45)'
  ctx.shadowBlur = 34
  ctx.fillStyle = LIME
  ctx.fillText(ellipsis(ctx, model.championNames, 960), 540, 512)
  ctx.restore()

  ctx.font = `600 30px ${FONT_BODY}`
  ctx.fillStyle = INK
  ctx.fillText(ellipsis(ctx, model.championTeamName.toUpperCase(), 900), 540, 560)

  // tabla del día
  const top = 630
  const rowH = 108
  const gap = 16
  model.rows.forEach((row, i) => {
    const y = top + i * (rowH + gap)
    glassCard(ctx, 60, y, 960, rowH, 24)
    ctx.textBaseline = 'middle'

    ctx.textAlign = 'left'
    ctx.font = `600 34px ${FONT_BODY}`
    ctx.fillStyle = INK
    ctx.fillText(ellipsis(ctx, row.playerNames, 560), 100, y + rowH / 2 - 12)
    ctx.font = `800 20px ${FONT_BODY}`
    tracking(ctx, 3)
    ctx.fillStyle = MUTE
    ctx.fillText(ellipsis(ctx, row.teamName.toUpperCase(), 560), 100, y + rowH / 2 + 30)
    tracking(ctx, 0)

    ctx.textAlign = 'right'
    ctx.font = `44px ${FONT_DISPLAY}`
    ctx.fillStyle = row.won === 3 ? LIME : INK
    const score = `${row.won}–${row.lost}`
    ctx.fillText(score, 940, y + rowH / 2)
    if (row.badges !== '') {
      const scoreWidth = ctx.measureText(score).width
      ctx.font = '36px sans-serif'
      ctx.fillText(row.badges, 940 - scoreWidth - 56, y + rowH / 2)
    }
  })

  // badges del día como chips centradas
  if (model.badgeLines.length > 0) {
    const chipY = top + 4 * (rowH + gap) + 26
    ctx.font = `600 24px ${FONT_BODY}`
    const gapX = 16
    const widths = model.badgeLines.map(t => ctx.measureText(t).width + 56)
    const total = widths.reduce((s, w) => s + w, 0) + gapX * (model.badgeLines.length - 1)
    let x = 540 - total / 2
    model.badgeLines.forEach((text, i) => {
      const h = 52
      glassCard(ctx, x, chipY, widths[i], h, h / 2)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = INK
      ctx.fillText(text, x + widths[i] / 2, chipY + h / 2 + 1)
      x += widths[i] + gapX
    })
  }

  footer(ctx)
}

export async function drawSeasonSummary(
  canvas: HTMLCanvasElement,
  model: SeasonSummaryModel,
): Promise<void> {
  await ensureFonts()
  const ctx = setup(canvas)

  wordmark(ctx, 110)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `64px ${FONT_DISPLAY}`
  ctx.fillStyle = INK
  ctx.fillText('TEMPORADA', 540, 216)

  ctx.font = `800 26px ${FONT_BODY}`
  tracking(ctx, 5)
  ctx.fillStyle = MUTE
  const plural = model.jornadas === 1 ? 'JORNADA' : 'JORNADAS'
  ctx.fillText(`${model.jornadas} ${plural} · RANKING ELO`, 540, 262)
  tracking(ctx, 0)

  const top = 330
  const rowH = 148
  const gap = 20
  model.rows.forEach((row, i) => {
    const y = top + i * (rowH + gap)
    const primero = row.pos === 1
    glassCard(ctx, 60, y, 960, rowH, 28)
    if (primero) {
      rr(ctx, 60, y, 960, rowH, 28)
      ctx.strokeStyle = 'rgba(198, 244, 50, 0.45)'
      ctx.lineWidth = 3
      ctx.stroke()
    }
    ctx.textBaseline = 'middle'

    ctx.textAlign = 'center'
    ctx.font = `46px ${FONT_DISPLAY}`
    ctx.fillStyle = primero ? LIME : MUTE
    ctx.fillText(String(row.pos), 122, y + rowH / 2)

    avatar(ctx, 240, y + rowH / 2, 46, row.hue, row.emoji)

    ctx.textAlign = 'left'
    ctx.font = `600 36px ${FONT_BODY}`
    ctx.fillStyle = INK
    ctx.fillText(ellipsis(ctx, row.name, 480), 320, y + rowH / 2 - 14)
    ctx.font = `600 26px ${FONT_BODY}`
    ctx.fillStyle = MUTE
    const sub: string[] = []
    if (row.titles > 0) sub.push(`👑×${row.titles}`)
    if (row.streak >= 2) sub.push(`🔥${row.streak}`)
    ctx.fillText(sub.join('  ') || (row.pos === 1 ? 'Líder de la temporada' : '—'), 320, y + rowH / 2 + 28)

    ctx.textAlign = 'right'
    ctx.font = `52px ${FONT_DISPLAY}`
    ctx.fillStyle = primero ? LIME : INK
    ctx.fillText(String(row.elo), 940, y + rowH / 2)
  })

  footer(ctx)
}
