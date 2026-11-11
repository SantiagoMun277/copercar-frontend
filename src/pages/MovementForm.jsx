import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import { useAuth } from '../context/AuthContext'
import PageTitle from '../components/PageTitle'
import SearchableSelect from '../components/SearchableSelect'
import ThousandsInput from '../components/ThousandsInput'
import { MOVEMENT_TYPES } from '../services/backend'
import { backendMode } from '../services/api'
import {validateMovement,messageForErrors,serverErrors,shouldShowServerError} from '../utils/formValidation'
import { validarMovimiento } from '../utils/reglasVentaFrontend'

export default function MovementForm(){
 const {id}=useParams(); const navigate=useNavigate(); const {currentUser}=useAuth(); const {movements,vehicles,addMovement,updateMovement,loadingMovements,movementError}=useAppData();
 const existing=useMemo(()=>movements.find(m=>m.id===Number(id)),[movements,id]);
 // Ningún vehículo se selecciona implícitamente al registrar una operación.
 const [form,setForm]=useState(existing?{...existing}:{vehicleId:'',type:'Compra',date:'',value:'',observation:''}); const [error,setError]=useState(''); const [saving,setSaving]=useState(false); const editing=!!existing;
 useEffect(()=>{if(existing)setForm({...existing})},[existing?.id])
 const [fieldErrors,setFieldErrors]=useState({});
 const change=(k,v)=>{setForm(f=>({...f,[k]:v}));setFieldErrors(prev=>{if(!prev[k])return prev;const next={...prev};delete next[k];return next})};
 const markErrors = errors => {setFieldErrors(errors);setError(messageForErrors(errors));requestAnimationFrame(()=>document.querySelector('.movement-form .field[data-invalid="true"] input, .movement-form .field[data-invalid="true"] select')?.focus())};
 const avisoReglas = form.vehicleId && (!backendMode || (!loadingMovements && !movementError))
  ? validarMovimiento({ movimiento:form,vehiculos:vehicles,movimientos:movements,original:existing || null }) : null
 const submit=async e=>{
  e.preventDefault();setError('');setFieldErrors({})
  const errors=validateMovement(form,vehicles,editing,existing,backendMode)
  if(Object.keys(errors).length){markErrors(errors);return}
  if (backendMode && movementError) { setError('No se pudieron consultar los movimientos. Actualiza la página antes de registrar operaciones.'); return }
  // En modo API, la validación definitiva vuelve a consultar el servidor al guardar.
  // No bloquear con una copia posiblemente desactualizada del listado.
  if (avisoReglas && !backendMode) {setError(avisoReglas);return}
  const v=vehicles.find(x=>x.id===Number(form.vehicleId))
  const payload={...form,vehicleId:Number(form.vehicleId),value:Number(form.value),vehicle:v.title||existing?.vehicle,plate:v.plate||existing?.plate,user:editing?existing.user:`${currentUser.firstName} ${currentUser.lastName}`,userId:editing?existing.userId:currentUser.id}
  setSaving(true)
  try {if(editing)await updateMovement({...existing,...payload});else await addMovement(payload);navigate('/movimientos')}
  catch(e){const mapped=serverErrors(e);if(Object.keys(mapped).length)markErrors(mapped);else setError(shouldShowServerError(e,mapped))}
  finally{setSaving(false)}
 }

 if(id && !existing && loadingMovements) return null
 if(id && (!existing || existing.deleted)) return <section className="page-section"><h2>Movimiento no encontrado</h2><button className="btn btn-green" onClick={()=>navigate('/movimientos')}>Volver</button></section>
 return <section className="page-section form-page"><PageTitle>{editing?'Editar movimiento':'Movimientos'}</PageTitle>
  {!editing&&<div className="subtab active">Registrar movimiento</div>}
  <form className="movement-form card-outline" onSubmit={submit}><h1>{editing?'Editar movimiento':'Registrar movimiento'}</h1>
   {editing&&<div className="movement-current"><b>Vehículo:</b> {existing.vehicle}<br/><b>Placa:</b> {existing.plate}</div>}
   <div className="movement-two"><label className="field" data-field-key="vehicleId" data-invalid={Boolean(fieldErrors.vehicleId)}><span>Seleccionar vehículo *</span><SearchableSelect value={form.vehicleId} disabled={editing && backendMode} options={vehicles.map(v=>({value:String(v.id),label:`${v.plate} · ${v.title} (${v.year})`}))} onChange={value=>change('vehicleId',Number(value))} placeholder="Buscar por placa o nombre" ariaLabel="Buscar vehículo por placa o nombre" />{editing && backendMode && <small className="field-hint">El vehículo asociado no se puede cambiar al editar este movimiento.</small>}{fieldErrors.vehicleId && <small className="field-validation-message">{fieldErrors.vehicleId}</small>}</label><label className="field" data-field-key="type" data-invalid={Boolean(fieldErrors.type)}><span>Tipo de movimiento *</span><select value={form.type} onChange={e=>change('type',e.target.value)}>{MOVEMENT_TYPES.map(([label,id])=><option key={id} value={label}>{label}</option>)}</select>{fieldErrors.type && <small className="field-validation-message">{fieldErrors.type}</small>}</label></div>
   <label className="field movement-short" data-field-key="date" data-invalid={Boolean(fieldErrors.date)}><span>Fecha del movimiento</span><input type="date" value={form.date} onChange={e=>change('date',e.target.value)}/>{fieldErrors.date && <small className="field-validation-message">{fieldErrors.date}</small>}</label>
   <label className="field movement-short" data-field-key="value" data-invalid={Boolean(fieldErrors.value)}><span>Valor de la operación</span><ThousandsInput value={form.value} onChange={value=>change('value', value)} allowDecimals placeholder="Ej. 39.000.000"/>{fieldErrors.value && <small className="field-validation-message">{fieldErrors.value}</small>}</label>
   <label className="field" data-field-key="observation" data-invalid={Boolean(fieldErrors.observation)}><span>Observación</span><textarea rows="4" value={form.observation} onChange={e=>change('observation',e.target.value)} placeholder="Observación..."></textarea>{fieldErrors.observation && <small className="field-validation-message">{fieldErrors.observation}</small>}</label>
   {avisoReglas && <div className="form-error" role="status">{avisoReglas}{backendMode ? " Se volverá a comprobar al guardar." : ""}</div>}
   {error && (!avisoReglas || error !== avisoReglas) && <div className="form-error" role="alert">{error}</div>}
   <div className="form-actions right"><button className="btn btn-green" disabled={saving || (backendMode && (loadingMovements || Boolean(movementError))) || (!backendMode && Boolean(avisoReglas))}>Guardar</button><button type="button" className="btn btn-light" onClick={()=>navigate('/movimientos')}>Cancelar</button></div>
  </form>
 </section>
}
