// Preparación local de las fotos: reduce resolución y tamaño antes de subirlas.
// Conserva el mismo formato de data: URL que ya usa el formulario de COPERCAR.
const MAX_LADO = 1600
const CALIDAD_JPEG = 0.8
const TIPOS_COMPATIBLES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const leerDataURL = file => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(new Error('No se pudo leer la fotografía.'))
  reader.readAsDataURL(file)
})

export async function optimizarFotoParaSubida(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Selecciona un archivo de imagen.')
  if (!TIPOS_COMPATIBLES.has(file.type) || typeof createImageBitmap !== 'function') {
    return leerDataURL(file)
  }

  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // Si este navegador no puede decodificar el formato, conservar el archivo.
    return leerDataURL(file)
  }

  try {
    const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height))
    // Una foto JPEG ya ligera no necesita recomprimirse.
    if (escala === 1 && file.size <= 250 * 1024 && file.type === 'image/jpeg') {
      return leerDataURL(file)
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * escala))
    canvas.height = Math.max(1, Math.round(bitmap.height * escala))
    const ctx = canvas.getContext('2d', {alpha: false})
    if (!ctx) return leerDataURL(file)
    // Evita fondo negro en fotos PNG/WebP con transparencia.
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const jpeg = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', CALIDAD_JPEG))
    if (!jpeg || jpeg.size >= file.size) {
      return leerDataURL(file)
    }
    return leerDataURL(jpeg)
  } finally {
    bitmap.close?.()
  }
}
