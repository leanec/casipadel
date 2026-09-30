import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Regenera los íconos de public/ desde el isotipo oficial (branding/logo-icon.svg).
// Usa qlmanage (macOS) para rasterizar el SVG; los PNG generados se commitean,
// así que la CI no necesita correr este script.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')
const src = join(root, 'branding', 'logo-icon.svg')
mkdirSync(publicDir, { recursive: true })

const tmp = join(root, '.icons-tmp')
rmSync(tmp, { recursive: true, force: true })
mkdirSync(tmp)

function render(svgPath, size) {
  execFileSync('qlmanage', ['-t', '-s', String(size), '-o', tmp, svgPath], { stdio: 'ignore' })
  const name = `${svgPath.split('/').pop()}.png`
  const png = readFileSync(join(tmp, name))
  rmSync(join(tmp, name))
  return png
}

// favicon vectorial tal cual el isotipo
cpSync(src, join(publicDir, 'favicon.svg'))

// versión regular (esquinas redondeadas con transparencia)
writeFileSync(join(publicDir, 'pwa-512.png'), render(src, 512))
writeFileSync(join(publicDir, 'pwa-192.png'), render(src, 192))

// versión full-bleed (fondo cuadrado sin redondeo): maskable y apple-touch,
// que recortan las esquinas solas y necesitan sangrado completo
const square = join(tmp, 'logo-icon-square.svg')
writeFileSync(square, readFileSync(src, 'utf8').replace('rx="115"', 'rx="0"'))
writeFileSync(join(publicDir, 'pwa-512-maskable.png'), render(square, 512))
writeFileSync(join(publicDir, 'apple-touch-icon.png'), render(square, 180))

rmSync(tmp, { recursive: true, force: true })
console.log('OK íconos generados en public/ desde branding/logo-icon.svg')
