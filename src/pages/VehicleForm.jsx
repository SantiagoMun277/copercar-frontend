import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import { useAuth } from '../context/AuthContext'
import PageTitle from '../components/PageTitle'
import SearchableSelect from '../components/SearchableSelect'
import ThousandsInput from '../components/ThousandsInput'
import { backendMode, apiRequest } from '../services/api'
import { establecerCatalogoReal } from '../services/backendCatalogs'
import { cargarCatalogoVehiculos } from '../services/catalogoVehiculos'
import { optimizarFotoParaSubida } from '../utils/photoOptimization'
import { miniaturaVehiculo } from '../utils/photoUrl'
import { validateVehicle, messageForErrors, serverErrors, shouldShowServerError } from '../utils/formValidation'
import { obtenerFechasVentaActivas, fechaIngresoParaMostrar, fechaVentaParaMostrar } from '../utils/fechasInventario'
import { estaVendido, estaDisponible, ventasActivas, validarCambioEstado } from '../utils/reglasVentaFrontend'

const empty = { cityId:null, title:'',status:'Disponible',brand:'',line:'',color:'',year:new Date().getFullYear(),plate:'',mileage:'',price:'',owners:1,engine:'',fuel:'',transmission:'',department:'',city:'',photos:[],soatNumber:'',soatExpiry:'',rtmNumber:'',rtmExpiry:'' }
import { brands, linesByBrand, citiesByDepartment, departments } from '../data/catalogs'

const fuels=['Gasolina','Diésel','Híbrida','Eléctrico']
const transmissions=['Automática','Mecánica']

export default function VehicleForm() {
  const { id } = useParams(); const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { vehicles, movements, addVehicle, updateVehicle, loadingVehicles, loadingMovements, movementError, removeVehiclePhotoLocal } = useAppData()
  const existing = useMemo(()=>vehicles.find(v=>v.id===Number(id)),[vehicles,id])
  const fechasVentaPorVehiculo = useMemo(() => obtenerFechasVentaActivas(movements), [movements])
  const [form,setForm]=useState(existing ? {...existing} : empty)
  useEffect(() => { if (existing) setForm({...existing}) }, [existing?.id])
  const [error,setError]=useState('')
  const [fieldErrors,setFieldErrors]=useState({})
  const [saving,setSaving]=useState(false)
  const [removingPhoto,setRemovingPhoto]=useState(null)
  const [preparingPhotos,setPreparingPhotos]=useState(false)
  const [catalogo,setCatalogo]=useState(null)
  const [catalogError,setCatalogError]=useState('')
  useEffect(() => {
    if (!backendMode) return
    let alive = true
    cargarCatalogoVehiculos()
      .then(data => {establecerCatalogoReal(data); if (alive) {setCatalogo(data);setCatalogError('')} })
      .catch(() => { if (alive) setCatalogError('No se pudieron cargar las opciones. Actualiza la página e inténtalo nuevamente.') })
    return () => {alive = false}
  }, [])
  const editing=!!existing
  // Los asesores no pueden consultar compras ni ventas: no se usan datos financieros
  // incompletos para bloquear sus ediciones normales del inventario.
  const avisoEstado = editing && String(form.status).trim().toLowerCase() !== String(existing.status).trim().toLowerCase()
    && (!backendMode || (currentUser?.role === 'admin' && !loadingMovements && !movementError))
    ? validarCambioEstado({anterior:existing,siguiente:form,movimientos}) : null
  // Mantener estables las opciones; no rehacer 1104 ciudades al escribir cada campo.
  const brandOptions = useMemo(() => catalogo?.marcas?.slice().sort((a,b)=>a.name.localeCompare(b.name,'es')) || [], [catalogo])
  const selectedBrand = brandOptions.find(m=>m.name === form.brand)
  const lineOptions = useMemo(() => catalogo?.lineas?.filter(l=>Number(l.brandId)===Number(selectedBrand?.id)).sort((a,b)=>a.name.localeCompare(b.name,'es')) || [], [catalogo,selectedBrand?.id])
  const cityCatalog = catalogo?.ciudades || []
  const cityOptions = useMemo(() => (catalogo?.ciudades || []).map(row=>({value:String(row.id),label:`${row.city} — ${row.department}`})), [catalogo])
  const matchingCity = cityCatalog.find(row => Number(row.id) === Number(form.cityId))
  const selectCity = id => {
    const row = cityCatalog.find(entry => Number(entry.id) === Number(id))
    if (row) setForm(current=>({...current,cityId:Number(row.id),city:row.city,department:row.department}))
  }
  const clearError = key => setFieldErrors(prev => {if (!prev[key]) return prev; const next={...prev}; delete next[key]; return next})
  const change=(key,val)=>{setForm(f=>({...f,[key]:val}));clearError(key)}
  const markErrors = errors => {
    setFieldErrors(errors)
    setError(messageForErrors(errors))
    requestAnimationFrame(() => document.querySelector('.field[data-invalid="true"] input, .field[data-invalid="true"] select, .field[data-invalid="true"] textarea')?.focus({preventScroll:false}))
  }
  const submit=async e=>{
    e.preventDefault();if (preparingPhotos) return;setError('');setFieldErrors({})
    const errors = validateVehicle(form, vehicles)
    if (backendMode && !catalogo) errors.brand = catalogError || 'No se pudieron cargar las opciones. Inténtalo de nuevo.'
    if (backendMode && catalogo && !matchingCity) errors.city = 'Selecciona un municipio válido.'
    if (backendMode && catalogo && !lineOptions.some(l=>l.name === form.line)) errors.line = 'Selecciona una línea existente para la marca elegida.'
    if (Object.keys(errors).length) {markErrors(errors);return}
    const payload = {...form,plate:form.plate.trim().toUpperCase(),price:Number(form.price),mileage:Number(form.mileage),owners:Number(form.owners)}
    const cambio = editing && String(existing.status).toLowerCase() !== String(payload.status).toLowerCase()
    if (cambio && estaVendido(existing) && estaDisponible(payload)) {
      const ventas = ventasActivas(movements, existing.id)
      const mensaje = ventas.length
        ? `¿Confirmas que este vehículo vuelve a Disponible? Se anularán ${ventas.length} venta(s) activa(s) y dejarán de contabilizarse en los reportes.`
        : '¿Confirmas que este vehículo vuelve a Disponible? Se verificará en el servidor si existen ventas que deban anularse.'
      if (!window.confirm(mensaje)) return
    }
    setSaving(true)
    try {
      if (editing) await updateVehicle(payload)
      else await addVehicle(payload)
      navigate('/vehiculos')
    } catch (e) {
      const mapped=serverErrors(e)
      if (Object.keys(mapped).length) {markErrors(mapped)}
      else setError(shouldShowServerError(e,mapped))
    } finally {setSaving(false)}
  }
  const removePhoto=async (p,i)=>{
    if (saving || removingPhoto !== null) return
    if (backendMode && editing && typeof p === 'string' && !p.startsWith('data:')) {
      const record=existing?.photoRecords?.find(x=>x.url===p)
      if(!record?.id){setError('No se pudo identificar la fotografía seleccionada. Actualiza la página e inténtalo nuevamente.');return}
      if(!window.confirm('¿Eliminar esta fotografía del vehículo?'))return
      setRemovingPhoto(record.id)
      setError('')
      // Solo se retira visualmente tras confirmar la eliminación en el servidor.
      try {
        await apiRequest(`/vehiculos/eliminar_foto/${record.id}`,{method:'DELETE'})
      } catch (e) {
        setError(e?.status === 404
          ? 'Esta fotografía no se encontró en el servidor. Actualiza la página y verifica si ya fue eliminada.'
          : 'No fue posible eliminar la fotografía. Inténtalo nuevamente.')
        setRemovingPhoto(null)
        return
      }
      // El servidor confirmó la eliminación. Evitar una nueva descarga de todo el inventario.
      removeVehiclePhotoLocal(existing.id, record.id, p)
      setForm(current=>({...current,photos:(current.photos||[]).filter(url=>url!==p)}))
      setError('')
      setRemovingPhoto(null)
      return
    }
    change('photos',form.photos.filter((_,j)=>j!==i))
  }
  const onFiles=async e=>{
    const input = e.currentTarget
    const files = [...(input.files || [])].slice(0,8)
    if (!files.length || preparingPhotos || saving) return
    setPreparingPhotos(true)
    setError('')
    try {
      const data = []
      // Una foto a la vez evita picos de memoria al procesar varias fotos grandes.
      for (const file of files) data.push(await optimizarFotoParaSubida(file))
      setForm(current => ({...current, photos:[...(current.photos || []), ...data]}))
      clearError('photos')
    } catch {
      setError('No se pudieron preparar las fotografías. Comprueba el formato de los archivos e inténtalo nuevamente.')
    } finally {
      input.value = ''
      setPreparingPhotos(false)
    }
  }
  if(id && !existing && loadingVehicles) return null
  if(id && !existing) return <section className="page-section"><h2>Vehículo no encontrado</h2><button className="btn btn-orange" onClick={()=>navigate('/vehiculos')}>Volver al inventario</button></section>
  return (
    <section className="page-section form-page">
      <PageTitle>{editing?'Editar vehículo':'Agregar vehículo'}</PageTitle>
      <form onSubmit={submit}>
        <div className="vehicle-form-grid">
          <label className="field" data-field-key="title" data-invalid={Boolean(fieldErrors.title)}><span>Nombre o título*</span><input value={form.title} onChange={e=>change('title',e.target.value)}/>{fieldErrors.title && <small className="field-validation-message">{fieldErrors.title}</small>}</label>
          <label className="field" data-field-key="status" data-invalid={Boolean(fieldErrors.status)}><span>Estado*</span><select value={form.status} onChange={e=>change('status',e.target.value)}><option>Disponible</option><option>Ingresando</option><option>No disponible</option><option>Vendido</option><option>Separado</option></select>{fieldErrors.status && <small className="field-validation-message">{fieldErrors.status}</small>}</label>
          <label className="field" data-field-key="brand" data-invalid={Boolean(fieldErrors.brand)}><span>Marca*</span><select value={form.brand} onChange={e=>{setForm(f=>({...f,brand:e.target.value,line:''}));clearError('brand');clearError('line')}}><option value="">Marca</option>{(backendMode ? brandOptions.map(x=>x.name) : brands).map(x=><option key={x}>{x}</option>)}</select>{fieldErrors.brand && <small className="field-validation-message">{fieldErrors.brand}</small>}</label>
          <label className="field" data-field-key="line" data-invalid={Boolean(fieldErrors.line)}><span>Línea*</span>{backendMode ? <select value={form.line} disabled={!catalogo || !form.brand} onChange={e=>change('line',e.target.value)}><option value="">{!catalogo ? 'No hay líneas disponibles' : !form.brand ? 'Selecciona una marca primero' : lineOptions.length ? 'Selecciona una línea' : 'Esta marca no tiene líneas registradas'}</option>{lineOptions.map(x=><option key={x.id} value={x.name}>{x.name}</option>)}</select> : <><input list="vehicle-lines" value={form.line} onChange={e=>change('line',e.target.value)}/><datalist id="vehicle-lines">{(linesByBrand[form.brand]||[]).map(x=><option key={x} value={x}/>)}</datalist></>}{fieldErrors.line && <small className="field-validation-message">{fieldErrors.line}</small>}</label>
          <label className="field" data-field-key="color" data-invalid={Boolean(fieldErrors.color)}><span>Color*</span><input value={form.color} onChange={e=>change('color',e.target.value)}/>{fieldErrors.color && <small className="field-validation-message">{fieldErrors.color}</small>}</label>
          <label className="field" data-field-key="year" data-invalid={Boolean(fieldErrors.year)}><span>Modelo (Año)*</span><input type="number" min="1950" max="2035" value={form.year} onChange={e=>change('year',e.target.value)}/>{fieldErrors.year && <small className="field-validation-message">{fieldErrors.year}</small>}</label>
          <label className="field" data-field-key="plate" data-invalid={Boolean(fieldErrors.plate)}><span>Placa*</span><input value={form.plate} onChange={e=>change('plate',e.target.value)}/>{fieldErrors.plate && <small className="field-validation-message">{fieldErrors.plate}</small>}</label>
          <label className="field" data-field-key="mileage" data-invalid={Boolean(fieldErrors.mileage)}><span>Kilometraje*</span><ThousandsInput value={form.mileage} onChange={value=>change('mileage', value)} placeholder="Ej. 45.000"/>{fieldErrors.mileage && <small className="field-validation-message">{fieldErrors.mileage}</small>}</label>
          <label className="field" data-field-key="price" data-invalid={Boolean(fieldErrors.price)}><span>Precio*</span><ThousandsInput value={form.price} onChange={value=>change('price', value)} placeholder="Ej. 52.000.000"/>{fieldErrors.price && <small className="field-validation-message">{fieldErrors.price}</small>}</label>
          <label className="field" data-field-key="owners" data-invalid={Boolean(fieldErrors.owners)}><span>Cant. dueños*</span><input type="number" min="1" value={form.owners} onChange={e=>change('owners',e.target.value)}/>{fieldErrors.owners && <small className="field-validation-message">{fieldErrors.owners}</small>}</label>
          <label className="field" data-field-key="engine" data-invalid={Boolean(fieldErrors.engine)}><span>Cilindraje*</span><input value={form.engine} onChange={e=>change('engine',e.target.value)}/>{fieldErrors.engine && <small className="field-validation-message">{fieldErrors.engine}</small>}</label>
          <label className="field" data-field-key="fuel" data-invalid={Boolean(fieldErrors.fuel)}><span>Combustible*</span><select value={form.fuel} onChange={e=>change('fuel',e.target.value)}><option value="">Combustible</option>{fuels.map(x=><option key={x}>{x}</option>)}</select>{fieldErrors.fuel && <small className="field-validation-message">{fieldErrors.fuel}</small>}</label>
          <label className="field" data-field-key="transmission" data-invalid={Boolean(fieldErrors.transmission)}><span>Transmisión*</span><select value={form.transmission} onChange={e=>change('transmission',e.target.value)}><option value="">Transmisión</option>{transmissions.map(x=><option key={x}>{x}</option>)}</select>{fieldErrors.transmission && <small className="field-validation-message">{fieldErrors.transmission}</small>}</label>
          {!backendMode && <label className="field" data-field-key="department" data-invalid={Boolean(fieldErrors.department)}><span>Departamento de Matrícula*</span><SearchableSelect value={form.department} options={departments} onChange={department=>{setForm(f=>({...f,department,cityId:null,city:''}));clearError('department');clearError('city')}} placeholder="Buscar departamento" ariaLabel="Departamento de matrícula" />{fieldErrors.department && <small className="field-validation-message">{fieldErrors.department}</small>}</label>}
          <label className="field" data-field-key="city" data-invalid={Boolean(fieldErrors.city)}><span>Ciudad o municipio de Matrícula*</span>{backendMode ? <SearchableSelect value={matchingCity ? String(matchingCity.id) : ''} options={cityOptions} onChange={value=>{selectCity(value);clearError('city')}} placeholder={catalogo ? 'Buscar municipio o departamento' : 'No hay municipios disponibles'} ariaLabel="Ciudad o municipio de matrícula" disabled={!catalogo}/> : <SearchableSelect value={form.city} options={citiesByDepartment[form.department]||[]} onChange={city=>{setForm(f=>({...f,city,cityId:null}));clearError('city')}} placeholder="Buscar o escribir municipio" ariaLabel="Ciudad o municipio de matrícula" allowCustom />}<small className="field-hint">{backendMode ? 'Selecciona solo la ciudad. El departamento se selecciona automáticamente.' : 'Selecciona una ciudad.'}</small>{fieldErrors.city && <small className="field-validation-message">{fieldErrors.city}</small>}</label>

        </div>
        {editing && <section className="vehicle-dates-edit" aria-label="Información de fechas del vehículo">
          <div className="vehicle-dates-edit-title">Información del registro <span>(solo consulta)</span></div>
          <div className="vehicle-dates-edit-items">
            <div className="vehicle-dates-edit-item">
              <span className="vehicle-dates-edit-label">Ingreso al inventario</span>
              <span className="vehicle-dates-edit-value">{fechaIngresoParaMostrar(existing)}</span>
            </div>
            <div className="vehicle-dates-edit-item">
              <span className="vehicle-dates-edit-label">Venta del vehículo</span>
              <span className="vehicle-dates-edit-value">{fechaVentaParaMostrar(existing, fechasVentaPorVehiculo, {consultando: loadingMovements})}</span>
            </div>
          </div>
        </section>}
        <div className="photo-section"><label className="btn btn-orange upload-label">+Agregar foto<input type="file" accept="image/*" multiple disabled={preparingPhotos || saving} onChange={onFiles}/></label>{preparingPhotos && <small className="field-hint" role="status">Preparando fotografías...</small>}<div className="photo-grid">{(form.photos||[]).map((p,i)=><div className="photo-item" key={i}><img src={miniaturaVehiculo(p, 960)} alt={`Fotografía ${i + 1}`} loading="lazy" decoding="async" onError={e=>{if(e.currentTarget.getAttribute('src') !== p)e.currentTarget.src=p}}/><button type="button" disabled={saving || removingPhoto !== null || preparingPhotos} onClick={()=>removePhoto(p,i)}>×</button></div>)}</div></div>
        <div className="doc-section"><h3>SOAT</h3><div className="doc-grid"><label className="field date-field" data-field-key="soatExpiry" data-invalid={Boolean(fieldErrors.soatExpiry)} style={{gridColumn:'1 / -1'}}><span>Vigencia hasta</span><input type="date" value={form.soatExpiry} onChange={e=>change('soatExpiry',e.target.value)}/>{fieldErrors.soatExpiry && <small className="field-validation-message">{fieldErrors.soatExpiry}</small>}</label></div></div>
        <div className="doc-section"><h3>Revisión Tecnomecánica</h3><div className="doc-grid"><label className="field date-field" data-field-key="rtmExpiry" data-invalid={Boolean(fieldErrors.rtmExpiry)} style={{gridColumn:'1 / -1'}}><span>Vigencia hasta</span><input type="date" value={form.rtmExpiry} onChange={e=>change('rtmExpiry',e.target.value)}/>{fieldErrors.rtmExpiry && <small className="field-validation-message">{fieldErrors.rtmExpiry}</small>}</label></div></div>
        {avisoEstado && <div className="form-error form-wide" role="status">{avisoEstado}</div>}
        {catalogError && backendMode && <div className="form-error form-wide" role="alert">{catalogError}</div>}{error&&<div className="form-error form-wide" role="alert">{error}</div>}
        <div className="form-actions"><button className="btn btn-orange" disabled={saving || removingPhoto !== null || preparingPhotos}>Guardar</button><button className="btn btn-orange secondary-orange" type="button" onClick={()=>navigate('/vehiculos')}>Cancelar</button></div>
      </form>
    </section>
  )
}
