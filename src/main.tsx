import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { LeagueProvider } from './data/store'
import './index.css'

// la app vive bajo /casipadel/ en GitHub Pages: el router tiene que saberlo
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <LeagueProvider>
        <App />
      </LeagueProvider>
    </BrowserRouter>
  </StrictMode>,
)
