# COPERCAR — Ajustes del prototipo frontend (2026-10-16)

## Cambios realizados

1. **Reportes:** los totales se calculan sobre los movimientos activos del año y mes seleccionados; las listas y exportaciones PDF/Excel toman los mismos registros. El gráfico muestra los doce meses del año. Cuando no hay movimientos aparece un estado vacío. La ganancia indicada es ingresos menos egresos, **no utilidad contable**.
2. **Datos de demostración:** los movimientos de ejemplo se asociaron con placas, nombres y IDs reales del inventario ficticio; período demo: mayo-junio de 2026. Se utiliza una clave `v2_` de `localStorage` para no heredar movimientos de la versión anterior.
3. **Reglas entre módulos:** registrar/editar/eliminar lógicamente una venta ajusta el estado del vehículo correspondiente en el modo demo. No se permite eliminar un vehículo con historial de movimientos, tampoco si sus movimientos fueron marcados como eliminados. Se impide eliminar al último administrador.
4. **Formularios:** se añadieron comprobaciones de placa, año y valores positivos, duplicidad de correo, protección ante rutas de edición inexistentes, estado **Separado**, menú más completo de marcas y localidades dependientes del departamento, con líneas sugeridas según marca.
5. **Sesión:** en `sessionStorage` solo se guarda un perfil sin contraseña. Atención: en el modo demo las contraseñas siguen estando en los datos locales para simular el inicio de sesión; **no debe desplegarse como autenticación real**.
6. **Integración futura:** `src/services/resources.js` declara funciones HTTP para los recursos definidos. Son adaptadores de referencia sin uso en el modo demo. La negociación del contrato REST con backend todavía está pendiente.
7. **Entrega Git:** el ZIP no incluye `node_modules` ni `dist`. Contiene `.gitignore` y `.env.example`.

## Consideraciones y pendientes

- El proyecto **NO está conectado** a FastAPI ni a MySQL. Antes de producción el backend debe aplicar todas las reglas de permisos, autenticación, duplicados e integridad.
- Los catálogos de ciudades y líneas son **parciales, de demostración**. No representan un catálogo geográfico nacional exhaustivo. Completar mediante catálogos de backend.
- El estado sincronizado mediante movimientos es una **regla de demostración** y debe revisarse con el equipo backend (anulaciones, compras posteriores, ventas múltiples y auditoría).
- No se realizan transacciones reales, ni se simula una persistencia remota. Las fotos agregadas se guardan como data URL en el almacenamiento local; para producción deberán cargarse al servicio de archivos definido por el backend.
- La prueba de compilación en este entorno Linux quedó **bloqueada** por una dependencia binaria opcional de Rollup ausente en el ZIP original (paquetes `node_modules` generados en otro sistema). Se ha verificado la sintaxis de los archivos JavaScript/JSX modificados con `@babel/parser`; se recomienda ejecutar `npm install` y `npm run build` en Windows antes de fusionar en Git.
- Los mockups móviles representan el mismo frontend adaptable, no una aplicación móvil independiente.
