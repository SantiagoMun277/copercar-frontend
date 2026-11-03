import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { AppDataProvider } from './context/AppDataContext'
import './styles.css'

// GitHub Pages no reescribe las rutas internas (p. ej. /vehiculos).
// Las nuevas rutas usan #/vehiculos para evitar respuestas 404 al navegar o recargar.
// Los enlaces antiguos se trasladan al nuevo formato sin perder su destino.
const base = import.meta.env.BASE_URL
const oldPath = window.location.pathname.startsWith(base)
  ? window.location.pathname.slice(base.length - 1)
  : ''
if (oldPath && oldPath !== '/' && !window.location.hash.startsWith('#/')) {
  window.location.replace(`${window.location.origin}${base}#${oldPath}${window.location.search}`)
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <AppDataProvider>
          <App />
        </AppDataProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
  )
}

