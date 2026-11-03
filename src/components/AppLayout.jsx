import { Outlet, Link } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'

export default function AppLayout() {
  const { currentUser, logout } = useAuth()
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <header className="app-header">
          <div className="header-spacer" />
          <div className="session-actions">
            {currentUser.role === 'admin' && <Link to="/mis-datos">Mis datos</Link>}
            <span className="session-name">{currentUser.firstName} {currentUser.lastName}</span>
            <button className="link-button" onClick={logout}>Salir</button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
