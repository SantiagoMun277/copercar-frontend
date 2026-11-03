import { useLayoutEffect, useRef } from 'react'
import { formatThousands, parseThousandsInput } from '../utils/thousands'

// Entrada controlada: conserva un valor numérico sin puntos para FastAPI.
export default function ThousandsInput({ value, onChange, allowDecimals = false, placeholder = '', ...props }) {
  const ref = useRef(null)
  const pendingCaret = useRef(null)
  const displayed = formatThousands(value, allowDecimals)

  useLayoutEffect(() => {
    const significant = pendingCaret.current
    if (significant === null || !ref.current) return
    pendingCaret.current = null
    if (significant === 0) { ref.current.setSelectionRange(0, 0); return }
    const shown = ref.current.value
    let count = 0
    for (let i = 0; i < shown.length; i++) {
      if (/\d|,/.test(shown[i])) count++
      if (count === significant) { ref.current.setSelectionRange(i + 1, i + 1); return }
    }
    ref.current.setSelectionRange(shown.length, shown.length)
  })

  const handleInput = event => {
    const raw = event.target.value
    const position = event.target.selectionStart ?? raw.length
    pendingCaret.current = (raw.slice(0, position).match(/[0-9,]/g) || []).length
    onChange(parseThousandsInput(raw, allowDecimals))
  }
  return <input
    {...props}
    ref={ref}
    type="text"
    inputMode={allowDecimals ? 'decimal' : 'numeric'}
    autoComplete="off"
    placeholder={placeholder}
    value={displayed}
    onChange={handleInput}
    onBlur={() => { if (allowDecimals && String(value).endsWith('.')) onChange(String(value).slice(0, -1)) }}
  />
}
