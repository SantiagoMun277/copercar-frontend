import assert from 'node:assert/strict'
import { demoVehicles, demoUsers, demoMovements } from '../src/data/mockData.js'
import { departments, citiesByDepartment, vehicleStatuses } from '../src/data/catalogs.js'
import { demoKey, sessionKey } from '../src/data/demoStorage.js'

assert.equal(departments.length, 33, 'Se esperan 32 departamentos y Bogotá D.C.')
assert.equal(new Set(departments).size, 33, 'Departamentos sin duplicados')
assert.equal(citiesByDepartment.HUILA.length, 37, 'Huila debe sugerir sus 37 municipios')
for (const department of departments) assert.ok(citiesByDepartment[department]?.length, `Sin sugerencias: ${department}`)
assert.deepEqual(vehicleStatuses, ['Disponible','Ingresando','No disponible','Vendido','Separado'])
assert.ok(demoUsers.some(u => u.role === 'admin'))
assert.ok(demoUsers.some(u => u.role === 'asesor'))
assert.ok(demoUsers.every(u => u.email && u.password))
assert.equal(new Set(demoVehicles.map(v => v.plate)).size, demoVehicles.length)
for (const vehicle of demoVehicles) {
  assert.ok(departments.includes(vehicle.department), `Departamento inválido: ${vehicle.plate}`)
  assert.ok(vehicleStatuses.includes(vehicle.status), `Estado inválido: ${vehicle.plate}`)
}
for (const movement of demoMovements) {
  const vehicle = demoVehicles.find(v => v.id === movement.vehicleId)
  const user = demoUsers.find(u => u.id === movement.userId)
  assert.ok(vehicle, `Movimiento sin vehículo: ${movement.id}`)
  assert.ok(user, `Movimiento sin usuario: ${movement.id}`)
  assert.equal(movement.plate, vehicle.plate, `Placa distinta en movimiento ${movement.id}`)
  assert.equal(movement.vehicle, vehicle.title, `Título distinto en movimiento ${movement.id}`)
  assert.ok(movement.value > 0)
}
assert.ok(demoKey('vehicles').startsWith('v3_'))
assert.ok(sessionKey.startsWith('v3_'))
console.log('OK: departamentos, Huila (37), estados, usuarios, vehículos, movimientos y claves de almacenamiento.')
