import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { demoUsers } from '../data/mockData'
import { demoKey, sessionKey } from '../data/demoStorage'
import { apiTokenKey, backendMode } from '../services/api'
import { getBackendUser, loginBackend } from '../services/backend'

const AuthContext = createContext(null)
const backendSessionUserKey = 'copercar_backend_session_user'

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    if (backendMode) return null // Verificar JWT real con /auth/me al iniciar.
    try { const saved = JSON.parse(sessionStorage.getItem(sessionKey)); if (!saved) return null; const { password: ignoredPassword, ...safe } = saved; return safe } catch { return null }
  })
  const [checkingSession, setCheckingSession] = useState(() => backendMode && !!sessionStorage.getItem(apiTokenKey))

  useEffect(() => {
    if (!backendMode || !sessionStorage.getItem(apiTokenKey)) return
    let active = true
    getBackendUser().then(user => {
      if (active) { setCurrentUser(user); sessionStorage.setItem(backendSessionUserKey, JSON.stringify(user)) }
    }).catch(() => {
      if (active) { sessionStorage.removeItem(apiTokenKey); sessionStorage.removeItem(backendSessionUserKey); setCurrentUser(null) }
    }).finally(() => { if (active) setCheckingSession(false) })
    return () => { active = false }
  }, [])

  const login = async (email, password) => {
    if (backendMode) {
      try {
        const user = await loginBackend(email, password)
        if (!user.active) throw new Error('La cuenta se encuentra inactiva.')
        setCurrentUser(user)
        sessionStorage.setItem(backendSessionUserKey, JSON.stringify(user))
        return {ok:true,user}
      } catch (error) {
        sessionStorage.removeItem(apiTokenKey)
        return {ok:false,message:error.message || 'No fue posible iniciar sesión.'}
      }
    }
    const stored = JSON.parse(localStorage.getItem(demoKey('users')) || 'null') || demoUsers
    const user = stored.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password)
    if (!user) return { ok: false, message: 'Correo electrónico o contraseña incorrectos' }
    const { password: ignoredPassword, ...safeUser } = user
    setCurrentUser(safeUser)
    sessionStorage.setItem(sessionKey, JSON.stringify(safeUser))
    return { ok: true, user: safeUser }
  }

  const logout = () => {
    if (backendMode) { sessionStorage.removeItem(apiTokenKey); sessionStorage.removeItem(backendSessionUserKey) }
    else sessionStorage.removeItem(sessionKey)
    setCurrentUser(null)
  }

  const updateSessionUser = async (user) => {
    if (backendMode) {
      const updated = await getBackendUser()
      setCurrentUser(updated)
      sessionStorage.setItem(backendSessionUserKey, JSON.stringify(updated))
      return updated
    }
    const { password: ignoredPassword, ...safeUser } = user
    setCurrentUser(safeUser)
    sessionStorage.setItem(sessionKey, JSON.stringify(safeUser))
  }

  const value = useMemo(() => ({ currentUser, checkingSession, login, logout, updateSessionUser }), [currentUser, checkingSession])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
