// Fechas compartidas por el listado y la edición de vehículos. Solo lectura.
// Las fechas sin hora (YYYY-MM-DD) se muestran literalmente para evitar cambios de día.
// Los DateTime sin zona de este backend se generan con datetime.utcnow: se interpretan como UTC.
const ZONA_COLOMBIA = 'America/Bogota'
const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/
const CON_HORA = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/i
const CON_ZONA = /(?:Z|[+-]\d{2}:?\d{2})$/i

export function formatearFechaInventario(valor) {
  if (typeof valor !== 'string' || !valor.trim()) return null
  const texto = valor.trim()
  const soloFecha = SOLO_FECHA.exec(texto)
  if (soloFecha) {
    const [, anio, mes, dia] = soloFecha
    const fechaUTC = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)))
    if (!Number.isFinite(fechaUTC.getTime()) || fechaUTC.getUTCFullYear() !== Number(anio) ||
        fechaUTC.getUTCMonth() !== Number(mes) - 1 || fechaUTC.getUTCDate() !== Number(dia)) return null
    return { fecha: `${dia}/${mes}/${anio}`, hora: null }
  }
  if (!CON_HORA.test(texto)) return null
  // En la versión inspeccionada, fecha_registro se guarda con datetime.utcnow sin zona.
  const cadena = texto.replace(' ', 'T') + (CON_ZONA.test(texto) ? '' : 'Z')
  const instant = new Date(cadena)
  if (!Number.isFinite(instant.getTime())) return null
  return {
    fecha: new Intl.DateTimeFormat('es-CO', { timeZone: ZONA_COLOMBIA, day: '2-digit', month: '2-digit', year: 'numeric' }).format(instant),
    hora: new Intl.DateTimeFormat('es-CO', { timeZone: ZONA_COLOMBIA, hour: 'numeric', minute: '2-digit', hour12: true }).format(instant),
  }
}

export function obtenerFechasVentaActivas(movimientos = []) {
  const fechasPorVehiculo = new Map()
  for (const movimiento of movimientos) {
    if (movimiento.deleted || (movimiento.type !== 'Venta' && Number(movimiento.typeId) !== 2)) continue
    const id = Number(movimiento.vehicleId)
    const fecha = movimiento.date
    if (!Number.isInteger(id) || id <= 0 || !formatearFechaInventario(fecha)) continue
    const anterior = fechasPorVehiculo.get(id)
    if (!anterior || String(fecha) > String(anterior)) fechasPorVehiculo.set(id, fecha)
  }
  return fechasPorVehiculo
}

// Se respeta el estado ACTUAL del inventario; no recuperar una venta anulada
// ni aparentar una venta vigente por un historial antiguo de movimientos.
export function fechaIngresoParaMostrar(vehiculo) {
  const fecha = formatearFechaInventario(vehiculo?.fechaRegistro)
  return fecha ? `${fecha.fecha}${fecha.hora ? ` · ${fecha.hora}` : ''}` : 'Fecha no disponible'
}

export function fechaVentaParaMostrar(vehiculo, fechasPorVehiculo, {consultando = false} = {}) {
  if (String(vehiculo?.status || '').trim().toLowerCase() !== 'vendido') return 'Sin venta vigente'
  // Prioridad: fecha/hora vigente informada directamente por la API de vehículos.
  // Si no existe, usar los movimientos activos que ya cargó el administrador.
  const directa = formatearFechaInventario(vehiculo?.fechaVenta)
  const historica = formatearFechaInventario(fechasPorVehiculo?.get(Number(vehiculo?.id)))
  const disponible = directa || historica
  if (disponible) return `${disponible.fecha}${disponible.hora ? ` · ${disponible.hora}` : ''}`
  return consultando ? 'Consultando…' : 'Fecha no disponible'
}
