import { apiRequest } from './api'
// Adaptadores HTTP preparados para FastAPI. No se llaman mientras funciona el modo demo.
// Confirmar rutas, nombres de propiedades y autenticación con el responsable del backend.
const resource = (base) => ({
  list: () => apiRequest(base),
  get: (id) => apiRequest(`${base}/${encodeURIComponent(id)}`),
  create: (data) => apiRequest(base, { method: 'POST', body: JSON.stringify(data) }),
  update: (id,data) => apiRequest(`${base}/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => apiRequest(`${base}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
})
export const vehicleApi = resource('/vehiculos')
export const movementApi = resource('/movimientos')
export const userApi = resource('/usuarios')
export const reportApi = { byPeriod: (year,month) => apiRequest(`/reportes?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`) }
export const authApi = { login: (email,password) => apiRequest('/auth/login', {method:'POST',body:JSON.stringify({email,password})}) }

// Catálogos oficiales pendientes de implementar en FastAPI. En la fase demo,
// los formularios usan src/data/catalogs.js y admiten municipio manual.
export const catalogApi = {
  departments: () => apiRequest('/catalogos/departamentos'),
  municipalities: departmentId => apiRequest(`/catalogos/municipios?departamentoId=${encodeURIComponent(departmentId)}`),
}
