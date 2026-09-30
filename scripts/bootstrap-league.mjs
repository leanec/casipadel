#!/usr/bin/env node
/**
 * Crea (o rota el PIN de) la liga del grupo en Supabase. Se corre UNA vez, local:
 *
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \
 *   npm run league:bootstrap -- --pin 4271
 *
 * (o pasa --url/--service-role-key por flags; --pin pregunta si falta)
 * El hash usa los mismos parámetros que las edge functions: PBKDF2-SHA256,
 * 100.000 iteraciones, 16 bytes de sal.
 */
import { pbkdf2Sync, randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline/promises'

const ITERACIONES = 100_000

function parsear(argv) {
  const flags = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = argv[i + 1]
    i++
  }
  return flags
}

async function preguntar(pregunta) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const resp = await rl.question(pregunta)
  rl.close()
  return resp.trim()
}

const flags = parsear(process.argv.slice(2))
const url = (flags.url ?? process.env.SUPABASE_URL ?? '').replace(/\/+$/, '')
const serviceKey = flags['service-role-key'] ?? process.env.SUPABASE_SERVICE_ROLE_KEY
let pin = flags.pin ?? (await preguntar('PIN del grupo (4-6 dígitos): '))

if (url === '' || serviceKey === undefined || serviceKey === '') {
  console.error(
    'Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (env o --url/--service-role-key).',
  )
  process.exit(1)
}
if (!/^\d{4,6}$/.test(pin)) {
  console.error('El PIN tiene que ser de 4 a 6 dígitos.')
  process.exit(1)
}

const salt = randomBytes(16).toString('hex')
// OJO: el salt se pasa DECODIFICADO de hex — así lo verifica la edge function
const hash = pbkdf2Sync(pin, Buffer.from(salt, 'hex'), ITERACIONES, 32, 'sha256').toString('hex')
const pinHash = `pbkdf2$${ITERACIONES}$${salt}$${hash}`
const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=ignore-duplicates,return=representation',
}

// ¿ya existe la liga?
const buscar = await fetch(`${url}/rest/v1/leagues?name=eq.casi-padel&select=id`, {
  headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
})
const existentes = buscar.ok ? await buscar.json() : []

if (existentes.length > 0 && flags.rotate === undefined) {
  const rotar = await preguntar('La liga ya existe. ¿Rotar el PIN? [s/N]: ')
  if (rotar.toLowerCase() !== 's') {
    console.log('Nada hecho. Para rotar: --rotate')
    process.exit(0)
  }
}

const cuerpo = JSON.stringify({
  name: 'casi-padel',
  pin_hash: pinHash,
  data: { version: 1, players: [], sessions: [] },
  revision: 1,
})

const res = existentes.length > 0
  ? await fetch(`${url}/rest/v1/leagues?name=eq.casi-padel`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ pin_hash: pinHash }),
    })
  : await fetch(`${url}/rest/v1/leagues`, { method: 'POST', headers, body: cuerpo })

if (!res.ok) {
  console.error(`Error ${res.status}:`, await res.text())
  process.exit(1)
}

console.log(
  existentes.length > 0
    ? '✅ PIN actualizado. El PIN viejo deja de andar en todos los dispositivos.'
    : '✅ Liga creada con el PIN. Compartilo por WhatsApp junto al link de la app.',
)
