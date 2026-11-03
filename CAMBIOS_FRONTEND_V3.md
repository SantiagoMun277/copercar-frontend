# COPERCAR · Cambios de frontend v1.1 (demo)

Actualización del frontend existente basada en el documento «PROYECTOS DE SOFTWARE LOS AJS» (58 páginas) y `MOCKUPS.pdf`. El mismo diseño naranja y blanco se conserva. No se ha conectado a FastAPI ni MySQL.

## Cambios entregados

1. **Gestión de usuarios.** «Agregar usuario» sigue en una página específica. «Editar» abre ahora un **modal** encima del listado; se eliminó la pestaña «Agregar usuario» durante la edición. El formulario se comparte internamente entre creación y edición. Un enlace antiguo a `/usuarios/:id/editar` abre esa misma edición modal al redirigir al listado.
2. **Contraseñas.** En inicio de sesión y en alta/edición de usuarios hay un botón con ojo para mostrar u ocultar lo escrito. Al editar un usuario, la contraseña anterior no se presenta: el campo de nueva contraseña es opcional; dejarlo vacío la conserva. Es deliberado para que la integración con FastAPI **nunca necesite recibir la contraseña almacenada**. Se corrigió también la pérdida accidental de la contraseña al actualizar «Mis datos».
3. **Ubicaciones de matrícula.** Departamento y municipio se pueden buscar escribiendo (sin importar mayúsculas o tildes). La selección de departamento restablece la ciudad cuando corresponde. **Huila incluye sus 37 municipios**; Caquetá incluye sus 16 municipios; otros departamentos cuentan con sugerencias locales, pero el catálogo de todas las ciudades colombianas **no está exhaustivamente cargado**. Para que una ciudad faltante no bloquee el prototipo, el campo de municipio también admite introducir un nombre manualmente. Debe sustituirse por el catálogo oficial con códigos DANE al conectar el backend.
4. **Movimientos.** En registro y edición se puede buscar el vehículo por placa o nombre entre **todos los vehículos del inventario activo de la demostración**. No se preselecciona un vehículo al crear una operación. Al guardar, el movimiento conserva `vehicleId`, `plate` y `vehicle` coherentes. Se habilita corregir el vehículo asociado durante la edición por solicitud del equipo (ampliación respecto a los campos editables mencionados en RFE-13); la regla final debe acordarse con el backend.
5. **Datos demostrativos.** Se utilizan claves `v3_copercar_*` para comenzar esta versión sin heredar ediciones incompatibles de la entrega anterior. Los datos `v2_*` no se borran. Se mantiene el origen simulado de usuarios, vehículos, movimientos y reportes.
6. **Responsive.** Se refuerza la visualización de modales y selectores en pantallas estrechas, siempre dentro de la misma aplicación web.
7. **Verificación.** `npm run test:demo` comprueba que las referencias y catálogos de los datos ficticios son coherentes.

## Antes de conectar FastAPI

- Reemplazar `AppDataContext.jsx` y el inicio de sesión local por los adaptadores de datos reales en `src/services/`.
- Proporcionar recursos REST para auth, usuarios, vehículos, movimientos, reportes y catálogos de departamentos/municipios (idealmente DANE), definir los DTOs Pydantic y acordar si el cambio de vehículo asociado a un movimiento está permitido.
- El backend debe implementar validación de duplicados, permisos por rol, borrado lógico y reglas de coherencia de ventas. Los permisos de React no sustituyen la seguridad de la API.
- **No guardar contraseñas reales en `localStorage` ni devolver contraseñas desde FastAPI**. Los usuarios y contraseñas de ejemplo son ficticios y solo sirven para esta demostración.
- Las fotografías de prueba guardadas como `data:` URLs no son un mecanismo de almacenamiento permanente: migrarlas a almacenamiento de archivos con referencias seguras.

## Limitaciones de comprobación

Las pruebas de catálogo y de integridad del demo pueden ejecutarse con Node sin dependencias externas. Un `npm run build` completo depende de que `npm install` incorpore las dependencias binarias apropiadas para el sistema operativo donde se ejecute. Validar navegación, edición y responsive manualmente en el navegador de Windows antes de incorporar esta rama al repositorio.
