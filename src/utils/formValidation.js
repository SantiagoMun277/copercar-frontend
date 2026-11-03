// Validaciones de interfaz acordes con los formularios de COPERCAR y los límites
// documentados en los esquemas Pydantic. No agrega nuevos requisitos de negocio.
export const FIELD_LABELS = {
  title:'Nombre o título', status:'Estado',brand:'Marca',line:'Línea',color:'Color',year:'Modelo (año)',
  plate:'Placa',mileage:'Kilometraje',price:'Precio',owners:'Cantidad de dueños',engine:'Cilindraje',
  fuel:'Combustible',transmission:'Transmisión',department:'Departamento de matrícula',city:'Ciudad o municipio',
  soatExpiry:'Vigencia del SOAT',rtmExpiry:'Vigencia de la tecnomecánica',photos:'Fotografías',
  documentType:'Tipo de documento',documentNumber:'Número de documento',firstName:'Primer nombre',
  secondName:'Segundo nombre',lastName:'Primer apellido',secondLastName:'Segundo apellido',email:'Correo electrónico',
  phone:'Número de celular',birthDate:'Fecha de nacimiento',gender:'Género',password:'Contraseña',address:'Dirección',
  vehicleId:'Vehículo',type:'Tipo de movimiento',date:'Fecha del movimiento',value:'Valor de la operación',
  observation:'Observación',
}
const filled = x => String(x ?? '').trim().length > 0
const isRealDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === value
}
const number = x => Number(String(x ?? '').trim())
const integer = x => filled(x) && Number.isSafeInteger(number(x))
// Se admiten letras Unicode (incluidas tildes y ñ) y espacios en nombres compuestos.
const textoNombre = x => /^[\p{L}]+(?:\s+[\p{L}]+)*$/u.test(String(x ?? '').trim())
export const messageForErrors = errors => {
  const names = Object.keys(errors).map(k => FIELD_LABELS[k] || k)
  return names.length ? `Corrige ${names.length === 1 ? 'el campo marcado' : 'los campos marcados'} en rojo: ${names.join(', ')}.` : ''
}
export const validateVehicle = (f, vehicles = []) => {
  const e = {}
  const req = (key, msg = 'Este campo es obligatorio.') => {if (!filled(f[key])) e[key] = msg}
  for (const k of ['title','status','brand','line','color','plate','fuel','transmission','city']) req(k, k === 'transmission' ? 'Selecciona un tipo de transmisión.' : k === 'fuel' ? 'Selecciona un tipo de combustible.' : undefined)
  if (!e.title && f.title.trim().length > 160) e.title='El título no puede superar 160 caracteres.'
  if (!e.color && f.color.trim().length > 30) e.color='El color no puede superar 30 caracteres.'
  if (!e.line && f.line.trim().length > 50) e.line='La línea no puede superar 50 caracteres.'
  if (!e.plate && !/^[A-Z]{3}\d{3}$/i.test(f.plate.trim())) e.plate='Escribe tres letras y tres números, por ejemplo ABC123.'
  if (!e.plate && vehicles.some(v => String(v.plate||'').toUpperCase() === f.plate.trim().toUpperCase() && Number(v.id) !== Number(f.id))) e.plate='Esta placa ya corresponde a otro vehículo del inventario. Edita ese registro en lugar de crear uno nuevo.'
  if (!integer(f.year) || number(f.year) < 1950 || number(f.year) > new Date().getFullYear()+1) e.year=`Selecciona un año entre 1950 y ${new Date().getFullYear()+1}.`
  if (!integer(f.mileage) || number(f.mileage) < 0) e.mileage='Introduce un kilometraje entero igual o superior a cero.'
  if (!filled(f.price) || !Number.isFinite(number(f.price)) || number(f.price) <= 0) e.price='Introduce un precio numérico mayor que cero.'
  if (!integer(f.owners) || number(f.owners) < 1) e.owners='Introduce un número entero de dueños igual o superior a uno.'
  const engine = String(f.engine ?? '').trim().replace(',','.')
  if (!engine || !Number.isFinite(Number(engine)) || Number(engine) < 0 || (Number(engine)>10 && !Number.isInteger(Number(engine)))) e.engine='Introduce el cilindraje como 1800 o 1.8; debe ser un número válido.'
  if (filled(f.soatExpiry) && !isRealDate(f.soatExpiry)) e.soatExpiry='Selecciona una fecha válida de vencimiento del SOAT.'
  if (filled(f.rtmExpiry) && !isRealDate(f.rtmExpiry)) e.rtmExpiry='Selecciona una fecha válida de vencimiento de la tecnomecánica.'
  return e
}
export const validateUser = (f, editing = false, users = []) => {
  const e = {}
  for (const k of ['documentType','documentNumber','firstName','lastName','email','phone','birthDate','gender','address']) {
    if (!filled(f[k])) e[k]='Este campo es obligatorio.'
  }
  if (!editing && !filled(f.password)) e.password='Escribe una contraseña para el nuevo asesor.'
  if (filled(f.password) && f.password.length < 6) e.password='La contraseña debe contener al menos 6 caracteres.'
  for (const [k,max] of Object.entries({ documentNumber:20,firstName:50,secondName:50,lastName:50,secondLastName:50,phone:20,address:150 })) {
    if (filled(f[k]) && String(f[k]).length > max) e[k]=`Este campo admite un máximo de ${max} caracteres.`
  }
  for (const key of ['documentNumber','phone']) {
    if (filled(f[key]) && !/^[0-9]+$/.test(String(f[key]).trim())) e[key]='Este campo solo admite números.'
  }
  for (const key of ['firstName','secondName','lastName','secondLastName']) {
    if (filled(f[key]) && !textoNombre(f[key])) e[key]='Este campo solo admite letras y espacios.'
  }
  if (filled(f.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email='Escribe un correo válido, por ejemplo asesor@correo.com.'
  if (filled(f.birthDate) && (!isRealDate(f.birthDate) || f.birthDate > new Date().toISOString().slice(0,10))) e.birthDate='Selecciona una fecha de nacimiento válida, que no sea futura.'
  if (!e.email && filled(f.email) && users.some(u=>String(u.email||'').trim().toLowerCase() === f.email.trim().toLowerCase() && Number(u.id)!==Number(f.id))) e.email='Ya existe otro usuario con este correo.'
  if (!e.documentNumber && filled(f.documentNumber) && users.some(u=>String(u.documentNumber||'').trim() === f.documentNumber.trim() && Number(u.id)!==Number(f.id))) e.documentNumber='Ya existe otro usuario con este número de documento.'
  return e
}
export const validateMovement = (f, vehicles = [], editing = false, previous = null, backendMode = false) => {
  const e = {}
  if (!filled(f.vehicleId)) e.vehicleId='Selecciona un vehículo registrado.'
  else if (!vehicles.some(v=>Number(v.id)===Number(f.vehicleId))) e.vehicleId='El vehículo elegido no está disponible en el inventario activo.'
  if (backendMode && editing && Number(f.vehicleId)!==Number(previous?.vehicleId)) e.vehicleId='No es posible cambiar el vehículo de un movimiento ya registrado.'
  if (!filled(f.type) || !['Compra','Venta','Impuesto','Mantenimiento','Reparación','Seguro','RTM','Otro gasto','Otro ingreso'].includes(f.type)) e.type='Selecciona un tipo de movimiento válido.'
  if (!filled(f.date) || !isRealDate(f.date)) e.date='Selecciona una fecha válida para el movimiento.'
  if (!filled(f.value) || !Number.isFinite(number(f.value)) || number(f.value)<=0) e.value='Introduce un valor de operación mayor que cero.'
  else if (!/^\d+(?:\.\d{1,2})?$/.test(String(f.value).trim())) e.value='Introduce un valor válido con máximo dos decimales.'
  if (filled(f.observation) && f.observation.length > 1000) e.observation='La observación no puede superar 1.000 caracteres.'
  return e
}
export const validateProfile = f => {
  const e = {}
  for (const k of ['documentType','documentNumber','firstName','lastName','phone','address']) if (!filled(f[k])) e[k]='Este campo es obligatorio.'
  for (const [k,max] of Object.entries({documentNumber:20,firstName:50,secondName:50,lastName:50,secondLastName:50,phone:20,address:150})) if (filled(f[k]) && String(f[k]).length>max) e[k]=`Máximo ${max} caracteres.`
  if (filled(f.birthDate) && (!isRealDate(f.birthDate) || f.birthDate > new Date().toISOString().slice(0,10))) e.birthDate='Selecciona una fecha de nacimiento válida, que no sea futura.'
  return e
}

export const readableBackendValidation = (kind, ctx={}) => {
  const limit = ctx?.max_length
  if (kind === 'missing') return 'Este campo es obligatorio.'
  if (kind?.includes('date')) return 'Introduce una fecha válida (día, mes y año).'
  if (kind?.includes('int')) return 'Introduce un número entero válido.'
  if (kind?.includes('decimal') || kind?.includes('float')) return 'Introduce un número válido.'
  if (kind === 'string_too_long') return limit ? `Máximo ${limit} caracteres.` : 'El texto supera el máximo permitido.'
  if (kind === 'string_too_short') return 'El texto es demasiado corto para este campo.'
  if (kind?.includes('greater_than')) return 'El valor está fuera del rango permitido.'
  return 'El servidor rechazó el valor de este campo. Revísalo e inténtalo de nuevo.'
}
export function serverErrors(error) {
  const errors = {...(error?.fieldErrors || {})}
  const message = String(error?.message || '')
  const matchers = [
    [/l[ií]nea.*marca|marca.*l[ií]nea/i,'line'], [/ciudad.*cat[aá]logo|municipio.*cat[aá]logo/i,'city'],
    [/cilindraje/i,'engine'], [/placa.*(existe|registrad|duplicad)/i,'plate'],
    [/transmisi[oó]n/i,'transmission'], [/combustible/i,'fuel'], [/estado.*reconocido/i,'status'],
    [/contrase[nñ]a/i,'password'], [/correo/i,'email'], [/n[uú]mero de documento/i,'documentNumber'],
  ]
  for (const [test,key] of matchers) if (test.test(message) && !errors[key]) {errors[key] = message;break}
  return errors
}
export const shouldShowServerError = (error, mapped) => {
  // Mantiene un error general visible cuando la API no identifica un campo concreto.
  if (error?.status === 401) return 'Tu sesión no es válida o ha caducado. Vuelve a iniciar sesión.'
  if (error?.status === 403) return 'Tu cuenta no tiene permiso para realizar esta operación. No se guardaron los cambios.'
  if (error?.status === 404) return 'El registro ya no está disponible en el servidor. Actualiza el listado.'
  if (error?.status >= 500) return 'No fue posible completar la operación. Los cambios no se guardaron. Inténtalo nuevamente.'
  if (Object.keys(mapped).length) return messageForErrors(mapped)
  if (/\b(?:backend|endpoint|fastapi|mysql|cloudinary|api|localhost|traceback|sql)\b/i.test(String(error?.message||''))) return 'No fue posible completar la operación. Inténtalo nuevamente.'
  return error?.message || 'No fue posible completar la operación.'
}
