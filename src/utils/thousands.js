// Los puntos son separadores visuales de miles; el valor conservado no los contiene.
// En Valor de la operación se permite coma decimal (máximo dos cifras).
export function formatThousands(value, allowDecimals = false) {
  const text = String(value ?? '')
  if (text === '') return ''
  const parts = text.split('.')
  const digits = (parts[0] || '0').replace(/\D/g, '')
  const integer = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return allowDecimals && parts.length > 1 ? `${integer},${(parts[1] || '').replace(/\D/g, '').slice(0, 2)}` : integer
}

// Recibe lo que se ve en pantalla (1.250.000,50) y entrega 1250000.50.
export function parseThousandsInput(value, allowDecimals = false) {
  const text = String(value ?? '')
  const commaIndex = allowDecimals ? text.indexOf(',') : -1
  const integerText = (commaIndex < 0 ? text : text.slice(0, commaIndex)).replace(/\D/g, '')
  if (!integerText && commaIndex < 0) return ''
  const integer = (integerText || '0').replace(/^0+(?=\d)/, '')
  if (commaIndex < 0) return integer
  const fraction = text.slice(commaIndex + 1).replace(/\D/g, '').slice(0, 2)
  return `${integer}.${fraction}`
}
