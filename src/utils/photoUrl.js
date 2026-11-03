// Solicita versiones pequeñas en Cloudinary sin alterar la foto original almacenada.
// Si la URL no es de Cloudinary, se utiliza sin cambios.
export function miniaturaVehiculo(src, ancho = 560) {
  if (typeof src !== 'string' || !src.startsWith('https://res.cloudinary.com/')) return src
  try {
    const url = new URL(src)
    const marcador = '/image/upload/'
    if (!url.pathname.includes(marcador)) return src
    const w = Math.max(160, Math.min(1600, Math.round(ancho)))
    url.pathname = url.pathname.replace(marcador, `${marcador}c_limit,w_${w},q_auto,f_auto/`)
    return url.toString()
  } catch {
    return src
  }
}
