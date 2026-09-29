# Casi Pádel 🎾

La liga de los lunes: sorteo animado de parejas, fixture automático (3 rondas × 2 canchas), carga de resultados, tabla del día en vivo y **ranking ELO de temporada**. Mobile-first, PWA instalable.

**Fase 2 (actual)**: grupo compartido en la nube — un PIN del grupo desbloquea la app en cualquier celular y todos ven lo mismo en tiempo real. Sin las variables de Supabase, la app funciona 100% local (modo Fase 1).

Deploy: `https://leanec.github.io/casipadel` (build automático al pushear a `main`).

## Comandos

```bash
npm install            # dependencias
npm run dev            # desarrollo en http://localhost:5173/casipadel/
npm run test           # tests de lógica + smoke
npm run build          # build de producción (dist/)
npm run preview        # sirve el build
npm run icons          # regenera los iconos PWA (public/)
npm run league:bootstrap  # crea la liga en Supabase con el PIN (una sola vez)
```

## Puesta en marcha del grupo (una sola vez)

1. **Proyecto Supabase** (gratis): crear proyecto (región São Paulo) y copiar URL + `anon key` de *Settings → API*.
2. **Base**: SQL Editor → pegar y correr `supabase/migrations/0001_init.sql`.
3. **Edge functions**: con la CLI de Supabase:
   ```bash
   supabase functions deploy league-load --no-verify-jwt
   supabase functions deploy league-save --no-verify-jwt
   ```
4. **Liga + PIN**:
   ```bash
   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<key> \
     npm run league:bootstrap -- --pin 1234
   ```
5. **Deploy**: secrets del repo `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` → push a `main` → Pages builda solo. Mandar el link + el PIN por WhatsApp.

El primer dispositivo que entre con el PIN puede subir su liga local (migración de Fase 1).

## Estructura

- `src/logic/` — funciones puras (sorteo, fixture, resultados, tabla, ELO, stats) + tests
- `src/data/` — modelo, store, repositorio localStorage, PIN, fusión y motor de sincronización
- `src/screens/` — pantallas (Home, Ranking, Jugadores, Sorteo, Jornada, Campeón, Historial, PinGate)
- `supabase/` — migración SQL + edge functions (`league-load`, `league-save`)
- `.github/workflows/` — deploy a Pages + keepalive semupal de Supabase

Ver [`../PLAN.md`](../PLAN.md), [`../PLAN-FASE-1.md`](../PLAN-FASE-1.md) y [`../PLAN-FASE-2.md`](../PLAN-FASE-2.md).
