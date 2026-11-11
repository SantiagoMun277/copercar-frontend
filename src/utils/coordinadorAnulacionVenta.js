// Orquesta los endpoints existentes. NO es una transacción en MySQL.
// Un PUT de vehículo es idempotente: si falla por un corte de conexión se reintenta
// una vez. Nunca se reintenta automáticamente un DELETE de venta.
export async function anularVentasYGuardarVehiculo({ ventas, anularVenta, guardarVehiculo, verificar, refrescar }) {
  let confirmadas = 0
  let intentadas = 0
  let guardadoConfirmado = false
  try {
    for (const venta of ventas) {
      intentadas++
      await anularVenta(venta.id)
      confirmadas++
    }
    let resultado
    try { resultado = await guardarVehiculo() }
    catch (error) {
      if (!ventas.length) throw error
      // Repetir solo la solicitud idempotente de actualización del estado.
      resultado = await guardarVehiculo()
    }
    guardadoConfirmado = true
    if (verificar) await verificar()
    return resultado
  } catch (error) {
    if (!intentadas) throw error
    try { if (refrescar) await refrescar() } catch { /* mostrar siempre el error original */ }
    const fase = guardadoConfirmado ? 'Las operaciones se enviaron, pero no se pudo confirmar su resultado final.' : 'La cancelación completa no pudo confirmarse.'
    throw new Error(`ATENCIÓN: se confirmaron ${confirmadas} de ${ventas.length} anulaciones. ${fase} No repitas la operación sin comprobar inventario, movimientos y reportes. Detalle: ${error?.message || 'fallo de conexión'}`)
  }
}
