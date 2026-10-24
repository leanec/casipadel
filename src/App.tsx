import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import BottomNav from './components/BottomNav'
import CourtBackdrop from './components/CourtBackdrop'
import { EASE } from './components/anim'
import Home from './screens/Home'
import Players from './screens/Players'
import NewSession from './screens/NewSession'
import Draw from './screens/Draw'
import Session from './screens/Session'
import Champion from './screens/Champion'
import Ranking from './screens/Ranking'

// Pantallas secundarias: chunk aparte que se carga al navegar, para que el
// bundle inicial no pese en un celular con señal mala en el club.
const History = lazy(() => import('./screens/History'))
const Awards = lazy(() => import('./screens/Awards'))
const HowTo = lazy(() => import('./screens/HowTo'))
const Museo = lazy(() => import('./screens/Museo'))

function Cargando() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center">
      <span className="animate-pulse text-sm text-white/60">Cargando…</span>
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const location = useLocation()
  return (
    <div className="relative min-h-dvh">
      <CourtBackdrop />
      <ScrollToTop />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pb-28 pt-7">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="flex-1"
          >
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route
                path="/premios"
                element={
                  <Suspense fallback={<Cargando />}>
                    <Awards />
                  </Suspense>
                }
              />
              <Route
                path="/como"
                element={
                  <Suspense fallback={<Cargando />}>
                    <HowTo />
                  </Suspense>
                }
              />
              <Route
                path="/museo"
                element={
                  <Suspense fallback={<Cargando />}>
                    <Museo />
                  </Suspense>
                }
              />
              <Route path="/players" element={<Players />} />
              <Route path="/new" element={<NewSession />} />
              <Route path="/draw" element={<Draw />} />
              <Route path="/session/:id" element={<Session />} />
              <Route path="/session/:id/champion" element={<Champion />} />
              <Route
                path="/history"
                element={
                  <Suspense fallback={<Cargando />}>
                    <History />
                  </Suspense>
                }
              />
              <Route path="*" element={<Home />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  )
}
