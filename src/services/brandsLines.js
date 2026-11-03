import { apiRequest } from './api'

// Contrato real de Juan (2026-11-02). GET lista únicamente marcas y líneas activas.
const root = '/marcas_lineas'
export async function listarCatalogo() {
  const todo = []
  const limit = 100
  for (let skip = 0; skip < 10000; skip += limit) {
    const page = await apiRequest(`${root}/listar/?skip=${skip}&limit=${limit}`)
    if (!Array.isArray(page)) throw new Error('No fue posible cargar las marcas y líneas.')
    todo.push(...page)
    if (page.length < limit) return todo
  }
  throw new Error('Hay demasiadas marcas para cargarlas completamente.')
}
export async function listarMarcas() {
  return (await listarCatalogo()).map(m=>({id_marca:m.id_marca,nombre:m.nombre,activo:true}))
}
export async function listarLineas() {
  return (await listarCatalogo()).flatMap(m=>(m.lineas || []).map(l=>({id_linea:l.id_linea,id_marca:l.id_marca ?? m.id_marca,nombre:l.nombre,activo:true})))
}
export const crearMarcaConLinea = (nombreMarca, nombreLinea) =>
  apiRequest(`${root}/crear`,{method:'POST',body:JSON.stringify({nombre_marca:nombreMarca,nombre_linea:nombreLinea})})

// El mismo POST agrega una linea a una marca existente si su nombre coincide.
export async function crearLinea(idMarca, nombre) {
  const marca = (await listarMarcas()).find(m=>Number(m.id_marca)===Number(idMarca))
  if (!marca) throw new Error('La marca seleccionada ya no está disponible. Actualiza la página.')
  return crearMarcaConLinea(marca.nombre,nombre)
}
export const editarMarca = (id, nombre, activo=true) => {
  if (activo===false) return eliminarMarca(id)
  return apiRequest(`${root}/actualizar/marcas/${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify({nombre})})
}
export const editarLinea = (id, nombre, activo=true) => {
  if (activo===false) return eliminarLinea(id)
  return apiRequest(`${root}/actualizar/lineas/${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify({nombre})})
}
// DELETE es desactivación lógica en la API; no destruye los registros de la BD.
export const eliminarMarca = id => apiRequest(`${root}/eliminar/marca/${encodeURIComponent(id)}`,{method:'DELETE'})
export const eliminarLinea = id => apiRequest(`${root}/eliminar/linea/${encodeURIComponent(id)}`,{method:'DELETE'})
