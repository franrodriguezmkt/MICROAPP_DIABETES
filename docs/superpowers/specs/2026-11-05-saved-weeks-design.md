# Diseño: Mis Semanas

**Fecha:** 2026-11-05  
**Estado:** pendiente de aprobación final  
**Decisión elegida:** guardado manual de semanas

## Intención

Permitir que cada persona conserve varios menús semanales completos, los abra más adelante y cree una semana nueva sin perder las anteriores. Una semana guardada conserva las recetas elegidas, los reemplazos, las porciones y el estado exacto de su lista de compras.

## Objetivos

- Ofrecer un botón visible `Guardar en Mis Semanas` en la semana actual.
- Proponer un nombre editable con el formato `Semana del 9 al 15 de noviembre`.
- Mostrar solo guardados intencionales en el apartado `Mis Semanas`; visitar una fecha no la guarda en la biblioteca.
- Permitir abrir, renombrar y eliminar una semana guardada.
- Permitir `Crear otra semana`, usando la siguiente fecha disponible y las preferencias actuales.
- Mantener cada biblioteca privada para su usuario autenticado.
- Reutilizar Supabase, Cloudflare y la infraestructura actual sin servicios de pago nuevos.

## No objetivos

- No permitir varias versiones distintas para la misma fecha en esta primera versión.
- No compartir semanas entre usuarios.
- No convertir semanas en recomendaciones clínicas ni cambiar la selección educativa actual.
- No incluir automáticamente borradores o semanas simplemente visitadas en `Mis Semanas`.

## Enfoques considerados

1. **Historial automático por fecha.** Reutiliza todas las filas actuales sin marcar guardados. Es más simple, pero llena la biblioteca con semanas que la persona no decidió conservar.
2. **Guardado manual sobre la persistencia actual.** Añade nombre y fecha de guardado a la semana existente. Mantiene recetas y compras juntas, evita duplicar datos y distingue borradores de guardados. **Elegido por el usuario.**
3. **Plantillas independientes de la fecha.** Permite muchas variantes del mismo período, pero duplica planes y listas, exige sincronización adicional y no es necesaria para el objetivo actual.

## Experiencia de usuario

### Navegación

El menú principal conserva sus cinco destinos actuales. Dentro de `Semana` aparece una navegación secundaria con:

- `Crear semana`, que abre la semana activa.
- `Mis Semanas`, con URL propia y acceso directo.

Esto evita un sexto elemento en la barra inferior móvil. La opción activa se comunica con texto, color y semántica accesible, no solo con color.

### Guardar una semana

- La semana no guardada muestra `Guardar en Mis Semanas` como acción primaria.
- Al pulsarla se abre un diálogo con etiqueta visible y un nombre sugerido por su intervalo de fechas.
- El nombre admite entre 1 y 60 caracteres después de quitar espacios externos.
- Mientras se guarda, el botón queda deshabilitado y muestra progreso.
- Al terminar, se anuncia `Semana guardada` en una región `aria-live` y la acción cambia a `Guardada en Mis Semanas`.

### Pantalla Mis Semanas

- Encabezado con título, explicación breve y CTA principal `Crear otra semana`.
- Lista ordenada por guardado más reciente.
- Cada tarjeta muestra nombre, intervalo de fechas, cantidad de personas, número de comidas y una imagen de la primera receta cuando exista.
- Acciones: `Abrir`, `Renombrar` y `Eliminar`.
- `Abrir` navega a la semana exacta y conserva su lista de compras asociada.
- `Renombrar` usa un diálogo con etiqueta visible, validación y feedback.
- `Eliminar` requiere confirmación explícita e informa que también elimina su lista de compras. Al confirmar, se borra la semana completa.
- El estado vacío explica que aún no hay semanas guardadas y ofrece `Crear mi primera semana`.

### Crear otra semana

La aplicación busca el primer lunes disponible posterior a la semana actual o a la semana guardada más reciente. Abre esa fecha en `Crear semana`, genera el menú con las preferencias vigentes y lo mantiene como borrador hasta que la persona pulse guardar.

## Datos y seguridad

La tabla `weekly_plans` incorpora:

- `title text null`
- `saved_at timestamptz null`
- restricción: ambos son nulos para un borrador o ambos tienen valor para una semana guardada.
- restricción de longitud del título: 1 a 60 caracteres sin espacios externos.
- índice parcial por `user_id, saved_at desc` para filas guardadas.

Las tablas existentes de comidas y compras siguen asociadas a `weekly_plans`; no se duplican JSON ni filas. Las operaciones se exponen mediante funciones autenticadas que validan `auth.uid()` y respetan la propiedad del usuario.

La función actual que vuelve a guardar un snapshot reemplaza la fila del plan. La migración debe redefinirla para conservar `title` y `saved_at` durante cambios de recetas, preferencias o compras; una semana guardada nunca puede volver silenciosamente a borrador.

## Contrato de aplicación

Se introduce `SavedWeekSummary` con:

- `weekStart`
- `title`
- `savedAt`
- `people`
- `mealCount`
- `previewRecipeId`

Endpoints:

- `GET /api/saved-weeks`
- `POST /api/weeks/:weekStart/save` con `{ title }`
- `PATCH /api/saved-weeks/:weekStart` con `{ title }`
- `DELETE /api/saved-weeks/:weekStart`

Las respuestas de error no revelan semanas ajenas. El borrado devuelve éxito solo si la semana pertenece al usuario autenticado.

## Estados y recuperación

- Carga: mensaje o esqueleto sin salto de diseño.
- Error de red: mensaje con acción `Reintentar`.
- Guardado o renombrado duplicado: la misma semana se actualiza; no se crea otra fila.
- Eliminación de la semana abierta: al volver a esa fecha se genera un borrador nuevo con las preferencias vigentes.
- Receta que deja de publicarse: la tarjeta usa un marcador visual seguro y la semana sigue accesible para administrarla.

## Criterios de aceptación

- Una semana visitada no aparece en `Mis Semanas` antes de guardarla.
- Guardar una semana hace que aparezca de inmediato con su nombre y resumen correctos.
- Abrirla restaura exactamente las mismas recetas y la misma lista de compras.
- Renombrar persiste tras recargar.
- Eliminar requiere confirmación y la quita tras recargar.
- Crear otra semana no modifica las semanas guardadas.
- En 375 px no existe desplazamiento horizontal; los controles tienen un área mínima de 44×44 px.
- La navegación principal conserva un máximo de cinco elementos.
- Teclado y lector de pantalla pueden usar todos los diálogos y acciones.

## Verificación

- Pruebas de dominio para esquema, fechas y nombre.
- Pruebas de repositorio para listar, guardar, renombrar, eliminar y aislar usuarios.
- Pruebas de servicio y rutas para autorización y errores.
- Pruebas de cliente para estados vacío, carga, guardado, renombrado y confirmación de borrado.
- E2E móvil: crear → guardar → abrir → conservar compras → renombrar → eliminar.
- Migración aditiva en Supabase sin reset ni eliminación de datos actuales.

