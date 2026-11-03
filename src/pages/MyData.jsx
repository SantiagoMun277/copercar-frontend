import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'
import { backendMode } from '../services/api'
import { actualizarUsuarioBackend } from '../services/backend'
import {validateProfile,messageForErrors,serverErrors,shouldShowServerError} from '../utils/formValidation'

export default function MyData(){
 const {currentUser,updateSessionUser}=useAuth(); const {updateUser}=useAppData(); const [form,setForm]=useState({...currentUser}); const [saved,setSaved]=useState(false); const [error,setError]=useState('');const [fieldErrors,setFieldErrors]=useState({}); const change=(k,v)=>{setSaved(false);setForm(f=>({...f,[k]:v}));setFieldErrors(prev=>{if(!prev[k])return prev;const next={...prev};delete next[k];return next})}
 const isReadOnly = backendMode && currentUser?.role === 'asesor'
 const submit=async e=>{
  if (isReadOnly) return
  e.preventDefault();setError('');setSaved(false);setFieldErrors({})
  const errors=validateProfile(form)
  if(Object.keys(errors).length){setFieldErrors(errors);setError(messageForErrors(errors));requestAnimationFrame(()=>document.querySelector('.mydata-form .field[data-invalid="true"] input, .mydata-form .field[data-invalid="true"] select')?.focus());return}
  try {
   if(backendMode){
    if(currentUser?.role!=='admin')throw new Error('La cuenta de asesor no tiene todavía permiso para guardar cambios en «Mis datos». Se requiere habilitar la edición del perfil propio en FastAPI; los datos no se modificaron.')
    await actualizarUsuarioBackend(currentUser.id,form)
    await updateSessionUser()
   } else { await updateUser(form);await updateSessionUser(form) }
   setSaved(true)
  }catch(error){const mapped=serverErrors(error);if(Object.keys(mapped).length){setFieldErrors(mapped);setError(messageForErrors(mapped))}else setError(shouldShowServerError(error,mapped))}
 }
 return <section className="page-section"><div className="tabs-row"><button className="tab active">Mis datos</button></div><form onSubmit={submit} className="mydata-form"><div className="mydata-grid">
  <label className="field" data-field-key="documentType" data-invalid={Boolean(fieldErrors.documentType)}><span>Tipo de documento*</span><select disabled={isReadOnly} value={form.documentType} onChange={e=>change('documentType',e.target.value)}><option>Cédula</option><option>Pasaporte</option></select>{fieldErrors.documentType && <small className="field-validation-message">{fieldErrors.documentType}</small>}</label><label className="field" data-field-key="documentNumber" data-invalid={Boolean(fieldErrors.documentNumber)}><span>Número de documento*</span><input readOnly={isReadOnly} value={form.documentNumber} onChange={e=>change('documentNumber',e.target.value)}/>{fieldErrors.documentNumber && <small className="field-validation-message">{fieldErrors.documentNumber}</small>}</label><label className="field" data-field-key="firstName" data-invalid={Boolean(fieldErrors.firstName)}><span>Primer nombre*</span><input readOnly={isReadOnly} value={form.firstName} onChange={e=>change('firstName',e.target.value)}/>{fieldErrors.firstName && <small className="field-validation-message">{fieldErrors.firstName}</small>}</label>
  <label className="field" data-field-key="secondName" data-invalid={Boolean(fieldErrors.secondName)}><span>Segundo nombre</span><input readOnly={isReadOnly} value={form.secondName||''} onChange={e=>change('secondName',e.target.value)}/>{fieldErrors.secondName && <small className="field-validation-message">{fieldErrors.secondName}</small>}</label><label className="field" data-field-key="lastName" data-invalid={Boolean(fieldErrors.lastName)}><span>Primer Apellido*</span><input readOnly={isReadOnly} value={form.lastName} onChange={e=>change('lastName',e.target.value)}/>{fieldErrors.lastName && <small className="field-validation-message">{fieldErrors.lastName}</small>}</label><label className="field" data-field-key="secondLastName" data-invalid={Boolean(fieldErrors.secondLastName)}><span>Segundo apellido</span><input readOnly={isReadOnly} value={form.secondLastName||''} onChange={e=>change('secondLastName',e.target.value)}/>{fieldErrors.secondLastName && <small className="field-validation-message">{fieldErrors.secondLastName}</small>}</label>
  <label className="field" data-field-key="birthDate" data-invalid={Boolean(fieldErrors.birthDate)}><span>Fecha de nacimiento</span><input readOnly={isReadOnly} type="date" value={form.birthDate} onChange={e=>change('birthDate',e.target.value)}/>{fieldErrors.birthDate && <small className="field-validation-message">{fieldErrors.birthDate}</small>}</label><label className="field" data-field-key="phone" data-invalid={Boolean(fieldErrors.phone)}><span>Número de celular*</span><input readOnly={isReadOnly} value={form.phone} onChange={e=>change('phone',e.target.value)}/>{fieldErrors.phone && <small className="field-validation-message">{fieldErrors.phone}</small>}</label><label className="field" data-field-key="gender" data-invalid={Boolean(fieldErrors.gender)}><span>Género</span><select disabled={isReadOnly} value={form.gender} onChange={e=>change('gender',e.target.value)}><option>Masculino</option><option>Femenino</option><option>Otro</option></select>{fieldErrors.gender && <small className="field-validation-message">{fieldErrors.gender}</small>}</label>
  <label className="field" data-field-key="address" data-invalid={Boolean(fieldErrors.address)}><span>Dirección*</span><input readOnly={isReadOnly} value={form.address} onChange={e=>change('address',e.target.value)}/>{fieldErrors.address && <small className="field-validation-message">{fieldErrors.address}</small>}</label>
 </div>{error&&<div className="form-error" role="alert">{error}</div>}{saved&&<div className="success-note">Datos actualizados correctamente.</div>}{!isReadOnly && <div className="form-actions"><button className="btn btn-orange">Guardar</button><button type="button" className="btn btn-orange secondary-orange" onClick={()=>setForm({...currentUser})}>Cancelar</button></div>}</form></section>
}
