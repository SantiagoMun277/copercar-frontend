import { apiRequest, apiTokenKey } from './api'

export async function loginBackend(email, password) {
  // OAuth2PasswordRequestForm: no enviar JSON a /auth/token.
  const body = new URLSearchParams({ username: email.trim(), password, grant_type: 'password' })
  const result = await apiRequest('/auth/token', { method: 'POST', body })
  if (!result?.access_token) throw new Error('El backend no devolvio un token de acceso.')
  sessionStorage.setItem(apiTokenKey, result.access_token)
  try { return await getBackendUser() }
  catch (error) { sessionStorage.removeItem(apiTokenKey); throw error }
}

export async function getBackendUser() {
  const data = await apiRequest('/auth/me')
  return {
    id: data.id_usuario, role: Number(data.rol?.id_rol ?? data.id_rol) === 1 ? 'admin' : 'asesor',
    documentType: {CC:'Cédula',CE:'Cédula de extranjería',PAS:'Pasaporte',NIT:'NIT'}[data.tipo_documento] || data.tipo_documento,
    documentNumber: data.numero_documento || '',
    firstName: data.primer_nombre || '', secondName: data.segundo_nombre || '',
    lastName: data.primer_apellido || '', secondLastName: data.segundo_apellido || '',
    email: data.correo, phone: data.celular || '',
    birthDate: data.fecha_nacimiento || '', gender: data.genero || '',
    address: data.direccion || '', active: data.activo,
  }
}

export async function listarVehiculosBackend() {
  // FastAPI limita cada pagina a 20 vehiculos. Recuperar las paginas completas.
  const all = []
  const limit = 20
  for (let skip = 0; skip < 10000; skip += limit) {
    const page = await apiRequest(`/vehiculos/listar_activos?skip=${skip}&limit=${limit}`)
    if (!Array.isArray(page)) throw new Error('Respuesta inesperada del inventario.')
    all.push(...page)
    if (page.length < limit) return all
  }
  throw new Error('Inventario demasiado grande para la paginacion configurada.')
}

export const crearVehiculoBackend = data => apiRequest('/vehiculos/crear', { method:'POST', body:JSON.stringify(data) })
export const actualizarVehiculoBackend = (id, data) => apiRequest(`/vehiculos/actualizar/${encodeURIComponent(id)}`, {method:'PUT', body:JSON.stringify(data)})
export const eliminarVehiculoBackend = id => apiRequest(`/vehiculos/eliminar/${encodeURIComponent(id)}`, {method:'DELETE'})
export const buscarVehiculoBackend = placa => apiRequest(`/vehiculos/placa/${encodeURIComponent(placa)}`)
export const filtrarVehiculoBackend = estadoId => apiRequest(`/vehiculos/filtrar/estado/${encodeURIComponent(estadoId)}`)

// Contratos del backend de Juan (ramas /usuarios, /movimientos y /reportes).
// El backend actualizado permite listar administradores y asesores.
const documentCodes = { 'Cédula':'CC', 'Cédula de extranjería':'CE', 'Pasaporte':'PAS', 'NIT':'NIT' }
const displayDocuments = { CC:'Cédula', CE:'Cédula de extranjería', PAS:'Pasaporte', NIT:'NIT' }

export function fromBackendUser(data) {
  return {
    id: data.id_usuario,
    role: Number(data.rol?.id_rol ?? data.id_rol) === 1 ? 'admin' : 'asesor',
    documentType: displayDocuments[data.tipo_documento] || data.tipo_documento || 'Cédula',
    documentNumber: data.numero_documento || '',
    firstName: data.primer_nombre || '', secondName: data.segundo_nombre || '',
    lastName: data.primer_apellido || '', secondLastName: data.segundo_apellido || '',
    email: data.correo || '', phone: data.celular || '',
    birthDate: data.fecha_nacimiento || '', gender: data.genero || '',
    address: data.direccion || '', active: data.activo === true || data.activo === 1,
  }
}

export function toBackendUser(data, editing = false) {
  const payload = {
    tipo_documento: documentCodes[data.documentType] || data.documentType,
    numero_documento: String(data.documentNumber || '').trim(),
    primer_nombre: String(data.firstName || '').trim(),
    segundo_nombre: String(data.secondName || '').trim() || null,
    primer_apellido: String(data.lastName || '').trim(),
    segundo_apellido: String(data.secondLastName || '').trim() || null,
    correo: String(data.email || '').trim().toLowerCase(),
    celular: String(data.phone || '').trim(),
    fecha_nacimiento: data.birthDate, genero: data.gender,
    direccion: String(data.address || '').trim(),
  }
  if (data.password) payload.contrasena = data.password
  if (editing && data.active !== undefined) payload.activo = Boolean(data.active)
  // id_rol es obligatorio en UsuarioCreate y NO esta admitido por UsuarioUpdate.
  if (!editing) payload.id_rol = data.role === 'admin' ? 1 : 2
  if (!editing && !payload.contrasena) throw new Error('La contraseña es obligatoria.')
  return payload
}

export async function listarUsuariosBackend() {
  const all = []
  const limit = 100
  for (let skip = 0; skip < 10000; skip += limit) {
    const page = await apiRequest(`/usuarios/listar/?skip=${skip}&limit=${limit}`)
    if (!Array.isArray(page)) throw new Error('No se pudo cargar el listado de usuarios.')
    all.push(...page)
    if (page.length < limit) return all.map(fromBackendUser)
  }
  throw new Error('No fue posible cargar todos los usuarios.')
}
export const crearUsuarioBackend = async data => {
  // Juan exige id_rol y crea siempre activo. Si pidieron inactivo, usar PUT despues.
  const creado = await apiRequest('/usuarios/crear/', {method:'POST',body:JSON.stringify(toBackendUser(data))})
  if (data.active === false) {
    if (!creado?.id_usuario) throw new Error('El usuario fue creado, pero no se pudo confirmar su identificador. Revisa el listado antes de intentarlo otra vez.')
    try {
      return await apiRequest(`/usuarios/modificar/${encodeURIComponent(creado.id_usuario)}`, {method:'PUT',body:JSON.stringify({activo:false})})
    } catch {
      throw new Error('El usuario se creó activo, pero no se pudo desactivar. Busca su registro en el listado y cámbialo desde Editar.')
    }
  }
  return creado
}
export const actualizarUsuarioBackend = (id, data) =>
  apiRequest(`/usuarios/modificar/${encodeURIComponent(id)}`, {method:'PUT',body:JSON.stringify(toBackendUser(data,true))})
// Nunca llamar /usuarios/elimiar/{id}: ese endpoint hace un DELETE FÍSICO.
// Baja reversible con el PUT disponible, preservando las referencias de movimientos.
export const desactivarUsuarioBackend = id => apiRequest(`/usuarios/modificar/${encodeURIComponent(id)}`, {method:'PUT',body:JSON.stringify({activo:false})})

export const MOVEMENT_TYPES = [
  ['Compra',1],['Venta',2],['Impuesto',3],['Mantenimiento',4],['Reparación',5],
  ['Seguro',6],['RTM',7],['Otro gasto',8],['Otro ingreso',9]
]
const typeIds = Object.fromEntries(MOVEMENT_TYPES)
const labelById = Object.fromEntries(MOVEMENT_TYPES.map(([label,id]) => [id,label]))
export const fromBackendMovement = (m, vehicles = []) => {
  const vehicle = vehicles.find(v => Number(v.id) === Number(m.id_vehiculo))
  const kind = String(m.tipo_movimiento?.nombre || '').trim().toUpperCase()
  return {
    id: m.id_movimiento, vehicleId:m.id_vehiculo,
    type: labelById[Number(m.id_tipo_movimiento)] || labelById[Number(Object.entries(typeIds).find(([label,id])=>label.toUpperCase().replace('Ó','O').replaceAll(' ','_')===kind)?.[1])] || kind,
    typeId: m.id_tipo_movimiento, date:m.fecha_movimiento,
    value:Number(m.valor), observation:m.observacion || '',
    userId:m.id_usuario, user:m.usuario ? `${m.usuario.primer_nombre || ''} ${m.usuario.primer_apellido || ''}`.trim() : `Usuario ${m.id_usuario}`,
    plate:vehicle?.plate || '', vehicle:vehicle?.title || `Vehículo ${m.id_vehiculo}`,
    deleted:m.activo === false,
  }
}
export const toBackendMovement = (m, editing = false) => {
  const result = { id_tipo_movimiento:typeIds[m.type],fecha_movimiento:m.date,valor:Number(m.value),observacion:String(m.observation || '') || null }
  if (!result.id_tipo_movimiento) throw new Error('Selecciona un tipo de movimiento válido.')
  if (!editing) result.id_vehiculo = Number(m.vehicleId)
  return result
}
export async function listarMovimientosBackend(vehicles = []) {
  const all = []
  const limit = 100
  for (let skip = 0; skip < 50000; skip += limit) {
    const page = await apiRequest(`/movimientos/filtrar?skip=${skip}&limit=${limit}`)
    if (!Array.isArray(page)) throw new Error('Respuesta inesperada del listado de movimientos.')
    all.push(...page)
    if (page.length < limit) return all.map(m => fromBackendMovement(m, vehicles))
  }
  throw new Error('Hay demasiados movimientos para la paginación configurada.')
}
export const crearMovimientoBackend = m => apiRequest('/movimientos/crear', {method:'POST',body:JSON.stringify(toBackendMovement(m))})
export const actualizarMovimientoBackend = (id, m) => apiRequest(`/movimientos/actualizar/${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify(toBackendMovement(m,true))})
export const eliminarMovimientoBackend = id => apiRequest(`/movimientos/eliminar/${encodeURIComponent(id)}`,{method:'DELETE'})
export const reporteMensualBackend = (year, month) => apiRequest(`/reportes/finanzas?anio=${encodeURIComponent(year)}&mes=${encodeURIComponent(month)}`)

export const subirFotoVehiculoBackend = (idVehiculo, blob, orden = 0, principal = false) => {
  const body = new FormData()
  body.append('archivo', blob, `copercar_${Date.now()}_${orden}.jpg`)
  return apiRequest(`/vehiculos/subir_foto/${encodeURIComponent(idVehiculo)}/?es_principal=${principal}&orden=${orden}`, {method:'POST',body})
}
