// Identificadores verificados contra COPERCAR.sql, version de prueba copercar_pruebas_v7.
// No hay endpoints GET de catalogos en la version actual de FastAPI.
// Si cambian las tablas de catalogos, pedir endpoints a backend y actualizar este mapa.
export const normalizarCatalogo = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ')

export const estadoBackendIds = { disponible:1, ingresando:2, separado:3, vendido:4, 'no disponible':5 }
const estados = estadoBackendIds
const combustibles = { diesel:2, electrico:3, gasolina:4, hibrida:1, hibrido:1 }
const transmisiones = { automatica:2, mecanica:1, manual:1 }
const ciudades = [
  { id:1, name:'Cali', dept:'VALLE DEL CAUCA' },
  { id:2, name:'Palmira', dept:'VALLE DEL CAUCA' },
  { id:3, name:'Tulua', dept:'VALLE DEL CAUCA' },
  { id:4, name:'Florencia', dept:'CAQUETÁ' },
]
const lineas = [
  {id:1,brand:'Mazda',name:'Mazda CX-30 Grand Touring LX'},
  {id:2,brand:'Mazda',name:'Mazda 2 Touring'},
  {id:3,brand:'Mazda',name:'Mazda 3 Sport'},
  {id:4,brand:'Toyota',name:'Corolla'},
  {id:5,brand:'Toyota',name:'Hilux'},
  {id:6,brand:'Renault',name:'Duster'},
  {id:7,brand:'Chevrolet',name:'Onix'},
  {id:8,brand:'Kia',name:'Picanto'},
  {id:9,brand:'Hyundai',name:'Tucson'},
  {id:10,brand:'BMW',name:'X1'},
]
const byNormalized = (record, value) => normalizarCatalogo(record) === normalizarCatalogo(value)
const required = (value, label) => { if (!value) throw new Error(label); return value }

export function fromBackendVehicle(v) {
  // VehiculoResponse incluye id_linea, pero LineaResponse no incluye marca anidada.
  const lineaCatalogo = catalogoReal?.lineas?.find(l => Number(l.id) === Number(v.id_linea))
  const marcaCatalogo = catalogoReal?.marcas?.find(m => Number(m.id) === Number(lineaCatalogo?.brandId))
  const brand = v.linea?.marca?.nombre || marcaCatalogo?.name || ''
  const department = normalizarCatalogo(v.ciudad?.departamento?.nombre) === 'caqueta' ? 'CAQUETÁ' : (v.ciudad?.departamento?.nombre?.toUpperCase() || '')
  return {
    id: v.id_vehiculo, title: v.titulo || '', status:v.estado?.nombre || '',
    brand, line:v.linea?.nombre || '', color:v.color || '',
    year:v.modelo, plate:v.placa, mileage:v.kilometraje,
    price:Number(v.precio), owners:v.cantidad_duenos, engine:v.cilindraje == null ? '' : String(v.cilindraje),
    fuel:({ Diesel:'Diésel', Electrico:'Eléctrico', Hibrido:'Híbrida', Gasolina:'Gasolina' })[v.combustible?.nombre] || v.combustible?.nombre || '',
    transmission:v.transmision?.nombre === 'Manual' ? 'Mecánica' : (v.transmision?.nombre === 'Automatica' ? 'Automática' : v.transmision?.nombre || ''),
    department, city:v.ciudad?.nombre || '', cityId:v.id_ciudad,
    photoRecords:(v.fotos||[]).map(f=>({id:f.id_foto,url:f.ruta,principal:Boolean(f.es_principal)})),
    photos:[...(v.fotos||[])].sort((a,b)=>Number(b.es_principal)-Number(a.es_principal) || a.orden-b.orden).map(f=>f.ruta),
    soatNumber:'', soatExpiry:v.fecha_vencimiento_soat || '',
    rtmNumber:'', rtmExpiry:v.fecha_vencimiento_rtm || '',
  }
}

// Catálogo exportado de MySQL (solo SELECT): nunca inventa IDs.
// Al incorporar endpoints GET de catálogo, esta fuente se sustituye sin cambiar el formulario.
let catalogoReal = null
export function establecerCatalogoReal(datos) {
  if (!datos || !Array.isArray(datos.marcas) || !Array.isArray(datos.lineas) ||
      !Array.isArray(datos.ciudades) || datos.ciudades.length < 1000) {
    throw new Error('No se pudieron cargar las opciones disponibles.')
  }
  catalogoReal = datos
}
export const obtenerCatalogoReal = () => catalogoReal

export function toBackendVehicle(form, original = null) {
  if (form.soatNumber?.trim() || form.rtmNumber?.trim()) {
    throw new Error('Por ahora no es posible guardar los números de SOAT o RTM. Déjalos vacíos para continuar.')
  }
  if (!catalogoReal) throw new Error('No se pudieron cargar las opciones del formulario. Inténtalo nuevamente.')
  const marca = catalogoReal.marcas.find(m => normalizarCatalogo(m.name) === normalizarCatalogo(form.brand))
  const line = marca && catalogoReal.lineas.find(l => Number(l.brandId) === Number(marca.id) && normalizarCatalogo(l.name) === normalizarCatalogo(form.line))
  required(line, 'Selecciona una línea válida para la marca elegida.')
  const city = catalogoReal.ciudades.find(c => Number(c.id) === Number(form.cityId))
  required(city, 'Selecciona una ciudad válida.')
  const findCatalogId = (items, value, label, aliases = {}) => {
    const normalized = normalizarCatalogo(value)
    const target = aliases[normalized] || normalized
    const found = items.find(item => normalizarCatalogo(item.name) === target)
    return required(found?.id, `${label} no reconocido. Selecciona una opción válida.`)
  }
  const idEstado = findCatalogId(catalogoReal.estados, form.status, 'Estado')
  const idCombustible = findCatalogId(catalogoReal.combustibles, form.fuel, 'Combustible', {
    'hibrida':'hibrido', 'diesel':'diesel', 'electrico':'electrico'
  })
  const idTransmision = findCatalogId(catalogoReal.transmisiones, form.transmission, 'Transmisión', {
    'mecanica':'manual', 'automatica':'automatica'
  })
  const chosenCityId = Number(city.id)
  const engine = String(form.engine||'').replace(',','.').trim()
  const engineValue = Number(engine)
  if (!Number.isFinite(engineValue) || engineValue < 0 || !engine || (engineValue <= 10 && engineValue !== 0 && !Number.isInteger(engineValue*1000))) {
    throw new Error('Cilindraje inválido: ingrese por ejemplo 1.8 o 1800.')
  }
  const cilindraje = engineValue <= 10 ? Math.round(engineValue*1000) : engineValue
  if (!Number.isInteger(cilindraje)) throw new Error('Cilindraje debe expresarse en centímetros cúbicos enteros.')
  return {
    id_linea:line.id, id_estado:idEstado, id_ciudad:chosenCityId,
    titulo:form.title.trim(), placa:form.plate.trim().toUpperCase(),
    color:form.color.trim(), modelo:Number(form.year), kilometraje:Number(form.mileage),
    precio:Number(form.price), cantidad_duenos:Number(form.owners), cilindraje,
    id_combustible:idCombustible,id_transmision:idTransmision,
    fecha_vencimiento_soat:form.soatExpiry || null,
    fecha_vencimiento_rtm:form.rtmExpiry || null,
  }
}
