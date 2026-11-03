import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, roles }) {
  const { currentUser, checkingSession } = useAuth()
  const location = useLocation()
  if (checkingSession) return null
  if (!currentUser) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(currentUser.role)) return <Navigate to="/vehiculos" replace />
  return children
}
