// Exportación XLSX ligera de solo escritura para los reportes de COPERCAR.
// Se usa únicamente al exportar: sin lectura de libros externos, macros ni fórmulas.
// Implementa las funciones de XLSX utilizadas por Reports.jsx.
const textEncoder = new TextEncoder()
const XML_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const PKG_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships'

const xmlEscape = input => String(input ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;')

const excelColumn = index => {
  let label = ''
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    label = String.fromCharCode(65 + (n - 1) % 26) + label
  }
  return label
}

const toCells = value => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number' && Number.isFinite(value)) return `<v>${value}</v>`
  if (typeof value === 'boolean') return `<v>${value ? 1 : 0}</v>`
  // Siempre exportar texto como texto. Los datos que comienzan por =, + o -
  // no se convierten en fórmulas al abrir el archivo en Excel.
  return `<is><t xml:space="preserve">${xmlEscape(value)}</t></is>`
}

const worksheetXml = sheet => {
  const body = sheet.rows.map((cells, rowIndex) => {
    const xml = cells.map((value, colIndex) => {
      if (value === null || value === undefined) return ''
      const type = typeof value === 'number' && Number.isFinite(value) || typeof value === 'boolean' ? 'n' : 'inlineStr'
      const cellRef = `${excelColumn(colIndex)}${rowIndex + 1}`
      return `<c r="${cellRef}" t="${type}">${toCells(value)}</c>`
    }).join('')
    return `<row r="${rowIndex + 1}">${xml}</row>`
  }).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${XML_NS}"><sheetData>${body}</sheetData></worksheet>`
}

// ZIP estándar, sin compresión (STORE). Los XLSX generados son relativamente
// pequeños; evitar una dependencia ZIP mantiene el módulo auditable y seguro.
const crcTable = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  crcTable[i] = c >>> 0
}

function crc32(bytes) {
  let crc = 0xFFFFFFFF
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function createZip(files) {
  const pieces = []
  const directory = []
  let offset = 0
  let directorySize = 0

  for (const [filename, contents] of files) {
    const nameBytes = textEncoder.encode(filename)
    const data = textEncoder.encode(contents)
    const checksum = crc32(data)
    const header = new Uint8Array(30 + nameBytes.length)
    const view = new DataView(header.buffer)
    view.setUint32(0, 0x04034b50, true)
    view.setUint16(4, 20, true)
    view.setUint16(6, 0x0800, true) // nombres UTF-8
    view.setUint16(8, 0, true) // sin compresión
    view.setUint32(14, checksum, true)
    view.setUint32(18, data.length, true)
    view.setUint32(22, data.length, true)
    view.setUint16(26, nameBytes.length, true)
    header.set(nameBytes, 30)
    pieces.push(header, data)

    const entry = new Uint8Array(46 + nameBytes.length)
    const central = new DataView(entry.buffer)
    central.setUint32(0, 0x02014b50, true)
    central.setUint16(4, 20, true)
    central.setUint16(6, 20, true)
    central.setUint16(8, 0x0800, true)
    central.setUint16(10, 0, true)
    central.setUint32(16, checksum, true)
    central.setUint32(20, data.length, true)
    central.setUint32(24, data.length, true)
    central.setUint16(28, nameBytes.length, true)
    central.setUint32(42, offset, true)
    entry.set(nameBytes, 46)
    directory.push(entry)
    directorySize += entry.length
    offset += header.length + data.length
  }

  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, directory.length, true)
  endView.setUint16(10, directory.length, true)
  endView.setUint32(12, directorySize, true)
  endView.setUint32(16, offset, true)
  const bytes = new Uint8Array(offset + directorySize + end.length)
  let cursor = 0
  for (const piece of [...pieces, ...directory, end]) {
    bytes.set(piece, cursor)
    cursor += piece.length
  }
  return bytes
}

export const utils = {
  book_new: () => ({ sheets: [] }),
  json_to_sheet: data => {
    if (!Array.isArray(data)) throw new Error('El reporte debe contener una lista de registros.')
    const keys = [...new Set(data.flatMap(row => Object.keys(row || {})))]
    return { rows: keys.length ? [keys, ...data.map(row => keys.map(key => row?.[key] ?? ''))] : [] }
  },
  aoa_to_sheet: data => ({ rows: Array.isArray(data) ? data.map(row => Array.isArray(row) ? row : [row]) : [] }),
  book_append_sheet: (workbook, sheet, name) => {
    if (!Array.isArray(workbook?.sheets) || !Array.isArray(sheet?.rows)) throw new Error('Hoja de cálculo inválida.')
    const safeName = String(name || 'Hoja').replace(/[\\\/?*\[\]:]/g, '_').slice(0, 31)
    if (workbook.sheets.some(existing => existing.name === safeName)) throw new Error('Hay dos hojas con el mismo nombre.')
    workbook.sheets.push({ name: safeName, rows: sheet.rows })
  },
}

export function buildWorkbookBytes(workbook) {
  const sheets = workbook?.sheets
  if (!Array.isArray(sheets) || sheets.length === 0) throw new Error('No hay datos para exportar.')

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`
  const rootRelationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PKG_REL_NS}"><Relationship Id="rId1" Type="${REL_NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${XML_NS}" xmlns:r="${REL_NS}"><sheets>${sheets.map((sheet, i) => `<sheet name="${xmlEscape(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`
  const sheetRelationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PKG_REL_NS}">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL_NS}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`

  return createZip([
    ['[Content_Types].xml', contentTypes],
    ['_rels/.rels', rootRelationships],
    ['xl/workbook.xml', workbookXml],
    ['xl/_rels/workbook.xml.rels', sheetRelationships],
    ...sheets.map((sheet, i) => [`xl/worksheets/sheet${i + 1}.xml`, worksheetXml(sheet)]),
  ])
}

export function writeFile(workbook, filename) {
  const bytes = buildWorkbookBytes(workbook)
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = String(filename || 'COPERCAR_reporte.xlsx')
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
}
