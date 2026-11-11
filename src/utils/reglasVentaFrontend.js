// Validaciones preventivas de COPERCAR a partir de los datos consultados a FastAPI.
// No sustituyen transacciones ni permisos del backend.
const normalizar = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
const esTipo = (movimiento, tipo) => normalizar(movimiento?.type) === normalizar(tipo)
const fechaISO = valor => typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : null
const fechaCompraValida = (compra, venta) => {
  const fechaVenta = fechaISO(venta?.date)
  // Si todavía no se seleccionó fecha, el formulario se encarga de exigirla.
  if (!fechaVenta) return false
  const fechaCompra = fechaISO(compra?.date)
  return Boolean(fechaCompra && fechaCompra <= fechaVenta)
}
export const estaVendido = vehiculo => normalizar(vehiculo?.status) === 'vendido'
export const estaDisponible = vehiculo => normalizar(vehiculo?.status) === 'disponible'
export const movimientosActivos = (movimientos, vehicleId) => (movimientos || []).filter(m =>
  !m.deleted && Number(m.vehicleId) === Number(vehicleId)
)
export const comprasActivas = (movimientos, vehicleId) => movimientosActivos(movimientos, vehicleId).filter(m => esTipo(m, 'Compra'))
export const ventasActivas = (movimientos, vehicleId) => movimientosActivos(movimientos, vehicleId).filter(m => esTipo(m, 'Venta'))
export const comprasPrevias = (movimientos, vehicleId, fechaVenta) =>
  comprasActivas(movimientos, vehicleId).filter(compra => fechaCompraValida(compra, {date:fechaVenta}))

function compraRespaldaTodasLasVentas(compras, ventas) {
  return ventas.every(venta => compras.some(compra => fechaCompraValida(compra, venta)))
}

export function validarMovimiento({ movimiento, vehiculos, movimientos, original = null }) {
  const vehiculo = (vehiculos || []).find(v => Number(v.id) === Number(movimiento?.vehicleId))
  if (!vehiculo) return 'No se encontró el vehículo en el inventario actual. Actualiza la página antes de continuar.'
  if (original?.deleted) return 'El movimiento ya no está activo. Actualiza el listado.'
  if (original && Number(original.vehicleId) !== Number(movimiento.vehicleId)) {
    return 'No se permite cambiar el vehículo asociado a un movimiento existente.'
  }
  const ventas = ventasActivas(movimientos, vehiculo.id)
  const compras = comprasActivas(movimientos, vehiculo.id)
  const esVenta = esTipo(movimiento, 'Venta')
  const eraVenta = esTipo(original, 'Venta')
  const eraCompra = esTipo(original, 'Compra')
  const esCompra = esTipo(movimiento, 'Compra')
  const cambiaTipo = original && normalizar(original.type) !== normalizar(movimiento.type)

  if (original && eraVenta && !esVenta) {
    return 'Para anular una VENTA, cambia primero el vehículo de Vendido a Disponible desde el inventario.'
  }
  if (original && estaVendido(vehiculo) && cambiaTipo) {
    return 'Mientras el vehículo esté Vendido no se permite cambiar el tipo de sus movimientos.'
  }
  // Modificar una COMPRA no puede hacer que una VENTA activa quede sin una compra
  // de fecha igual o anterior. Esto incluye cambiar su tipo o su fecha.
  if (original && eraCompra && ventas.length) {
    const comprasResultantes = compras.filter(c => Number(c.id) !== Number(original.id))
    if (esCompra) comprasResultantes.push({...original, ...movimiento})
    if (!compraRespaldaTodasLasVentas(comprasResultantes, ventas)) {
      return 'No puedes modificar la COMPRA: una VENTA activa quedaría sin una COMPRA de fecha igual o anterior.'
    }
  }
  if (esVenta) {
    const comprasRestantes = compras.filter(c => !(original && eraCompra && Number(c.id) === Number(original.id)))
    if (!comprasRestantes.length) {
      return `No se puede registrar la VENTA del vehículo ${vehiculo.plate || ''}: no tiene una COMPRA activa previa.`
    }
    if (!fechaISO(movimiento.date)) {
      return 'Selecciona una fecha válida para comprobar que la COMPRA fue anterior o del mismo día.'
    }
    if (!comprasRestantes.some(compra => fechaCompraValida(compra, movimiento))) {
      return 'La VENTA no puede ser anterior a la COMPRA. Debe existir una COMPRA activa de fecha igual o anterior.'
    }
    if (!estaVendido(vehiculo)) {
      return `Para registrar la VENTA del vehículo ${vehiculo.plate || ''}, primero debes marcarlo como Vendido en el inventario.`
    }
    if (ventas.some(v => Number(v.id) !== Number(original?.id))) {
      return 'Este vehículo ya tiene una VENTA activa. No se permite registrar otra mientras permanezca Vendido.'
    }
    return null // Corregir la venta original no crea un movimiento nuevo.
  }
  if (!original && estaVendido(vehiculo)) {
    return 'El vehículo está Vendido y no admite movimientos nuevos. Solo se permite su primera VENTA válida.'
  }
  return null
}

export function validarCambioEstado({ anterior, siguiente, movimientos }) {
  if (!anterior) return 'No se encontró el vehículo en el inventario actual.'
  if (normalizar(anterior.status) === normalizar(siguiente.status)) return null
  if (estaVendido(siguiente) && !comprasActivas(movimientos, anterior.id).length) {
    return 'No puedes marcar este vehículo como Vendido porque todavía no registra una COMPRA activa.'
  }
  if (estaVendido(anterior) && !estaDisponible(siguiente) && ventasActivas(movimientos, anterior.id).length) {
    return 'Este vehículo tiene una VENTA activa. Para cancelar el negocio, cambia su estado a Disponible; así se anulará la venta.'
  }
  return null
}

export function validarEliminacionMovimiento({ movimiento, movimientos, vehiculo = null }) {
  if (!movimiento || movimiento.deleted) return 'El movimiento ya no está activo. Actualiza el listado.'
  // La anulación de ventas se realiza desde el cambio de estado del inventario,
  // no directamente desde la tabla financiera (evita un estado Vendido contradictorio).
  if (esTipo(movimiento, 'Venta') && estaVendido(vehiculo)) {
    return 'Para anular esta VENTA, cambia el vehículo de Vendido a Disponible desde el inventario.'
  }
  if (esTipo(movimiento, 'Compra')) {
    const restantes = comprasActivas(movimientos, movimiento.vehicleId).filter(m => Number(m.id) !== Number(movimiento.id))
    const ventas = ventasActivas(movimientos, movimiento.vehicleId)
    if (!compraRespaldaTodasLasVentas(restantes, ventas)) {
      return 'No puedes eliminar esta COMPRA: una VENTA activa quedaría sin una COMPRA de fecha igual o anterior.'
    }
  }
  return null
}
