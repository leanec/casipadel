import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useLeague } from '../data/store'
import { RANKS } from '../logic/ranks'
import BigButton from '../components/BigButton'
import PageHeader from '../components/PageHeader'
import { EASE } from '../components/anim'

const PREMIOS = [
  { emoji: '🏆', nombre: 'Campeón de la temporada', texto: 'El número 1 del ranking ELO al cierre.' },
  {
    emoji: '👑',
    nombre: 'La corona',
    texto: 'Quien más jornadas ganó. Terminar 1° un lunes vale un título (puede haber co-campeones).',
  },
  {
    emoji: '💥',
    nombre: 'Mejor dupla',
    texto: 'La pareja con mejor porcentaje jugando al menos 3 partidos juntos.',
  },
  { emoji: '🧪', nombre: 'Química prohibida', texto: 'Al revés: la dupla con peor porcentaje. Mejor no repetir.' },
  { emoji: '🌋', nombre: 'Racha imparable', texto: 'La tira más larga de victorias seguidas de la temporada.' },
  {
    emoji: '🔄',
    nombre: 'Rey de la remontada',
    texto: 'Ganar un partido después de perder el primer set (hay que cargar los sets).',
  },
  { emoji: '🧹', nombre: 'La escoba', texto: 'Barrer una jornada: ganar los 3 partidos del mismo lunes.' },
  {
    emoji: '💪',
    nombre: 'Más wins',
    texto: 'El mejor porcentaje de victorias entre los que jugaron 6 partidos o más.',
  },
  {
    emoji: '😅',
    nombre: 'El Casi',
    texto: 'El que quedó más cerca del 50%: ni crac ni desastre. Le da nombre a la app.',
  },
]

const LECTURA = [
  { emoji: '▲▼', texto: 'Flechas: cuántos puestos subiste o bajaste desde el lunes pasado.' },
  { emoji: '🔥4', texto: 'Racha: victorias seguidas. Con ⚠️ son derrotas en línea.' },
  { emoji: '👑×2', texto: 'Títulos: cuántas jornadas terminaste en el 1° puesto.' },
  { emoji: '🎯', texto: 'Tu Casi Rango: la franja de ELO en la que estás parado.' },
  {
    emoji: '🎈',
    texto: 'Invitado: juega y mueve el ELO de los que lo enfrentan, pero no rankea ni gana premios.',
  },
]

function Seccion({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.28, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

export default function HowTo() {
  const navigate = useNavigate()
  const { league } = useLeague()
  const hayTemporada = league.sessions.some(s => s.status === 'finished')

  return (
    <div>
      <PageHeader title="Cómo funciona" sub="Las reglas de la liga, en corto" />

      <Seccion delay={0.02}>
        <p className="label">El ELO en corto</p>
        <div className="glass rounded-3xl p-4">
          <p className="text-sm leading-relaxed">
            Todos arrancamos en <b className="text-lime">1000 puntos</b>. Cada partido suma o
            resta, y el tamaño del premio depende del rival: <b>ganarle a un crac da mucho</b>,
            ganarle al último da poquito, y caer contra un más fuerte casi no penaliza.
          </p>
          <p className="mt-3 text-sm leading-relaxed">
            En pareja se promedia el ELO de los dos, así que <b>nadie se salva solo</b>: tu
            pareja y vos ganan o pierden lo mismo por partido.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { t: 'Partido parejo', v: '±16' },
              { t: 'Sorpresa vs un más fuerte', v: '~+26' },
              { t: 'Ganar de favorito', v: '~+6' },
            ].map(e => (
              <span key={e.t} className="glass rounded-full px-3 py-1.5 text-xs">
                {e.t} <b className="tnum text-lime">{e.v}</b>
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm leading-relaxed">
            Y la corona se defiende viniendo: <b>faltar 3 lunes seguidos empieza a restar</b> 10
            puntos por cada lunes ausente, hasta descolgarse de vuelta en 1000 (nunca por debajo).
            Los primeros 2 lunes de ausencia no cobran — con la rotación de siempre, nadie paga por
            descansar.
          </p>
        </div>
      </Seccion>

      <Seccion delay={0.06}>
        <p className="label">Los Casi Rangos</p>
        <div className="glass flex flex-col gap-2 rounded-3xl p-4">
          {[...RANKS].reverse().map(rank => (
            <div key={rank.id} className="flex items-center gap-3">
              <span className="text-xl">{rank.emoji}</span>
              <span className={`font-display flex-1 text-sm uppercase tracking-wide ${rank.text}`}>
                {rank.name}
              </span>
              <span className="tnum text-xs text-mute">
                {rank.min > 0 ? `desde ${rank.min}` : 'empezás acá'}
              </span>
            </div>
          ))}
          <p className="mt-1 text-xs leading-relaxed text-mute">
            Son franjas de puntos, no posiciones: subir de rango es pasar el corte. En tu perfil
            hay una barra que te muestra cuánto falta para el próximo.
          </p>
        </div>
      </Seccion>

      <Seccion delay={0.1}>
        <p className="label">Cómo leer la tabla</p>
        <div className="glass flex flex-col gap-3 rounded-3xl p-4">
          {LECTURA.map(l => (
            <div key={l.emoji} className="flex items-start gap-3">
              <span className="tnum w-9 shrink-0 text-center text-sm">{l.emoji}</span>
              <p className="flex-1 text-xs leading-relaxed">{l.texto}</p>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion delay={0.14}>
        <p className="label">Los premios de temporada</p>
        <div className="flex flex-col gap-2">
          {PREMIOS.map(p => (
            <div key={p.nombre} className="glass flex items-center gap-3 rounded-2xl p-3">
              <span className="text-2xl">{p.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm uppercase leading-none">{p.nombre}</p>
                <p className="mt-1 text-xs leading-relaxed text-mute">{p.texto}</p>
              </div>
            </div>
          ))}
          <p className="mt-1 px-1 text-xs leading-relaxed text-mute">
            Al cerrar la temporada se reparten todos juntos en la pantalla 🏅. Solo corren los
            titulares: los invitados 🎈 juegan, pero no ganan premios.
          </p>
        </div>
      </Seccion>

      <Seccion delay={0.18}>
        <p className="label">La vitrina</p>
        <div className="glass rounded-3xl p-4">
          <p className="text-xs leading-relaxed">
            Cada perfil colecciona las perlas del historial: <b>🔄 remontadas</b>,{' '}
            <b>🧹 barridas</b> y tu mejor <b>🔥 racha</b>. Si caiste en la 🧪 química prohibida,
            también te lo vamos a recordar.
          </p>
        </div>
      </Seccion>

      <Seccion delay={0.22}>
        <div className="glass mt-6 rounded-3xl p-4 text-center">
          <p className="text-xs leading-relaxed text-mute">
            Nada de esto se anota a mano: el ranking, los rangos y los premios se recalculan
            solos con los resultados de cada lunes. Si corrigen un resultado o reabren una
            jornada, todo se actualiza al instante.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          {hayTemporada && (
            <BigButton onClick={() => navigate('/premios')}>🏅 Premios de esta temporada</BigButton>
          )}
        </div>
      </Seccion>
    </div>
  )
}
