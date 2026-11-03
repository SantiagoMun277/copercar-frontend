import { useEffect, useId, useMemo, useRef, useState } from 'react'

// Selector de catálogo reutilizable. Permite búsqueda por texto o por placa/nombre.
// allowCustom admite municipios que aún no estén precargados (modo demostración).
const normalize = text => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export default function SearchableSelect({ value = '', options = [], onChange, placeholder = 'Buscar o seleccionar...', allowCustom = false, disabled = false, name, ariaLabel }) {
  const id = useId()
  const root = useRef(null)
  const [typed, setTyped] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const choices = useMemo(() => options.map(o => typeof o === 'string' ? { value: o, label: o } : o), [options])
  const selected = choices.find(o => String(o.value) === String(value))
  const visible = selected ? selected.label : (allowCustom ? String(value ?? '') : '')
  // Cuando está cerrado siempre muestra el texto elegido y no la última búsqueda.
  const display = open ? typed : visible
  const filtered = useMemo(() => choices.filter(o => normalize(o.label).includes(normalize(typed)) || normalize(o.value).includes(normalize(typed))).slice(0, 120), [choices, typed])

  useEffect(() => {
    const close = e => { if (root.current && !root.current.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])
  const select = choice => {
    onChange(choice.value)
    setTyped(choice.label)
    setOpen(false)
  }
  const keyboard = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) { setTyped(''); setOpen(true) } else setActive(i => Math.min(i + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp' && open) { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && open && filtered.length) { e.preventDefault(); select(filtered[active] || filtered[0]) }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
  }
  return <div className="searchable-select" ref={root}>
    <div className="searchable-input-row">
      <input type="text" value={display} name={name} disabled={disabled} role="combobox" aria-label={ariaLabel || placeholder} aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-options`} autoComplete="off" placeholder={placeholder}
        onFocus={() => { setTyped(''); setActive(0); setOpen(true) }}
        onChange={e => { setTyped(e.target.value); setActive(0); setOpen(true); if (allowCustom) onChange(e.target.value) }}
        onBlur={() => { if (open && allowCustom && typed.trim()) onChange(typed.trim()) }}
        onKeyDown={keyboard} />
      <button type="button" className="searchable-arrow" disabled={disabled} tabIndex={-1} aria-label="Mostrar opciones" onMouseDown={e=>e.preventDefault()} onClick={() => { setTyped(''); setOpen(o => !o) }}>⌄</button>
    </div>
    {open && !disabled && <div id={`${id}-options`} role="listbox" className="searchable-options">
      {filtered.map((o, i) => <button key={`${o.value}-${i}`} type="button" role="option" aria-selected={String(o.value) === String(value)} className={i === active ? 'searchable-option active' : 'searchable-option'} onMouseDown={e=>e.preventDefault()} onClick={()=>select(o)}>{o.label}</button>)}
      {!filtered.length && <div className="searchable-noresults">{allowCustom ? 'Sin sugerencias. Puedes escribir el municipio completo.' : 'Sin coincidencias. Busca otra opción.'}</div>}
      {allowCustom && typed.trim() && !choices.some(o => normalize(o.label) === normalize(typed)) && <button type="button" className="searchable-option custom-option" onMouseDown={e=>e.preventDefault()} onClick={()=>select({value:typed.trim(), label:typed.trim()})}>Usar «{typed.trim()}»</button>}
    </div>}
  </div>
}
