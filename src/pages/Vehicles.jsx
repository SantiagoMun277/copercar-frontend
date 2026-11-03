import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import Modal from '../components/Modal'
import PageTitle from '../components/PageTitle'
import StatusBadge from '../components/StatusBadge'
import { DeleteAction, EditAction } from '../components/ActionIcons'
import { formatCOP } from '../utils/format'
import { backendMode } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { buscarVehiculoBackend, filtrarVehiculoBackend } from '../services/backend'
import { fromBackendVehicle, estadoBackendIds } from '../services/backendCatalogs'

export default function Vehicles() {
  const { vehicles, movements, deleteVehicle, loadingVehicles, vehicleError } = useAppData()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Todos')
  const [toDelete, setToDelete] = useState(null)
  const [serverFilter, setServerFilter] = useState(null)
  const [serverPlate, setServerPlate] = useState(null)
  const [searchError, setSearchError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const confirmDelete = async () => {
    if (!toDelete || deleting) return
    setDeleting(true); setDeleteError('')
    try {
      const ok = await deleteVehicle(toDelete.id)
      if (!ok) { setDeleteError('No se puede eliminar un vehículo con movimientos históricos.'); return }
      setToDelete(null)
    } catch (e) { setDeleteError(e.message || 'No se pudo eliminar el vehículo.') }
    finally { setDeleting(false) }
  }
  useEffect(() => {
    if (!backendMode || status === 'Todos') { setServerFilter(null); return }
    let active = true
    setServerFilter(null); setSearchError('')
    const id = estadoBackendIds[status.toLowerCase()]
    if (!id) return
    filtrarVehiculoBackend(id).then(rows => {
      if (active) setServerFilter(new Set(rows.filter(v => v.activo).map(v => v.id_vehiculo)))
    }).catch(e => { if (active) setSearchError(e.message) })
    return () => { active = false }
  }, [status, vehicles])
  useEffect(() => {
    const plate = query.trim().toUpperCase()
    if (!backendMode || !/^[A-Z]{3}[0-9]{3}$/.test(plate)) { setServerPlate(null); return }
    let active = true
    setServerPlate(null); setSearchError('')
    buscarVehiculoBackend(plate).then(row => { if (active) setServerPlate(row.activo ? fromBackendVehicle(row) : null) })
      .catch(e => { if (active && !/no se encuentra un vehiculo/i.test(e.message)) setSearchError(e.message) })
    return () => { active = false }
  }, [query, vehicles])
  const filtered = useMemo(() => vehicles.filter(v => {
    const q = query.trim().toLowerCase()
    const matchesText = !q || v.plate.toLowerCase().includes(q) || v.title.toLowerCase().includes(q)
    const matchesState = status==='Todos' || (v.status===status && (!serverFilter || serverFilter.has(v.id)))
    const matchesPlate = !serverPlate || v.id === serverPlate.id || !/^[a-z]{3}[0-9]{3}$/.test(q)
    return matchesText && matchesState && matchesPlate
  }), [vehicles, query, status, serverFilter, serverPlate])

  return (
    <section className="page-section">
      <PageTitle>Vehículos</PageTitle>
      <div className="toolbar vehicle-toolbar">
        <label className="searchbox"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por placa" /></label>
        <label className="field compact"><span>Estado*</span><select value={status} onChange={e=>setStatus(e.target.value)}><option>Todos</option><option>Disponible</option><option>Ingresando</option><option>No disponible</option><option>Vendido</option><option>Separado</option></select></label>
        <div className="push-right" style={{display:'flex',gap:8,flexWrap:'wrap'}}>{currentUser?.role === 'admin' && <button type="button" className="btn btn-orange secondary-orange" onClick={()=>navigate('/vehiculos/marcas-lineas')}>Administrar marcas y líneas</button>}<button className="btn btn-green" onClick={()=>navigate('/vehiculos/nuevo')}>Agregar Vehículo</button></div>
      </div>

      {(vehicleError || searchError) && <div className="form-error">{vehicleError || searchError}</div>}
      <div className="vehicle-list">
        {filtered.map((v, index) => (
          <article className="vehicle-row" key={v.id}>
            <div className="vehicle-index">{index+1}</div>
            <img className="vehicle-thumb" src={v.photos?.[0] || '/assets/ui/isotipo.png'} alt={v.title} />
            <div className="vehicle-info">
              <strong>{v.title}</strong>
              <span>Modelo {v.year}</span><span>{v.transmission}</span><span>{Number(v.mileage).toLocaleString('es-CO')} km</span>
              <span>Placa: {v.plate}</span><span>Precio {formatCOP(v.price)}</span>
            </div>
            <div className="vehicle-actions"><StatusBadge status={v.status}/><EditAction label="" onClick={()=>navigate(`/vehiculos/${v.id}/editar`)}/><DeleteAction label="" onClick={()=>{setDeleteError('');setToDelete(v)}}/></div>
          </article>
        ))}
        {!loadingVehicles && !vehicleError && !filtered.length && <div className="empty-state">No se encontraron vehículos para los criterios seleccionados.</div>}
      </div>

      <Modal open={!!toDelete} title="Eliminar vehículo" onClose={()=>setToDelete(null)}>
        <p className="modal-question">¿Está seguro de que desea eliminar este vehículo?</p>{toDelete && !backendMode && movements.some(m=>m.vehicleId===toDelete.id) && <p className="form-error">No se puede eliminar: tiene movimientos históricos asociados. Esta restricción protege la trazabilidad.</p>}
        {toDelete && <div className="modal-summary"><b>{toDelete.title}</b><span>Placa: {toDelete.plate}</span></div>}
        {deleteError && <div className="form-error">{deleteError}</div>}
        <div className="modal-actions"><button className="btn btn-danger" disabled={deleting || (!!toDelete && !backendMode && movements.some(m=>m.vehicleId===toDelete.id))} onClick={confirmDelete}>Sí, eliminar</button><button className="btn btn-gray" onClick={()=>setToDelete(null)}>Cancelar</button></div>
      </Modal>
    </section>
  )
}
