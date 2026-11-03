import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { demoMovements, demoUsers, demoVehicles } from '../data/mockData'
import { demoKey } from '../data/demoStorage'
import { useAuth } from './AuthContext'
import { backendMode } from '../services/api'
import {
  listarVehiculosBackend, crearVehiculoBackend, actualizarVehiculoBackend, eliminarVehiculoBackend,
  listarUsuariosBackend, crearUsuarioBackend, actualizarUsuarioBackend, desactivarUsuarioBackend,
  listarMovimientosBackend, crearMovimientoBackend, actualizarMovimientoBackend, eliminarMovimientoBackend,
  subirFotoVehiculoBackend,
} from '../services/backend'
import { fromBackendVehicle, toBackendVehicle, establecerCatalogoReal } from '../services/backendCatalogs'
import { cargarCatalogoVehiculos } from '../services/catalogoVehiculos'

async function obtenerInventarioActual() {
  const [catalogo, inventario] = await Promise.allSettled([cargarCatalogoVehiculos(), listarVehiculosBackend()])
  if (inventario.status === 'rejected') throw inventario.reason
  if (catalogo.status === 'fulfilled') establecerCatalogoReal(catalogo.value)
  return inventario.value.filter(v => v.activo).map(fromBackendVehicle)
}

const AppDataContext = createContext(null)
const load = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}

// Las fotos del formulario siguen teniendo el mismo aspecto, pero las nuevas
// son data: URLs que se suben DESPUÉS de crear el vehículo (requiere ID).
const pendingPhotos = form => (form.photos || []).filter(p => typeof p === 'string' && p.startsWith('data:image/'))
async function uploadNewPhotos(id, form, existingPhotos = []) {
  const pending = pendingPhotos(form)
  if (!pending.length) return
  let sent = 0
  for (const [index, value] of pending.entries()) {
    try {
      const file = await fetch(value).then(response => response.blob())
      await subirFotoVehiculoBackend(id, file, existingPhotos.length + index, !existingPhotos.length && index === 0)
      sent += 1
    } catch (error) {
      throw new Error('Los datos del vehículo se guardaron correctamente, pero no se pudieron cargar todas las fotografías. Intenta agregarlas nuevamente desde Editar vehículo.')
    }
  }
}

export function AppDataProvider({ children }) {
  const { currentUser } = useAuth()
  const [vehicles, setVehicles] = useState(() => backendMode ? [] : load(demoKey('vehicles'), demoVehicles))
  const [loadingVehicles, setLoadingVehicles] = useState(false)
  const [vehicleError, setVehicleError] = useState('')
  const [movements, setMovements] = useState(() => backendMode ? [] : load(demoKey('movements'), demoMovements))
  const [loadingMovements, setLoadingMovements] = useState(false)
  const [movementError, setMovementError] = useState('')
  const [users, setUsers] = useState(() => backendMode ? [] : load(demoKey('users'), demoUsers))
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [usersError, setUsersError] = useState('')

  useEffect(() => { if (!backendMode) localStorage.setItem(demoKey('vehicles'), JSON.stringify(vehicles)) }, [vehicles])
  useEffect(() => { if (!backendMode) localStorage.setItem(demoKey('movements'), JSON.stringify(movements)) }, [movements])
  useEffect(() => { if (!backendMode) localStorage.setItem(demoKey('users'), JSON.stringify(users)) }, [users])

  const refreshVehicles = async () => {
    if (!backendMode) return
    setLoadingVehicles(true); setVehicleError('')
    try {
      const result = await obtenerInventarioActual()
      setVehicles(result)
    } catch (e) { setVehicleError(e.message); throw e }
    finally { setLoadingVehicles(false) }
  }
  useEffect(() => {
    if (!backendMode) return
    if (!currentUser) { setVehicles([]); setVehicleError(''); return }
    let active = true
    setLoadingVehicles(true); setVehicleError('')
    obtenerInventarioActual().then(result => { if (active) setVehicles(result) })
      .catch(e => { if (active) setVehicleError(e.message) })
      .finally(() => { if (active) setLoadingVehicles(false) })
    return () => { active = false }
  }, [currentUser?.id])

  const refreshUsers = async () => {
    if (!backendMode || currentUser?.role !== 'admin') return
    setLoadingUsers(true); setUsersError('')
    try {
      const result = await listarUsuariosBackend()
      // Gestión de usuarios del backend solo devuelve asesores; las bajas se ocultan del listado operativo.
      setUsers(result)
    } catch (e) { setUsersError(e.message); throw e }
    finally { setLoadingUsers(false) }
  }
  useEffect(() => {
    if (!backendMode) return
    if (currentUser?.role !== 'admin') { setUsers([]); setUsersError(''); return }
    let active = true
    setLoadingUsers(true); setUsersError('')
    listarUsuariosBackend().then(result => { if (active) setUsers(result) })
      .catch(e => { if (active) setUsersError(e.message) })
      .finally(() => { if (active) setLoadingUsers(false) })
    return () => { active = false }
  }, [currentUser?.id, currentUser?.role])

  const refreshMovements = async (list = vehicles) => {
    if (!backendMode || currentUser?.role !== 'admin') return
    setLoadingMovements(true); setMovementError('')
    try { setMovements(await listarMovimientosBackend(list)) }
    catch (e) { setMovementError(e.message); throw e }
    finally { setLoadingMovements(false) }
  }
  useEffect(() => {
    if (!backendMode) return
    if (currentUser?.role !== 'admin') {
      setMovements([])
      setMovementError('')
      return
    }
    if (loadingVehicles) return
    let active = true
    setLoadingMovements(true); setMovementError('')
    listarMovimientosBackend(vehicles).then(result => { if (active) setMovements(result) })
      .catch(e => { if (active) setMovementError(e.message) })
      .finally(() => { if (active) setLoadingMovements(false) })
    return () => { active = false }
  }, [currentUser?.id, currentUser?.role, vehicles, loadingVehicles])

  const addVehicle = async v => {
    if (backendMode) {
      const saved = await crearVehiculoBackend(toBackendVehicle(v))
      try { await uploadNewPhotos(saved.id_vehiculo, v) }
      finally { await refreshVehicles() }
      return fromBackendVehicle(saved)
    }
    setVehicles(prev => [...prev, { ...v, id:Math.max(0,...prev.map(x=>x.id))+1 }])
    return v
  }
  const updateVehicle = async v => {
    if (backendMode) {
      const previous = vehicles.find(x => x.id === v.id)
      if (!previous) throw new Error('Vehículo no encontrado en el inventario actual.')
      const removed = (previous.photos || []).filter(p => !(v.photos || []).includes(p))
      if (removed.length) throw new Error('Para eliminar una fotografía guardada utiliza la opción Quitar que aparece debajo de la imagen.')
      const saved = await actualizarVehiculoBackend(v.id, toBackendVehicle(v, previous))
      try { await uploadNewPhotos(v.id, v, previous.photos || []) }
      finally { await refreshVehicles() }
      return fromBackendVehicle(saved)
    }
    setVehicles(prev => prev.map(x => x.id === v.id ? v : x))
    return v
  }
  const deleteVehicle = async id => {
    if (backendMode) { await eliminarVehiculoBackend(id); await refreshVehicles(); return true }
    if (movements.some(m => m.vehicleId === id)) return false
    setVehicles(prev => prev.filter(x => x.id !== id)); return true
  }

  const syncSales = all => {
    if (backendMode) return
    setVehicles(prev => prev.map(v => {
      const sale = all.some(m => !m.deleted && m.vehicleId === v.id && m.type === 'Venta')
      if (sale) return {...v,status:'Vendido',demoPreviousStatus:v.demoPreviousStatus || (v.status==='Vendido'?'Disponible':v.status)}
      if (v.demoPreviousStatus) { const {demoPreviousStatus,...rest}=v;return {...rest,status:demoPreviousStatus} }
      return v
    }))
  }
  // El backend de Juan admite actualizar solamente id_estado; 4 = Vendido.
  // Se aplica SOLO al guardar un movimiento de VENTA, nunca al crear un vehículo.
  const actualizarEstadoPorVenta = async vehicleId => {
    const id = Number(vehicleId)
    if (!Number.isInteger(id) || id <= 0) throw new Error('No se identificó el vehículo de la venta.')
    const vehiculo = vehicles.find(v => Number(v.id) === id)
    if (String(vehiculo?.status || '').trim().toLowerCase() === 'vendido') return
    await actualizarVehiculoBackend(id, { id_estado: 4 })
  }
  const actualizarListasTrasVenta = async () => {
    // Recuperar ambos listados aunque alguno de los dos falle al recargarse.
    await Promise.allSettled([refreshVehicles(), refreshMovements()])
  }
  const addMovement = async m => {
    if (backendMode) {
      const saved = await crearMovimientoBackend(m)
      if (m.type === 'Venta') {
        try {
          await actualizarEstadoPorVenta(m.vehicleId)
        } catch (error) {
          // Compensación: no dejar una VENTA activa si falla el cambio de estado.
          // DELETE /movimientos/eliminar desactiva el movimiento en MySQL.
          let anulada = false
          if (saved?.id_movimiento) {
            try { await eliminarMovimientoBackend(saved.id_movimiento); anulada = true }
            catch { /* no ocultar que la operación quedó parcialmente guardada */ }
          }
          await actualizarListasTrasVenta()
          throw new Error(anulada
            ? 'No se completó la venta porque no se pudo cambiar el vehículo a Vendido. El movimiento se desactivó. Revisa el inventario antes de intentarlo nuevamente.'
            : 'ATENCIÓN: la VENTA quedó registrada, pero no se confirmó el cambio del vehículo a Vendido. No registres otra venta; revisa el inventario y comunica este caso al administrador.')
        }
        await actualizarListasTrasVenta()
      } else {
        await refreshMovements()
      }
      return saved
    }
    const next=[...movements,{...m,deleted:false,id:Math.max(0,...movements.map(x=>x.id))+1}]
    setMovements(next);syncSales(next);return m
  }
  const updateMovement = async m => {
    if (backendMode) {
      const original = movements.find(x => Number(x.id) === Number(m.id))
      const saved = await actualizarMovimientoBackend(m.id, m)
      if (m.type === 'Venta') {
        try {
          await actualizarEstadoPorVenta(m.vehicleId)
        } catch (error) {
          // Si el movimiento cambió de otro tipo a VENTA, intentar restaurarlo.
          let restaurado = false
          if (original && original.type !== 'Venta') {
            try { await actualizarMovimientoBackend(m.id, original); restaurado = true }
            catch { /* informar del posible guardado parcial */ }
          }
          await actualizarListasTrasVenta()
          throw new Error(restaurado
            ? 'No se completó el cambio a VENTA porque no se pudo actualizar el estado del vehículo. Se recuperó el tipo anterior del movimiento.'
            : 'El movimiento se guardó, pero no se confirmó que el vehículo esté Vendido. No repitas el cambio; revisa ambos registros con el administrador.')
        }
        await actualizarListasTrasVenta()
      } else {
        await refreshMovements()
      }
      return saved
    }
    const next=movements.map(x=>x.id===m.id?m:x);setMovements(next);syncSales(next);return m
  }
  const deleteMovement = async id => {
    if (backendMode) { await eliminarMovimientoBackend(id);await refreshMovements();return true }
    const next=movements.map(x=>x.id===id?{...x,deleted:true}:x);setMovements(next);syncSales(next);return true
  }
  const addUser = async u => {
    if (backendMode) { try {return await crearUsuarioBackend(u)} finally {await refreshUsers()} }
    setUsers(prev=>[...prev,{...u,id:Math.max(0,...prev.map(x=>x.id))+1,role:u.role||'asesor'}]);return u
  }
  const updateUser = async u => {
    if (backendMode) {
      const original = users.find(x => Number(x.id) === Number(u.id))
      if (!original) throw new Error('No se encontró el usuario solicitado. Actualiza la lista e inténtalo nuevamente.')
      if (u.role !== original.role) throw new Error('El cambio de rol al editar aún no está habilitado en el servicio. No se guardaron cambios.')
      const saved = await actualizarUsuarioBackend(u.id,u)
      await refreshUsers()
      return saved
    }
    setUsers(prev=>prev.map(x=>x.id===u.id?{...x,...u,password:u.password||x.password}:x));return u
  }
  const deleteUser = async id => {
    if (backendMode) {
      const target=users.find(u=>u.id===id)
      if (!target || target.role==='admin') throw new Error('Solo se permite dar de baja a asesores registrados en el listado.')
      await desactivarUsuarioBackend(id);await refreshUsers();return true
    }
    if (users.find(u=>u.id===id)?.role==='admin' && users.filter(u=>u.role==='admin').length<=1) return false
    setUsers(prev=>prev.filter(x=>x.id!==id));return true
  }
  const resetDemo = () => { if (!backendMode) {setVehicles(demoVehicles);setMovements(demoMovements);setUsers(demoUsers)} }

  const value = useMemo(() => ({
    vehicles, loadingVehicles, vehicleError, refreshVehicles,
    movements, loadingMovements, movementError, refreshMovements,
    users, loadingUsers, usersError, refreshUsers,
    addVehicle, updateVehicle, deleteVehicle,
    addMovement, updateMovement, deleteMovement,
    addUser, updateUser, deleteUser, resetDemo,
  }), [vehicles,movements,users,loadingVehicles,vehicleError,loadingMovements,movementError,loadingUsers,usersError,currentUser?.id])
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}
export const useAppData = () => useContext(AppDataContext)
