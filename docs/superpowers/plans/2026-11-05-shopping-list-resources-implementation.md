# Plan de implementación: Compras inteligentes y recursos

**Spec:** `docs/superpowers/specs/2026-11-05-shopping-list-resources-design.md`

## Task 1: Consolidación canónica y unidades

- [x] Escribir pruebas fallidas para familias equivalentes, conversión de volumen y fusión de `al gusto`.
- [x] Extender el catálogo con metadatos de compra y el dominio con claves por dimensión.
- [x] Implementar la consolidación preservando líneas incompatibles.
- [x] Ejecutar las pruebas de dominio enfocadas.

## Task 2: Edición y supresión persistentes

- [x] Escribir pruebas fallidas de servicio, rutas y repositorio para editar y quitar líneas generadas.
- [x] Extender el contrato y las funciones de snapshot de Supabase.
- [x] Implementar personalizaciones y supresiones por semana.
- [x] Ejecutar pruebas enfocadas de servicio, infraestructura y Worker.

## Task 3: Edición móvil de Compras

- [x] Escribir pruebas fallidas para editar cantidad/unidad y quitar cualquier línea.
- [x] Implementar edición en línea accesible, estados de guardado y estilos responsive.
- [x] Ejecutar pruebas de cliente y el recorrido de Compras.

## Task 4: Biblioteca PDF

- [x] Inspeccionar visualmente portada y una página interna de cada PDF.
- [x] Copiar los cuatro originales a `public/resources` con nombres seguros.
- [x] Escribir/actualizar pruebas para exigir las cuatro descargas aprobadas.
- [x] Actualizar metadatos y mensajes educativos de Recursos.
- [x] Ejecutar pruebas de contenido, build y cliente.

## Task 5: Verificación y publicación

- [x] Ejecutar suite completa, typecheck y build.
- [x] Ejecutar E2E móvil de Semana → Compras y acceso a Recursos.
- [x] Aplicar la migración aditiva de Supabase sin reset.
- [x] Desplegar Cloudflare, verificar producción y enviar la rama al remoto.

