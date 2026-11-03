import { useEffect } from 'react'

export default function Modal({ open, title, children, onClose, wide = false }) {
  useEffect(() => {
    if (!open) return
    const onKey = event => { if (event.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <section className={`modal-card ${wide ? 'modal-wide' : ''}`} onMouseDown={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title || 'Ventana de confirmación'}>
      {title && <div className="modal-title-row"><h2>{title}</h2><button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar ventana">×</button></div>}
      <div className="modal-body">{children}</div>
    </section>
  </div>
}
