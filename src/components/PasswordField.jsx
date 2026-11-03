import { useState } from 'react'

export default function PasswordField({ value, onChange, placeholder = 'Contraseña', required = false, autoComplete = 'new-password', ariaLabel = 'Contraseña' }) {
  const [visible, setVisible] = useState(false)
  return <div className="password-field">
    <input type={visible ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} required={required} autoComplete={autoComplete} aria-label={ariaLabel} />
    <button type="button" className="password-toggle" onClick={()=>setVisible(v=>!v)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
      {visible ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 5.2A10.6 10.6 0 0 1 12 5c5.7 0 9.5 7 9.5 7a15.5 15.5 0 0 1-3 3.8M6.2 6.2C3.8 8 2.5 12 2.5 12S6.3 19 12 19a9 9 0 0 0 4.1-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6.3 5 12 5s9.5 7 9.5 7-3.8 7-9.5 7-9.5-7-9.5-7Z"/><circle cx="12" cy="12" r="3"/></svg>}
    </button>
  </div>
}
