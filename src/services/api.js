// Conecta la interfaz React con el backend actualizado de COPERCAR.
// El proxy de Vite reenvia /backend-api al puerto 8001 en desarrollo.
import { readableBackendValidation } from '../utils/formValidation'

export const backendMode = import.meta.env.VITE_API_MODE === 'backend'
export const API_URL = backendMode ? (import.meta.env.VITE_API_URL || '/backend-api') : (import.meta.env.VITE_API_URL || 'http://localhost:8000/api')
export const apiTokenKey = 'copercar_backend_token'

export async function apiRequest(path, options = {}) {
  const { headers: suppliedHeaders, ...requestOptions } = options
  const headers = new Headers(suppliedHeaders || {})
  if (!headers.has('Content-Type') && requestOptions.body && !(requestOptions.body instanceof FormData)) {
    headers.set('Content-Type', requestOptions.body instanceof URLSearchParams ? 'application/x-www-form-urlencoded' : 'application/json')
  }
  const token = sessionStorage.getItem(apiTokenKey)
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
  let response
  try { response = await fetch(`${API_URL}${path}`, { ...requestOptions, headers }) }
  catch { throw new Error('No fue posible establecer la conexión. Inténtalo nuevamente.') }
  const raw = await response.text()
  let result = null
  try { result = raw ? JSON.parse(raw) : null } catch { result = raw }
  if (!response.ok) {
    const detail = result?.detail
    // FastAPI/Pydantic (HTTP 422) proporciona el nombre real del campo en loc.
    const aliases = {
      titulo:'title', id_estado:'status',id_linea:'line',id_ciudad:'city',placa:'plate',color:'color',
      modelo:'year',kilometraje:'mileage',precio:'price',cantidad_duenos:'owners',cilindraje:'engine',
      id_combustible:'fuel',id_transmision:'transmission',fecha_vencimiento_soat:'soatExpiry',fecha_vencimiento_rtm:'rtmExpiry',
      id_rol:'role',tipo_documento:'documentType',numero_documento:'documentNumber',primer_nombre:'firstName',segundo_nombre:'secondName',
      primer_apellido:'lastName',segundo_apellido:'secondLastName',correo:'email',celular:'phone',
      fecha_nacimiento:'birthDate',genero:'gender',contrasena:'password',direccion:'address',
      id_vehiculo:'vehicleId',id_tipo_movimiento:'type',fecha_movimiento:'date',valor:'value',observacion:'observation',archivo:'photos',
    }
    const fieldErrors = {}
    if (Array.isArray(detail)) {
      for (const item of detail) {
        const field = aliases[(item.loc || []).filter(x=>typeof x === 'string').at(-1)]
        if (field && !fieldErrors[field]) fieldErrors[field] = readableBackendValidation(item.type, item.ctx)
      }
    }
    const readable = typeof detail === 'string' ? detail : (Object.keys(fieldErrors).length ? 'El servidor rechazó uno o más campos del formulario.' : '')
    const fallback = response.status === 401 ? 'Correo o contraseña incorrectos, o sesión vencida.'
      : response.status === 403 ? 'No tienes permiso para esta operación.'
      : response.status === 404 ? 'No se encontró el recurso solicitado.'
      : response.status >= 500 ? 'No se pudo completar la operación. Inténtalo nuevamente.'
      : `No se pudo completar la solicitud.`
    const error = new Error(readable || fallback)
    error.status = response.status
    error.fieldErrors = fieldErrors
    throw error
  }
  return result
}
