// COPERCAR: permite letras ASCII y, adicionalmente, ñ/Ñ en correos.
// Esta comprobación es solo del navegador; la API decide si acepta el dato.
export function esCorreoConEnyeValido(valor) {
  const correo = String(valor ?? '').trim()
  if (correo.length < 5 || correo.length > 254 || correo.includes('..')) return false
  const partes = correo.split('@')
  if (partes.length !== 2) return false
  const [usuario, dominio] = partes
  if (!usuario || usuario.length > 64 || usuario.startsWith('.') || usuario.endsWith('.')) return false
  if (!/^[A-Za-z0-9ñÑ._%+-]+$/u.test(usuario)) return false

  const etiquetas = dominio.split('.')
  if (etiquetas.length < 2 || !etiquetas.every(etiqueta => {
    return etiqueta.length <= 63 && /^[A-Za-z0-9ñÑ]+(?:[A-Za-z0-9ñÑ-]*[A-Za-z0-9ñÑ])?$/u.test(etiqueta)
  })) return false
  return etiquetas[etiquetas.length - 1].length >= 2
}
