import { listarMarcas, listarLineas } from './brandsLines'

// Carga el catálogo de referencia de la base de datos y, cuando están disponibles,
// lo actualiza con las marcas/líneas reales del servicio. No crea datos ni guarda cambios.
const list = result => Array.isArray(result) ? result : Array.isArray(result?.items) ? result.items : null
export async function cargarCatalogoVehiculos() {
  const response=await fetch('/catalogos/copercar.json',{cache:'no-store'})
  if (!response.ok) throw new Error('No se pudieron cargar las opciones disponibles.')
  const saved=await response.json()
  if (!Array.isArray(saved.marcas) || !Array.isArray(saved.lineas) || !Array.isArray(saved.ciudades) || saved.ciudades.length<1000) {
    throw new Error('No se pudieron cargar las opciones disponibles.')
  }
  // El servicio es opcional hasta que se habiliten sus rutas; no se muestra información inventada.
  const live=await Promise.allSettled([listarMarcas(),listarLineas()])
  if (live.every(r=>r.status==='fulfilled')) {
    const rawBrands=list(live[0].value),rawLines=list(live[1].value)
    if (rawBrands && rawLines && rawBrands.length) {
      saved.marcas=rawBrands.map(m=>({id:Number(m.id_marca ?? m.id),name:String(m.nombre ?? m.name ?? ''),active:Boolean(m.activo ?? m.active ?? true)}))
        .filter(m=>Number.isFinite(m.id)&&m.name&&m.active)
      saved.lineas=rawLines.map(l=>({id:Number(l.id_linea ?? l.id),brandId:Number(l.id_marca ?? l.brandId),name:String(l.nombre ?? l.name ?? ''),active:Boolean(l.activo ?? l.active ?? true)}))
        .filter(l=>Number.isFinite(l.id)&&Number.isFinite(l.brandId)&&l.name&&l.active)
    }
  }
  return saved
}
