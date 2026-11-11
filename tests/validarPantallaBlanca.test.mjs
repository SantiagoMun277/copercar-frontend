import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const files = [
  ['src/pages/MovementForm.jsx', 1],
  ['src/pages/VehicleForm.jsx', 1],
  ['src/context/AppDataContext.jsx', 5],
]
for (const [ruta, esperados] of files) {
  test(`No hay variable movimientos sin definir en ${ruta}`, () => {
    const codigo = readFileSync(new URL('../'+ruta, import.meta.url), 'utf8')
    // En los tres componentes, la variable del contexto se llama "movements".
    assert.match(codigo, /\bmovements\b/)
    const aplicaciones=(codigo.match(/\bmovimientos\s*:\s*movements\b/g)||[]).length
    assert.equal(aplicaciones, esperados)
    // El error original era usar "movimientos" como variable de un objeto abreviado.
    assert.doesNotMatch(codigo,/[,\{]\s*movimientos\s*[,\}]/)
  })
}
