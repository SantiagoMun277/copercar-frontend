import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import PasswordField from '../components/PasswordField'
import {validateUser, messageForErrors, serverErrors, shouldShowServerError} from '../utils/formValidation'

// La validación del formulario vuelve a comprobar estas reglas antes de guardar.
const soloDigitos = texto => String(texto).replace(/[^0-9]/g, '')
const soloLetras = texto => String(texto).replace(/[^\p{L}\s]/gu, '')

const empty = { documentType:'Cédula', documentNumber:'', firstName:'', secondName:'', lastName:'', secondLastName:'', email:'', phone:'', birthDate:'', gender:'Masculino', password:'', address:'', role:'asesor', active:true }

// Reutilizable en la página "Agregar usuario" y en la ventana modal "Editar usuario".
export function UserEditor({ user = null, onSaved, onCancel }) {
  const { users, addUser, updateUser } = useAppData()
  const editing = Boolean(user)
  // Nunca precargar una contraseña al editar: FastAPI tampoco debe devolverla.
  const [form, setForm] = useState(() => user ? { ...user, password:'' } : { ...empty })
  const [error, setError] = useState('')
  const [fieldErrors,setFieldErrors]=useState({})
  const [saving, setSaving] = useState(false)
  const change = (key, value) => {setForm(prev => ({ ...prev, [key]:value }));setFieldErrors(prev=>{if(!prev[key])return prev;const next={...prev};delete next[key];return next})}
  const markErrors = errors => {setFieldErrors(errors);setError(messageForErrors(errors));requestAnimationFrame(()=>document.querySelector('.user-form .field[data-invalid="true"] input, .user-form .field[data-invalid="true"] select')?.focus())}
  const submit = async event => {
    event.preventDefault();setError('');setFieldErrors({})
    const errors=validateUser(form,editing,users)
    if(Object.keys(errors).length){markErrors(errors);return}
    const payload={...form,documentNumber:form.documentNumber.trim(),email:form.email.trim().toLowerCase()}
    setSaving(true)
    try {
      if (editing) {
        if (!payload.password) delete payload.password
        await updateUser(payload)
      } else await addUser(payload)
      onSaved?.()
    } catch (e) {
      const mapped=serverErrors(e)
      if(Object.keys(mapped).length)markErrors(mapped)
      else setError(shouldShowServerError(e,mapped))
    } finally {setSaving(false)}
  }
  return <form className="user-form" onSubmit={submit}>
    <h1>{editing ? 'Editar usuario' : 'Agregar usuario'}</h1>
    <div className="user-form-grid">
      <label className="field" data-field-key="documentType" data-invalid={Boolean(fieldErrors.documentType)}><span>Tipo de documento *</span><select value={form.documentType} onChange={e=>change('documentType', e.target.value)}><option>Cédula</option><option>Pasaporte</option><option>Cédula de extranjería</option><option>NIT</option></select>{fieldErrors.documentType && <small className="field-validation-message">{fieldErrors.documentType}</small>}</label>
      <label className="field" data-field-key="email" data-invalid={Boolean(fieldErrors.email)}><span>Correo electrónico *</span><input type="email" value={form.email} onChange={e=>change('email', e.target.value)} />{fieldErrors.email && <small className="field-validation-message">{fieldErrors.email}</small>}</label>
      <label className="field" data-field-key="documentNumber" data-invalid={Boolean(fieldErrors.documentNumber)}><span>Número de documento *</span><input type="text" inputMode="numeric" pattern="[0-9]*" value={form.documentNumber} onChange={e=>change('documentNumber', soloDigitos(e.target.value))} />{fieldErrors.documentNumber && <small className="field-validation-message">{fieldErrors.documentNumber}</small>}</label>
      <label className="field" data-field-key="phone" data-invalid={Boolean(fieldErrors.phone)}><span>Número de celular *</span><input type="text" inputMode="numeric" pattern="[0-9]*" value={form.phone} onChange={e=>change('phone', soloDigitos(e.target.value))} />{fieldErrors.phone && <small className="field-validation-message">{fieldErrors.phone}</small>}</label>
      <label className="field" data-field-key="firstName" data-invalid={Boolean(fieldErrors.firstName)}><span>Primer nombre *</span><input value={form.firstName} onChange={e=>change('firstName', soloLetras(e.target.value))} />{fieldErrors.firstName && <small className="field-validation-message">{fieldErrors.firstName}</small>}</label>
      <label className="field" data-field-key="birthDate" data-invalid={Boolean(fieldErrors.birthDate)}><span>Fecha de nacimiento *</span><input type="date" value={form.birthDate} onChange={e=>change('birthDate', e.target.value)} />{fieldErrors.birthDate && <small className="field-validation-message">{fieldErrors.birthDate}</small>}</label>
      <label className="field" data-field-key="secondName" data-invalid={Boolean(fieldErrors.secondName)}><span>Segundo nombre (opcional)</span><input value={form.secondName || ''} onChange={e=>change('secondName', soloLetras(e.target.value))} />{fieldErrors.secondName && <small className="field-validation-message">{fieldErrors.secondName}</small>}</label>
      <label className="field" data-field-key="gender" data-invalid={Boolean(fieldErrors.gender)}><span>Género *</span><select value={form.gender} onChange={e=>change('gender', e.target.value)}><option>Masculino</option><option>Femenino</option></select>{fieldErrors.gender && <small className="field-validation-message">{fieldErrors.gender}</small>}</label>
      <label className="field" data-field-key="lastName" data-invalid={Boolean(fieldErrors.lastName)}><span>Primer apellido *</span><input value={form.lastName} onChange={e=>change('lastName', soloLetras(e.target.value))} />{fieldErrors.lastName && <small className="field-validation-message">{fieldErrors.lastName}</small>}</label>
      <label className="field" data-field-key="password" data-invalid={Boolean(fieldErrors.password)}><span>{editing ? 'Nueva contraseña (opcional)' : 'Contraseña *'}</span><PasswordField value={form.password} onChange={e=>change('password',e.target.value)} placeholder={editing ? 'Dejar vacía para conservar' : 'Digite la contraseña'} required={false}/>{editing && <small className="field-hint">Déjala vacía si no deseas cambiarla.</small>}{fieldErrors.password && <small className="field-validation-message">{fieldErrors.password}</small>}</label>
      <label className="field" data-field-key="secondLastName" data-invalid={Boolean(fieldErrors.secondLastName)}><span>Segundo apellido (opcional)</span><input value={form.secondLastName || ''} onChange={e=>change('secondLastName', soloLetras(e.target.value))} />{fieldErrors.secondLastName && <small className="field-validation-message">{fieldErrors.secondLastName}</small>}</label>
      <label className="field" data-field-key="address" data-invalid={Boolean(fieldErrors.address)}><span>Dirección *</span><input value={form.address} onChange={e=>change('address', e.target.value)} />{fieldErrors.address && <small className="field-validation-message">{fieldErrors.address}</small>}</label>
      <label className="field" data-field-key="role"><span>Tipo de usuario *</span><select value={form.role || 'asesor'} onChange={e=>change('role',e.target.value)}><option value="asesor">Asesor</option><option value="admin">Administrador</option></select></label>
      <label className="field" data-field-key="active"><span>Estado *</span><select value={String(form.active !== false)} onChange={e=>change('active',e.target.value==='true')}><option value="true">Activo</option><option value="false">Inactivo</option></select></label>
    </div>
    {error && <div className="form-error form-wide" role="alert">{error}</div>}
    <div className="form-actions right"><button type="submit" className="btn btn-green" disabled={saving}>Guardar</button><button type="button" className="btn btn-light" onClick={onCancel}>Cancelar</button></div>
  </form>
}

export default function UserForm() {
  const navigate = useNavigate()
  return <section className="page-section users-page"><div className="tabs-row"><button className="tab" onClick={()=>navigate('/usuarios')}>Gestión de usuarios / listado</button><button className="tab active" aria-current="page">Agregar usuario</button></div><UserEditor onSaved={()=>navigate('/usuarios', { state:{ notice:'Usuario agregado correctamente.' } })} onCancel={()=>navigate('/usuarios')} /></section>
}
