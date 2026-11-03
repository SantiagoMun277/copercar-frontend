# Notas de implementación — COPERCAR

## Criterio seguido

Se priorizó el comportamiento descrito por los requisitos funcionales y, para la presentación, los mockups proporcionados. Cuando una maqueta contenía una contradicción visual con el comportamiento esperado, se conservó el requerimiento funcional y se hizo el ajuste mínimo.

## Módulos

### Autenticación
- Inicio de sesión por correo y contraseña.
- Redirección según autenticación.
- Protección de rutas por rol.
- Credenciales de demostración documentadas en README.

### Vehículos
- Agregar, buscar por placa/título, filtrar por estado, editar y eliminar.
- Validación de placa duplicada.
- Estados visuales: Disponible, Ingresando, No disponible, Vendido y Separado.
- Campos principales del documento y mockup.
- Fotografías múltiples con previsualización y retiro antes de guardar.
- SOAT y Revisión Tecnomecánica.

Ajuste frente al mockup: el filtro de estado inicia en `Todos`; la captura mostraba `Disponible` mientras listaba también vehículos en otros estados, lo cual era inconsistente con un filtro real.

### Usuarios
- CRUD disponible solo para Administrador.
- Búsqueda por número de documento.
- Validación de documento duplicado.
- `Mis datos` disponible para cualquier usuario autenticado.

### Movimientos
- Registro de Compra/Venta.
- Consulta por placa, tipo, fecha, mes y año.
- Edición y eliminación con confirmación.
- La eliminación se maneja de forma lógica en los datos locales (`deleted: true`).
- Usuario responsable tomado del usuario autenticado.

### Reportes
- Disponible solo para Administrador.
- Filtros de año y mes.
- Indicadores de ingresos, egresos, ganancia y cantidad de movimientos.
- Gráfico responsive de ingresos/egresos.
- Listas de vehículos vendidos y comprados.
- Exportación a PDF y Excel.

## Responsive

- Escritorio: navegación lateral fija y distribución similar a los mockups.
- Tablet: formularios y tarjetas reorganizados a 2 columnas cuando aplica.
- Móvil: navegación inferior, formularios a una columna y tablas con desplazamiento horizontal controlado.

## Backend

El prototipo utiliza `localStorage` para persistencia temporal y `sessionStorage` para la sesión. El archivo `src/services/api.js` deja preparado el punto de integración con FastAPI mediante `VITE_API_URL`.

> **Nota v1.1:** estas notas describen también la versión inicial. Las diferencias de la entrega actual (edición de usuarios en modal, buscadores, contraseña y ubicaciones) se explican en `CAMBIOS_FRONTEND_V3.md`.
