export const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value || 0))

export const formatDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.includes('-') ? iso.split('-') : []
  return y && m && d ? `${d}/${m}/${y}` : iso
}

export const todayISO = () => new Date().toISOString().slice(0, 10)
