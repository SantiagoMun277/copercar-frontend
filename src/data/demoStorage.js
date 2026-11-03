// Versionado de datos de prueba: se aísla de versiones anteriores sin borrar datos del usuario.
export const DEMO_STORAGE_PREFIX = 'v3_copercar'
export const demoKey = entity => `${DEMO_STORAGE_PREFIX}_${entity}`
export const sessionKey = demoKey('session')
