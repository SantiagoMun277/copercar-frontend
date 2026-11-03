import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'
import { EditAction } from '../components/ActionIcons'
import { UserEditor } from './UserForm'

const newestFirst = (a, b) => Number(b.id) - Number(a.id)

export default function Users() {
  const { users, loadingUsers, usersError } = useAppData()
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [toEdit, setToEdit] = useState(null)
  const [notice, setNotice] = useState(location.state?.notice || '')

  useEffect(() => {
    if (location.state?.editUserId) {
      const found = users.find(u => u.id === location.state.editUserId)
      if (found) setToEdit(found)
      if (found || !loadingUsers) navigate('/usuarios', { replace: true, state: null })
    }
  }, [location.state, navigate, users, loadingUsers])

  const perPage = 7
  // El ID autoincremental representa el orden de registro en el backend.
  // No usar la posición devuelta por la API: puede llegar en orden ascendente.
  const filtered = useMemo(() => users
    .filter(u => String(u.documentNumber).includes(query.trim()))
    .sort(newestFirst), [users, query])
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const rows = filtered.slice((page - 1) * perPage, page * perPage)

  return <section className="page-section users-page">
    <div className="tabs-row"><button className="tab active" aria-current="page">Gestión de usuarios / listado</button>{!toEdit && <button className="tab" onClick={() => navigate('/usuarios/nuevo')}>Agregar usuario</button>}</div>
    <div className="module-heading-row"><h1 className="orange-title">Usuarios</h1></div>
    {notice && <div className="success-note" role="status">{notice} <button className="notice-close" type="button" onClick={() => setNotice('')} aria-label="Cerrar mensaje">×</button></div>}
    <div className="toolbar"><label className="searchbox"><span>⌕</span><input value={query} onChange={e => { setQuery(e.target.value); setPage(1) }} placeholder="Buscar por número de documento" /></label>{!toEdit && <button className="btn btn-green push-right" onClick={() => navigate('/usuarios/nuevo')}>＋ Agregar Usuario</button>}</div>
    {usersError && <div className="form-error">{usersError}</div>}{loadingUsers && <p>Cargando usuarios...</p>}
    <div className="responsive-table-wrap"><table className="data-table users-table"><thead><tr><th>No. Orden</th><th>Tipo de Documento</th><th>Número de Documento</th><th>Nombre Completo</th><th>Correo Electrónico</th><th>Celular</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{rows.map((u, i) => <tr key={u.id}><td>{String((page - 1) * perPage + i + 1).padStart(2, '0')}</td><td>{u.documentType}</td><td>{u.documentNumber}</td><td>{u.firstName} {u.lastName}</td><td>{u.email}</td><td>{u.phone}</td><td>{u.role === 'admin' ? 'Administrador' : 'Asesor'}</td><td><span className={(u.active ?? u.activo ?? u.isActive) === false ? 'estado-inactivo' : 'estado-activo'}>{(u.active ?? u.activo ?? u.isActive) === false ? 'Inactivo' : (u.active ?? u.activo ?? u.isActive) === true ? 'Activo' : 'Sin confirmar'}</span></td><td className="table-actions"><EditAction onClick={() => { setNotice(''); setToEdit(u) }} /></td></tr>)}</tbody></table>{!rows.length && <div className="empty-state">No se encontraron usuarios.</div>}</div>
    <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    <Modal open={!!toEdit} title={`Editar usuario${toEdit ? ` · ${toEdit.firstName} ${toEdit.lastName}` : ''}`} wide onClose={() => setToEdit(null)}>
      {toEdit && <UserEditor key={toEdit.id} user={toEdit} onSaved={() => { setToEdit(null); setNotice('Usuario modificado correctamente.') }} onCancel={() => setToEdit(null)} />}
    </Modal>
  </section>
}
