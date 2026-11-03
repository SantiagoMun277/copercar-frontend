# COPERCAR · Frontend web (demo v1.1)

Prototipo navegable del **Sistema de gestión de inventario de vehículos COPERCAR**, basado en el documento de requisitos y los mockups compartidos. **No conectado todavía a FastAPI ni MySQL**. Los datos son ficticios, gestionados en el navegador para permitir demostrar la interfaz.

## Requisitos previos

Node.js 24 LTS (o versión compatible con Vite 7) y npm; VS Code recomendado. Git es opcional hasta que el equipo integre este código a su repositorio ya existente. No instalar React globalmente.

## Instalación y ejecución desde cero (Windows / PowerShell)

1. Extraer este ZIP en `C:\Users\munoz\Documents\copercar-frontend` o en otra ruta elegida.
2. Abrir esa carpeta en Visual Studio Code (Archivo > Abrir carpeta) y abrir su Terminal.
3. Ejecutar desde la carpeta que contiene `package.json`:

```powershell
npm install
npm run test:demo
npm run dev
```

4. Entrar a la URL que anuncie Vite (habitualmente `http://localhost:5173/`).
5. Para compilar una versión distribuible: detener el servidor y ejecutar `npm run build`.

No se incluye `node_modules` para evitar dependencias de Windows incrustadas en el ZIP. `npm install` debe reconstruirlo según el sistema operativo.

## Acceso de demostración

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@copercar.com` | `Admin123*` |
| Asesor | `asesor@copercar.com` | `Asesor123*` |

Estas credenciales son **únicamente ficticias**. No se deben utilizar en un despliegue real. El botón con ojo permite mostrar y ocultar la contraseña que se está escribiendo.

## Funcionalidades y pantallas

- Login simulado por rol (administrador y asesor).
- Vehículos: listado, búsqueda, filtro de estados, creación/edición, fotos, SOAT, RTM, eliminación y departamentos/municipios buscables.
- Movimientos: listado, filtros, compra/venta, búsqueda de vehículo por placa o nombre, creación/edición y eliminación lógica.
- Reportes: métricas por período basadas en movimientos de la demo, gráfico, listados y exportación PDF/Excel (administrador).
- Usuarios: listado, búsqueda por documento, creación en pantalla propia, **edición en modal**, eliminación con confirmación (administrador).
- Mis datos: edición del perfil del usuario conectado sin borrar la contraseña local de demostración.
- Una sola web adaptable a escritorio y teléfono; los mockups móviles son referencia responsive.

## Comprobaciones manuales recomendadas

1. Login administrador, mostrar y ocultar la contraseña con el ojo.
2. Usuarios > Editar: aparece el modal «Editar usuario», sin pestaña «Agregar usuario». Ojo en la nueva contraseña. Guardar sin introducir contraseña y confirmar que el usuario sigue pudiendo iniciar sesión después de salir.
3. Usuarios > Agregar: comprobar que abre la pantalla de alta con campos vacíos.
4. Vehículos > Editar > seleccionar HUILA: buscar Neiva, Pitalito, Garzón, San Agustín y cualquier otro de sus 37 municipios. Probar cambio de departamento y escritura libre de otro municipio no sugerido.
5. Movimientos > Registrar y Editar: abrir la búsqueda de vehículo, localizar por placa y nombre, seleccionar un vehículo y guardar una operación con valor mayor que cero.
6. Reportes (administrador): comprobar que al cambiar compra/venta o período cambian los totales y las exportaciones.
7. Abrir las mismas pantallas con herramientas de dispositivo móvil del navegador; comprobar modales, navegación, tablas y desplazamiento.

## Datos de demostración y comienzo limpio

Esta entrega inicia con nuevas claves locales `v3_copercar_users`, `v3_copercar_vehicles`, `v3_copercar_movements` y `v3_copercar_session` en el mismo origen. Las claves de versiones anteriores no se eliminan ni se mezclan, por lo que la demo arranca con sus tres cuentas de prueba y cinco vehículos iniciales.

Si se modifican las credenciales o datos de la **versión v3** y quieres volver exactamente a la demo inicial, abre las herramientas del navegador (F12 > Consola) y ejecuta **solo en este prototipo**:

```javascript
for (const key of ['v3_copercar_users','v3_copercar_vehicles','v3_copercar_movements']) localStorage.removeItem(key)
sessionStorage.removeItem('v3_copercar_session')
location.reload()
```

Esto descarta los cambios ficticios guardados en ese navegador para esta versión. No afecta otros proyectos o claves.

## Integración futura con el backend del documento

El documento plantea React + JavaScript/CSS para frontend, **FastAPI** para API REST, **SQLAlchemy** para acceso a datos y **MySQL** para persistencia. React no debe acceder directamente a MySQL.

- `src/context/AppDataContext.jsx`: fuente de datos simulados con `localStorage`.
- `src/context/AuthContext.jsx`: autenticación simulada **no segura para producción**.
- `src/data/mockData.js`: usuarios, vehículos y movimientos de prueba.
- `src/data/catalogs.js`: estados, marcas y sugerencias de municipios. Hay 37 municipios de Huila y 16 de Caquetá, pero no todos los municipios de todos los departamentos; la lista completa oficial debe proceder del backend.
- `src/services/api.js`, `src/services/resources.js`: capa HTTP **preparatoria, todavía no utilizada por las pantallas**.
- `.env.example`: variable `VITE_API_URL` para la URL pública de la API cuando esté preparada.

El sistema definitivo deberá definir validaciones, autorizaciones, tokens o sesión segura, contratos Pydantic, carga de archivos, catálogos normalizados y manejo coherente de los estados. El backend no debe devolver contraseñas, por eso la edición del frontend solicita una **contraseña nueva opcional**.

### Propuesta de endpoints (por confirmar con backend)

- `POST /api/auth/login` — correo + contraseña; retorno de identidad y sesión/token autorizado.
- `GET, POST /api/vehiculos`; `GET, PUT, DELETE /api/vehiculos/{id}`.
- `GET, POST /api/usuarios`; `GET, PUT, DELETE /api/usuarios/{id}`.
- `GET, POST /api/movimientos`; `GET, PUT, DELETE /api/movimientos/{id}` (borrado lógico).
- `GET /api/reportes?year=2026&month=5`.
- `GET /api/catalogos/departamentos` y `GET /api/catalogos/municipios?departamentoId=...` para códigos oficiales y listas completas.

Los nombres y campos anteriores son orientativos, **no se ha comprobado la existencia de esos endpoints**. Ver también `CAMBIOS_FRONTEND_V3.md`.

## GitHub

No se incluye un repositorio `.git` dentro del ZIP porque otro integrante del equipo ya creó el repositorio. Primero probar el proyecto localmente; después crear una rama en el repositorio compartido e incorporar aquí los archivos sin `node_modules`, `dist` ni `.env`. Las instrucciones concretas dependerán de la URL y rama principal reales.
