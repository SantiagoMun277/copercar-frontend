import { listarCatalogo } from './brandsLines'

// Carga el catálogo de referencia de la base de datos y, cuando están disponibles,
// lo actualiza con las marcas/líneas reales del servicio. No crea datos ni guarda cambios.
// Reutiliza una consulta reciente para evitar descargar 1104 municipios y repetir
// solicitudes al catálogo cada vez que se actualiza el inventario.
// Las modificaciones de marcas/líneas invalidan esta caché.
const VIGENCIA_MS = 45000
let cache = null
let cacheDesde = 0
let pendiente = null

export function invalidarCatalogoVehiculos() {
  cache = null
  cacheDesde = 0
}

export async function cargarCatalogoVehiculos() {
  if (cache && Date.now() - cacheDesde < VIGENCIA_MS) return cache
  if (pendiente) return pendiente
  pendiente = cargarDelServidor()
  try {
    const datos = await pendiente
    cache = datos
    cacheDesde = Date.now()
    return datos
  } finally {
    pendiente = null
  }
}

async function cargarDelServidor() {
  const response=await fetch(`${import.meta.env.BASE_URL}catalogos/copercar.json`,{cache:'no-store'})
  if (!response.ok) throw new Error('No se pudieron cargar las opciones disponibles.')
  const saved=await response.json()
  if (!Array.isArray(saved.marcas) || !Array.isArray(saved.lineas) || !Array.isArray(saved.ciudades) || saved.ciudades.length<1000) {
    throw new Error('No se pudieron cargar las opciones disponibles.')
  }
  // Una sola petición remota proporciona tanto marcas como líneas.
  // Si está restringida para el rol actual, conservamos el catálogo local.
  try {
    const rawBrands = await listarCatalogo()
    if (rawBrands.length) {
      const rawLines = rawBrands.flatMap(m => (m.lineas || []).map(l => ({
        ...l, id_marca: l.id_marca ?? m.id_marca,
      })))
      saved.marcas = rawBrands.map(m => ({
        id: Number(m.id_marca ?? m.id),
        name: String(m.nombre ?? m.name ?? ''),
        active: Boolean(m.activo ?? m.active ?? true),
      })).filter(m => Number.isFinite(m.id) && m.name && m.active)
      saved.lineas = rawLines.map(l => ({
        id: Number(l.id_linea ?? l.id),
        brandId: Number(l.id_marca ?? l.brandId),
        name: String(l.nombre ?? l.name ?? ''),
        active: Boolean(l.activo ?? l.active ?? true),
      })).filter(l => Number.isFinite(l.id) && Number.isFinite(l.brandId) && l.name && l.active)
    }
  } catch { /* El catálogo público de referencia sigue disponible. */ }
  return saved
}
