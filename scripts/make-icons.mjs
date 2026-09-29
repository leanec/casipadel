import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')
mkdirSync(publicDir, { recursive: true })

// ---------- Escritor de PNG (sin dependencias) ----------
const CRC_TABLE = new Int32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c
}
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filtro none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// ---------- Dibujo del icono (supersampleado) ----------
const BG = [11, 19, 34] // #0B1322
const BALL = [198, 244, 50] // lima
const SEAM = [127, 163, 27]

function roundedRectSDF(x, y, cx, cy, hw, hh, r) {
  const qx = Math.abs(x - cx) - (hw - r)
  const qy = Math.abs(y - cy) - (hh - r)
  const ax = Math.max(qx, 0)
  const ay = Math.max(qy, 0)
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(ax, ay) - r
}

function sample(nx, ny, flatten) {
  const dCard = roundedRectSDF(nx, ny, 0.5, 0.5, 0.5, 0.5, 0.225)
  if (dCard > 0) return flatten ? [BG[0], BG[1], BG[2], 255] : [0, 0, 0, 0]
  let color = [BG[0], BG[1], BG[2], 255]
  // marco de cancha
  const dCourt = roundedRectSDF(nx, ny, 0.5, 0.5, 0.385, 0.385, 0.05)
  if (Math.abs(dCourt) < 0.0065) color = [255, 255, 255, 26]
  // pelota de padel con costuras
  const dBall = Math.hypot(nx - 0.5, ny - 0.5)
  if (dBall < 0.235) {
    color = [BALL[0], BALL[1], BALL[2], 255]
    const s1 = Math.abs(Math.hypot(nx - 0.29, ny - 0.71) - 0.42)
    const s2 = Math.abs(Math.hypot(nx - 0.71, ny - 0.29) - 0.42)
    if (s1 < 0.016 || s2 < 0.016) color = [SEAM[0], SEAM[1], SEAM[2], 255]
  }
  return color
}

function render(size, flatten) {
  const SS = 3
  const px = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const nx = (x + (sx + 0.5) / SS) / size
          const ny = (y + (sy + 0.5) / SS) / size
          const c = sample(nx, ny, flatten)
          r += c[0] * c[3]
          g += c[1] * c[3]
          b += c[2] * c[3]
          a += c[3]
        }
      }
      const i = (y * size + x) * 4
      px[i] = a > 0 ? Math.round(r / a) : 0
      px[i + 1] = a > 0 ? Math.round(g / a) : 0
      px[i + 2] = a > 0 ? Math.round(b / a) : 0
      px[i + 3] = Math.round(a / (SS * SS))
    }
  }
  return encodePNG(size, size, Buffer.from(px))
}

writeFileSync(join(publicDir, 'pwa-192.png'), render(192, false))
writeFileSync(join(publicDir, 'pwa-512.png'), render(512, false))
writeFileSync(join(publicDir, 'apple-touch-icon.png'), render(180, true))
console.log('OK iconos generados en public/ (192, 512 y apple-touch)')
