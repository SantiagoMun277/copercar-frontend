import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validarMovimiento, validarCambioEstado, validarEliminacionMovimiento,
  ventasActivas, comprasPrevias,
} from '../src/utils/reglasVentaFrontend.js'
import { anularVentasYGuardarVehiculo } from '../src/utils/coordinadorAnulacionVenta.js'

const vehiculo = (status='Disponible') => ({id:7,plate:'ABC123',status})
const compra = {id:1,vehicleId:7,type:'Compra',date:'2026-11-01',deleted:false}
const compraTardia = {id:5,vehicleId:7,type:'Compra',date:'2026-11-08',deleted:false}
const venta = {id:2,vehicleId:7,type:'Venta',date:'2026-11-05',deleted:false}
const otro = {id:3,vehicleId:7,type:'Mantenimiento',date:'2026-11-02',deleted:false}
const revisar = (status,tipo,movs=[],original=null,date='2026-11-05') =>
  validarMovimiento({movimiento:{id:original?.id,vehicleId:7,type:tipo,date},vehiculos:[vehiculo(status)],movimientos:movs,original})

test('R1: sin COMPRA activa impide VENTA',()=>{
  assert.match(revisar('Vendido','Venta',[]), /COMPRA activa/)
  assert.match(revisar('Vendido','Venta',[{...compra,deleted:true}]), /COMPRA activa/)
  assert.equal(revisar('Vendido','Venta',[compra]), null)
})
test('R1: la COMPRA debe ser anterior o de la misma fecha',()=>{
  assert.match(revisar('Vendido','Venta',[compraTardia]), /anterior a la COMPRA/)
  assert.equal(revisar('Vendido','Venta',[{...compra,date:'2026-11-05'}]),null)
  assert.equal(revisar('Vendido','Venta',[compra,compraTardia]),null)
  assert.deepEqual(comprasPrevias([compra,compraTardia],7,'2026-11-05'),[compra])
})
test('R1: la VENTA requiere una fecha válida',()=>{
  assert.match(revisar('Vendido','Venta',[compra],null,''), /Selecciona una fecha válida/)
})
test('R3: la VENTA exige que el inventario ya marque Vendido',()=>{
  for (const estado of ['Disponible','Ingresando','Separado','No disponible'])
    assert.match(revisar(estado,'Venta',[compra]), /marcarlo como Vendido/)
})
test('R3: permite la primera VENTA de un Vendido con COMPRA',()=>{
  assert.equal(revisar('Vendido','Venta',[compra]),null)
})
test('R3: impide segunda VENTA en estado Vendido',()=>{
  assert.match(revisar('Vendido','Venta',[compra,venta]),/VENTA activa/)
})
test('R3: bloquea cualquier otro movimiento nuevo en Vendido',()=>{
  for (const tipo of ['Compra','Mantenimiento','Impuesto','Seguro','Otro ingreso'])
    assert.match(revisar('Vendido',tipo,[compra]),/no admite movimientos nuevos/)
})
test('R3: si regresa a Disponible se admiten movimientos ordinarios',()=>{
  assert.equal(revisar('Disponible','Mantenimiento',[compra]),null)
})
test('R3: edición de VENTA original es posible sin duplicarla',()=>{
  assert.equal(revisar('Vendido','Venta',[compra,venta],venta),null)
  assert.match(revisar('Vendido','Compra',[compra,venta],venta),/anular una VENTA/)
})
test('R3: bloquea cambio de tipo de movimientos existentes en Vendido',()=>{
  assert.match(revisar('Vendido','Mantenimiento',[compra,venta],compra),/no se permite cambiar el tipo/)
})
test('R1: no admite adelantar la fecha de una VENTA por delante de su COMPRA',()=>{
  assert.match(revisar('Vendido','Venta',[compra,venta],venta,'2026-10-31'),/anterior a la COMPRA/)
})
test('R1: no permite modificar una COMPRA para dejar VENTA sin respaldo cronológico',()=>{
  assert.match(revisar('Vendido','Compra',[compra,venta],compra,'2026-11-09'),/VENTA activa quedaría/)
  assert.equal(revisar('Vendido','Compra',[compra,venta],compra,'2026-11-04'),null)
})
test('R1: otra COMPRA anterior permite modificar la primera sin invalidar VENTA',()=>{
  assert.equal(revisar('Disponible','Compra',[compra,{...compra,id:9,date:'2026-10-30'},venta],compra,'2026-11-09'),null)
})
test('R1: no se puede convertir COMPRA a otra operación dejando VENTA sin respaldo',()=>{
  assert.match(revisar('Disponible','Mantenimiento',[compra,venta],compra),/VENTA activa quedaría/)
})
test('R1: protege ante eliminación de única COMPRA previa a una VENTA',()=>{
  assert.match(validarEliminacionMovimiento({movimiento:compra,movimientos:[compra,venta]}),/VENTA activa quedaría/)
  assert.match(validarEliminacionMovimiento({movimiento:compra,movimientos:[compra,compraTardia,venta]}),/VENTA activa quedaría/)
  assert.equal(validarEliminacionMovimiento({movimiento:compra,movimientos:[compra,{...compra,id:10},venta]}),null)
})
test('R4: permite Vendido -> Disponible en la interfaz de administrador',()=>{
  assert.equal(validarCambioEstado({anterior:vehiculo('Vendido'),siguiente:vehiculo('Disponible'),movimientos:[compra,venta]}),null)
  assert.deepEqual(ventasActivas([compra,venta,{...venta,id:12,deleted:true}],7),[venta])
})
test('R4: prohíbe ir desde Vendido hacia estado diferente de Disponible si existe VENTA',()=>{
  assert.match(validarCambioEstado({anterior:vehiculo('Vendido'),siguiente:vehiculo('Separado'),movimientos:[compra,venta]}),/Disponible/)
})
test('extra: administrador no marca Vendido si no existe compra activa',()=>{
  assert.match(validarCambioEstado({anterior:vehiculo('Disponible'),siguiente:vehiculo('Vendido'),movimientos:[]}),/COMPRA activa/)
  assert.equal(validarCambioEstado({anterior:vehiculo('Disponible'),siguiente:vehiculo('Vendido'),movimientos:[compra]}),null)
})
test('extra: eliminación de venta desde movimientos se bloquea mientras esté Vendido',()=>{
  assert.match(validarEliminacionMovimiento({movimiento:venta,movimientos:[venta],vehiculo:vehiculo('Vendido')}),/cambia el vehículo/)
  assert.equal(validarEliminacionMovimiento({movimiento:venta,movimientos:[venta],vehiculo:vehiculo('Disponible')}),null)
})
test('extra: no se puede cambiar el vehículo de un movimiento existente',()=>{
  assert.match(validarMovimiento({movimiento:{...venta,vehicleId:99},vehiculos:[vehiculo('Vendido')],movimientos:[venta],original:venta}),/No se encontró|cambiar el vehículo/)
})
test('extra: confirma registro inexistente/anulado',()=>{
  assert.match(validarMovimiento({movimiento:{vehicleId:99,type:'Venta'},vehiculos:[vehiculo('Vendido')],movimientos:[compra]}),/No se encontró/)
  assert.match(validarEliminacionMovimiento({movimiento:{...otro,deleted:true},movimientos:[otro]}),/ya no está activo/)
})
test('R4: anula lógicamente VENTA antes de guardar Disponible y verifica resultado',async()=>{
  const calls=[]
  const result=await anularVentasYGuardarVehiculo({
    ventas:[venta,{...venta,id:9}],
    anularVenta:async id=>{calls.push(`DELETE-logico:${id}`)},
    guardarVehiculo:async()=>{calls.push('PUT:Disponible');return {status:'Disponible'}},
    verificar:async()=>calls.push('GET:verificar'),
    refrescar:async()=>calls.push('GET:refrescar'),
  })
  assert.deepEqual(calls,['DELETE-logico:2','DELETE-logico:9','PUT:Disponible','GET:verificar'])
  assert.equal(result.status,'Disponible')
})
test('R4: cuando falla DELETE, nunca cambia estado y advierte confirmación parcial',async()=>{
  const calls=[]
  await assert.rejects(anularVentasYGuardarVehiculo({
    ventas:[venta,{...venta,id:9}],
    anularVenta:async id=>{calls.push(`DELETE:${id}`);if(id===9)throw new Error('red caída')},
    guardarVehiculo:async()=>{calls.push('PUT')},
    refrescar:async()=>calls.push('refrescar'),
  }),/1 de 2 anulaciones/)
  assert.deepEqual(calls,['DELETE:2','DELETE:9','refrescar'])
})
test('R4: al fallar el primer PUT, reintenta solo PUT y no DELETE',async()=>{
  let n=0, eliminaciones=0
  const r=await anularVentasYGuardarVehiculo({
    ventas:[venta],anularVenta:async()=>{eliminaciones++},
    guardarVehiculo:async()=>{if(++n===1)throw new Error('corte');return {ok:true}},
    verificar:async()=>{},
  })
  assert.equal(n,2);assert.equal(eliminaciones,1);assert.deepEqual(r,{ok:true})
})
test('R4: si falla repetidamente PUT, informa que la transacción es parcial',async()=>{
  let n=0
  await assert.rejects(anularVentasYGuardarVehiculo({
    ventas:[venta],anularVenta:async()=>{},guardarVehiculo:async()=>{n++;throw new Error('sin conexión')},refrescar:async()=>{}
  }),/No repitas la operación/)
  assert.equal(n,2)
})
test('R4: si falla GET de verificación, no afirma éxito y advierte estado incierto',async()=>{
  await assert.rejects(anularVentasYGuardarVehiculo({
    ventas:[venta],anularVenta:async()=>{},guardarVehiculo:async()=>({ok:true}),
    verificar:async()=>{throw new Error('GET no disponible')},refrescar:async()=>{}
  }),/no se pudo confirmar su resultado final/)
})
test('R4: sin ventas vigentes PUT se ejecuta una vez y no inventa anulaciones',async()=>{
  let n=0
  await assert.rejects(anularVentasYGuardarVehiculo({
    ventas:[],anularVenta:async()=>{},guardarVehiculo:async()=>{n++;throw new Error('falló PUT')},refrescar:async()=>{}
  }),/falló PUT/)
  assert.equal(n,1)
})
