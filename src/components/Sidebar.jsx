import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const items = [
  { key: 'users', to: '/usuarios', icon: '/assets/ui/icon-users.png', label: 'Usuarios', roles: ['admin'] },
  { key: 'profile', to: '/mis-datos', icon: '/assets/ui/icon-users.png', label: 'Mis datos', roles: ['asesor'] },
  { key: 'vehicles', to: '/vehiculos', icon: '/assets/ui/icon-vehicles.png', label: 'Vehículos', roles: ['admin','asesor'] },
  { key: 'movements', to: '/movimientos', icon: '/assets/ui/icon-movements.png', label: 'Movimientos', roles: ['admin'] },
  { key: 'reports', to: '/reportes', icon: '/assets/ui/icon-reports.png', label: 'Reportes', roles: ['admin'] },
]

export default function Sidebar() {
  const { currentUser } = useAuth()
  return (
    <aside className="sidebar">
      <div className="sidebar-logo"><img src="/assets/ui/isotipo.png" alt="COPERCAR" /></div>
      <nav>
        {items.filter(x => x.roles.includes(currentUser.role)).map(item => (
          <NavLink key={item.key} to={item.to} className={({isActive}) => `side-link ${isActive ? 'active' : ''}`} title={item.label}>
            <img src={item.icon} alt="" /><span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
