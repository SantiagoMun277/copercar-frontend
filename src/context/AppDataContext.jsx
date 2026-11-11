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
import { validarMovimiento, validarCambioEstado, validarEliminacionMovimiento, ventasActivas, estaVendido, estaDisponible } from '../utils/reglasVentaFrontend'
import { anularVentasYGuardarVehiculo } from '../utils/coordinadorAnulacionVenta'

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
  const upload = async index => {
    const file = await fetch(pending[index]).then(response => response.blob())
    await subirFotoVehiculoBackend(id, file, existingPhotos.length + index, !existingPhotos.length && index === 0)
  }
  const failedMessage = 'Los datos del vehículo se guardaron correctamente, pero no se pudieron cargar todas las fotografías. Intenta agregarlas nuevamente desde Editar vehículo.'
  // Subir primero la foto principal para conservar el orden y el indicador principal.
  try { await upload(0) }
  catch { throw new Error(failedMessage) }
  // Las restantes se suben como máximo de a dos, para reducir la espera sin
  // saturar la API. allSettled garantiza que terminen antes de refrescar el vehículo.
  for (let i = 1; i < pending.length; i += 2) {
    const indices = [i, i + 1].filter(index => index < pending.length)
    const outcomes = await Promise.allSettled(indices.map(upload))
    if (outcomes.some(result => result.status === 'rejected')) throw new Error(failedMessage)
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

  // Tras eliminar exitosamente una foto, actualizar solo el vehículo afectado.
  // No es necesario descargar todo el inventario y catálogo de nuevo.
  const removeVehiclePhotoLocal = (vehicleId, photoId, photoUrl) => {
    setVehicles(prev => prev.map(vehicle => Number(vehicle.id) !== Number(vehicleId) ? vehicle : {
      ...vehicle,
      photoRecords: (vehicle.photoRecords || []).filter(photo => Number(photo.id) !== Number(photoId)),
      photos: (vehicle.photos || []).filter(url => url !== photoUrl),
    }))
  }

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
  // Consultas frescas: nunca aprobar una operación financiera con el estado
  // posiblemente desactualizado que quedó en memoria al abrir una página.
  const consultarReglasActuales = async () => {
    if (!backendMode) return { vehiculos: vehicles, movimientos: movements }
    if (currentUser?.role !== 'admin') {
      throw new Error('Se requieren permisos de administrador para comprobar las compras y ventas activas. No se realizó el cambio.')
    }
    const [listaVehiculos, listaMovimientos] = await Promise.all([
      listarVehiculosBackend(), listarMovimientosBackend(),
    ])
    return { vehiculos: listaVehiculos.filter(v => v.activo).map(fromBackendVehicle), movimientos: listaMovimientos }
  }
  const comprobarMovimiento = async (m, original = null) => {
    const datos = await consultarReglasActuales()
    // Si el movimiento original fue anulado por otro usuario, no permitir recrearlo vía PUT.
    if (original && backendMode) {
      const actual = datos.movimientos.find(x => Number(x.id) === Number(original.id))
      if (!actual || actual.deleted) throw new Error('El movimiento ya no está activo. Actualiza el listado.')
      original = actual
    }
    const aviso = validarMovimiento({ movimiento:m, vehiculos:datos.vehiculos, movimientos:datos.movimientos, original })
    if (aviso) throw new Error(aviso)
    return datos
  }
  const updateVehicle = async v => {
    const previous = vehicles.find(x => Number(x.id) === Number(v.id))
    if (!previous) throw new Error('Vehículo no encontrado en el inventario actual.')
    if (backendMode) {
      const removed = (previous.photos || []).filter(p => !(v.photos || []).includes(p))
      if (removed.length) throw new Error('Para eliminar una fotografía guardada utiliza la opción Quitar que aparece debajo de la imagen.')
      // Validar el formulario completo ANTES de anular cualquier venta.
      const payload = toBackendVehicle(v, previous)
      const cambioEstado = String(previous.status).trim().toLowerCase() !== String(v.status).trim().toLowerCase()
      let ventasPorAnular = []
      if (cambioEstado) {
        // Revisar primero el estado real, no el que quedó en el formulario.
        // El inventario es consultable tanto por administradores como asesores.
        const listaActual = await listarVehiculosBackend()
        const vigente = listaActual.filter(x => x.activo).map(fromBackendVehicle)
          .find(x => Number(x.id) === Number(v.id))
        if (!vigente || String(vigente.status).trim().toLowerCase() !== String(previous.status).trim().toLowerCase()) {
          throw new Error('El estado del vehículo cambió desde que abriste el formulario. Actualiza el inventario antes de guardar.')
        }
        if (currentUser?.role !== 'admin') {
          // Los asesores no pueden consultar ni anular movimientos en FastAPI.
          // Evitar que un cambio a Disponible deje una VENTA activa contabilizada.
          // Las ediciones comunes y el paso a Vendido siguen funcionando.
          if (estaVendido(vigente)) {
            throw new Error('Para cambiar el estado de un vehículo Vendido debe intervenir un administrador, ya que es necesario verificar y, si corresponde, anular su VENTA activa. No se modificó el vehículo.')
          }
        } else {
          const movimientosActuales = await listarMovimientosBackend()
          const aviso = validarCambioEstado({anterior:vigente,siguiente:v,movimientos:movimientosActuales})
          if (aviso) throw new Error(aviso)
          if (estaVendido(vigente) && estaDisponible(v)) ventasPorAnular = ventasActivas(movimientosActuales, v.id)
        }
      }
      const requiereAnulacion = cambioEstado && estaVendido(previous) && estaDisponible(v)
      const saved = requiereAnulacion
        ? await anularVentasYGuardarVehiculo({
            ventas:ventasPorAnular,
            anularVenta:id => eliminarMovimientoBackend(id),
            guardarVehiculo:() => actualizarVehiculoBackend(v.id, payload),
            // Verificación independiente de lo que esté en memoria del navegador.
            verificar:async () => {
              const [lista, movs] = await Promise.all([listarVehiculosBackend(), listarMovimientosBackend()])
              const vigente = lista.filter(x=>x.activo).map(fromBackendVehicle).find(x => Number(x.id) === Number(v.id))
              if (!vigente || !estaDisponible(vigente) || ventasActivas(movs,v.id).length) {
                throw new Error('La API todavía no confirma el estado Disponible sin ventas activas.')
              }
            },
            refrescar:() => Promise.allSettled([refreshVehicles(),refreshMovements()]),
          })
        : await actualizarVehiculoBackend(v.id, payload)
      try { await uploadNewPhotos(v.id, v, previous.photos || []) }
      finally { await Promise.allSettled([refreshVehicles(), refreshMovements()]) }
      return fromBackendVehicle(saved)
    }
    const aviso = validarCambioEstado({anterior:previous,siguiente:v,movimientos:movements})
    if (aviso) throw new Error(aviso)
    if (estaVendido(previous) && estaDisponible(v)) {
      setMovements(prev => prev.map(m => Number(m.vehicleId) === Number(v.id) && m.type === 'Venta' && !m.deleted ? {...m,deleted:true} : m))
    }
    setVehicles(prev => prev.map(x => x.id === v.id ? v : x))
    return v
  }
  const deleteVehicle = async id => {
    if (backendMode) { await eliminarVehiculoBackend(id); await refreshVehicles(); return true }
    if (movements.some(m => m.vehicleId === id)) return false
    setVehicles(prev => prev.filter(x => x.id !== id)); return true
  }

  const actualizarListasFinancieras = async () => {
    await Promise.allSettled([refreshVehicles(), refreshMovements()])
  }
  const addMovement = async m => {
    if (backendMode) {
      await comprobarMovimiento(m)
      const saved = await crearMovimientoBackend(m)
      await actualizarListasFinancieras()
      return saved
    }
    const aviso = validarMovimiento({ movimiento:m, vehiculos:vehicles, movimientos: movements })
    if (aviso) throw new Error(aviso)
    setMovements(prev => [...prev, {...m,deleted:false,id:Math.max(0,...prev.map(x=>x.id))+1}])
    return m
  }
  const updateMovement = async m => {
    const original = movements.find(x => Number(x.id) === Number(m.id))
    if (!original) throw new Error('No se encontró el movimiento. Actualiza el listado.')
    if (backendMode) {
      await comprobarMovimiento(m, original)
      const saved = await actualizarMovimientoBackend(m.id, m)
      await actualizarListasFinancieras()
      return saved
    }
    const aviso = validarMovimiento({ movimiento:m, vehiculos:vehicles, movimientos: movements, original })
    if (aviso) throw new Error(aviso)
    setMovements(prev => prev.map(x => x.id === m.id ? m : x))
    return m
  }
  const deleteMovement = async id => {
    if (backendMode) {
      const datos = await consultarReglasActuales()
      const actual = datos.movimientos.find(m => Number(m.id) === Number(id))
      const vehiculo = datos.vehiculos.find(v => Number(v.id) === Number(actual?.vehicleId))
      const aviso = validarEliminacionMovimiento({movimiento:actual,movimientos:datos.movimientos,vehiculo})
      if (aviso) throw new Error(aviso)
      await eliminarMovimientoBackend(id)
      await actualizarListasFinancieras()
      return true
    }
    const actual = movements.find(m => Number(m.id) === Number(id))
    const vehiculo = vehicles.find(v => Number(v.id) === Number(actual?.vehicleId))
    const aviso = validarEliminacionMovimiento({ movimiento:actual,movimientos:movements,vehiculo })
    if (aviso) throw new Error(aviso)
    setMovements(prev => prev.map(x => Number(x.id) === Number(id) ? {...x,deleted:true} : x))
    return true
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
    vehicles, loadingVehicles, vehicleError, refreshVehicles, removeVehiclePhotoLocal,
    movements, loadingMovements, movementError, refreshMovements,
    users, loadingUsers, usersError, refreshUsers,
    addVehicle, updateVehicle, deleteVehicle,
    addMovement, updateMovement, deleteMovement,
    addUser, updateUser, deleteUser, resetDemo,
  }), [vehicles,movements,users,loadingVehicles,vehicleError,loadingMovements,movementError,loadingUsers,usersError,currentUser?.id])
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}
export const useAppData = () => useContext(AppDataContext)
