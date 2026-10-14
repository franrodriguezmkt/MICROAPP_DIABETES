# Microapp de recetas para personas con diabetes

## Documento de producto y especificacion funcional v1

Fecha: 14 de octubre de 2026  
Estado: Diseno aprobado para documentacion  
Identificador de proyecto: Microapp de recetas para personas con diabetes. La marca comercial no forma parte de este alcance.

## 1. Resumen ejecutivo

El producto sera una aplicacion web instalable y disenada primero para celulares. Ayudara a personas que buscan organizar su alimentacion compatible con diabetes mediante una biblioteca de recetas, un planificador semanal automatico y una lista de compras consolidada.

No sera una aplicacion de control de glucosa, medicacion o diagnostico. El valor central es ahorrar tiempo y reducir la carga de decidir que cocinar durante la semana.

La primera version utilizara:

- Cloudflare Workers para publicar la aplicacion, ejecutar la logica del servidor y recibir eventos de Hotmart.
- Supabase para autenticacion, base de datos y control de acceso por usuario.
- Hotmart para checkout, cobro y notificaciones de compra, reembolso y contracargo.
- Un proveedor SMTP con plan gratuito para enviar codigos de acceso por correo. La opcion inicial sera Resend, sujeta a validar el dominio antes del lanzamiento.

La aplicacion generara menus mediante reglas deterministas. No usara inteligencia artificial de pago en el MVP.

## 2. Propuesta de valor

Promesa principal:

> Organiza tus comidas de la semana con recetas pensadas para personas con diabetes y genera tu lista de compras en segundos.

Beneficios principales:

- Decidir mas rapido que cocinar.
- Reunir recetas y planificacion en un solo lugar.
- Cambiar una comida sin rehacer manualmente la lista de compras.
- Ajustar cantidades segun el numero de personas.
- Consultar recursos educativos complementarios.

## 3. Publico objetivo

Usuario principal:

- Adulto hispanohablante con diabetes o prediabetes, o familiar que organiza sus comidas.
- Usa principalmente el telefono.
- Llega desde TikTok y espera una experiencia sencilla.
- No necesariamente tiene experiencia con aplicaciones complejas.
- Valora recetas practicas, variedad y una lista de compras clara.

Necesidades de accesibilidad:

- Tipografia legible y controles grandes.
- Contraste suficiente.
- Lenguaje cotidiano.
- Navegacion corta y consistente.
- Evitar depender solamente de colores para comunicar estados.

## 4. Contenido disponible

Se revisaron nueve documentos con un total de 260 paginas:

| Recurso | Paginas | Uso en el producto |
| --- | ---: | --- |
| 10 recetas de desayunos | 25 | Biblioteca de recetas |
| 10 recetas de almuerzos | 46 | Biblioteca de recetas |
| 10 recetas de cenas | 43 | Biblioteca de recetas |
| 10 recetas de postres | 42 | Biblioteca de recetas |
| 5 snacks | 13 | Biblioteca de recetas |
| Manual de intercambio de alimentos | 24 | Recurso educativo y futuras reglas |
| Planeadores mensuales, menu y ejercicios | 14 | Recurso complementario |
| Guia de ejercicios | 23 | Recurso complementario |
| Manual para prevenir el pie diabetico | 30 | Recurso complementario |

La biblioteca inicial contiene 45 recetas. Antes de publicarlas se realizara una auditoria editorial y profesional de ingredientes, porciones, unidades, afirmaciones nutricionales, alergenos y seguridad.

## 5. Alcance del MVP

### Incluido

1. Landing publica orientada a conversion.
2. Checkout externo de Hotmart.
3. Acceso posterior a la compra usando solamente el correo utilizado en Hotmart.
4. Verificacion del correo mediante codigo de un solo uso.
5. Biblioteca de 45 recetas.
6. Categorias, busqueda y filtros basicos.
7. Detalle de receta con ingredientes, porciones y preparacion.
8. Favoritos.
9. Preferencias alimentarias basicas y alimentos excluidos.
10. Generacion automatica de un menu semanal.
11. Sustitucion manual de recetas.
12. Lista de compras consolidada y recalculada.
13. Marcado de productos comprados.
14. Recursos educativos complementarios.
15. Cuenta, cierre de sesion y avisos legales.
16. Habilitacion por compra aprobada y bloqueo por reembolso o contracargo.

### Fuera del MVP

- Registro o interpretacion de glucosa.
- Registro de insulina o medicamentos.
- Recomendacion de dosis.
- Diagnostico o tratamiento.
- Conteo clinico personalizado de carbohidratos.
- Planes caloricos prescritos.
- Chat medico o nutricional.
- Generacion de recetas con inteligencia artificial.
- Aplicaciones nativas separadas para Android e iOS.
- Suscripciones recurrentes, salvo que el modelo comercial cambie posteriormente.

## 6. Navegacion y pantallas

### 6.1 Landing publica

Objetivo: explicar el resultado que obtiene el comprador y llevarlo al checkout.

Secciones:

- Propuesta de valor.
- Demostracion del menu semanal.
- Demostracion de la lista de compras.
- Categorias y ejemplos de recetas.
- Que incluye la compra.
- Como funciona.
- Aviso educativo.
- Preguntas frecuentes.
- Llamadas a la accion hacia Hotmart.

### 6.2 Activar acceso

El usuario escribe solamente el correo utilizado en Hotmart. No se solicita codigo de transaccion.

La respuesta visible sera generica para no revelar si un correo compro o no. Si existe una compra aprobada y activa, Supabase enviara un codigo de un solo uso. Al verificarlo, la cuenta quedara vinculada al permiso de compra.

Estados contemplados:

- Correo con compra aprobada.
- Webhook aun no recibido.
- Correo diferente al usado en Hotmart.
- Compra reembolsada o con contracargo.
- Codigo vencido o incorrecto.
- Codigo solicitado demasiadas veces.

### 6.3 Inicio

- Resumen del menu actual.
- Boton para crear la semana cuando aun no existe.
- Acceso directo a la lista de compras.
- Favoritos recientes.
- Sugerencias editoriales sin promesas medicas.

### 6.4 Recetas

- Busqueda por nombre e ingrediente.
- Categorias: desayuno, almuerzo, cena, snack y postre.
- Filtros basicos: tiempo, favoritos y alimentos excluidos.
- Tarjetas con imagen, titulo, tiempo y porciones.

### 6.5 Detalle de receta

- Imagen.
- Titulo y descripcion breve.
- Porciones ajustables.
- Ingredientes con cantidades recalculadas.
- Preparacion por pasos.
- Etiquetas editoriales validadas.
- Alergenos o advertencias pertinentes.
- Guardar como favorita.
- Agregar o reemplazar en el menu.

### 6.6 Planificador semanal

- Vista de siete dias.
- Tiempos de comida configurados para el MVP.
- Creacion automatica.
- Reemplazo de una receta.
- Regeneracion completa con confirmacion.
- Conservacion del menu mientras el usuario no decida cambiarlo.

### 6.7 Lista de compras

- Ingredientes agregados por el menu semanal.
- Cantidades consolidadas cuando las unidades sean compatibles.
- Agrupacion por categoria de compra.
- Productos marcables como comprados.
- Elementos manuales opcionales.
- Recalculo despues de sustituir una receta.

### 6.8 Recursos

- Manual de intercambio de alimentos.
- Planeadores.
- Guia de ejercicios.
- Prevencion del pie diabetico.

Los recursos se mostraran con advertencias de uso educativo. No se presentaran como instrucciones clinicas personalizadas.

### 6.9 Cuenta

- Correo de acceso.
- Numero de personas.
- Preferencias y exclusiones.
- Cerrar sesion.
- Privacidad, terminos y aviso medico.

## 7. Flujo de compra y acceso

### 7.1 Compra aprobada

1. El visitante llega desde TikTok a la landing.
2. Selecciona comprar y pasa al checkout de Hotmart.
3. Hotmart procesa el pago.
4. Hotmart envia un webhook de compra aprobada a Cloudflare.
5. Cloudflare valida la autenticidad y evita procesar el mismo evento dos veces.
6. Cloudflare guarda o actualiza el permiso asociado al correo normalizado.
7. Hotmart dirige al comprador a la pagina de activacion o le muestra el enlace de acceso.
8. El comprador introduce el correo utilizado al pagar.
9. El sistema envia un codigo de un solo uso a ese correo.
10. Supabase verifica el codigo y crea la sesion.
11. La aplicacion vincula el usuario autenticado con el permiso activo.
12. El usuario completa sus preferencias y entra a la aplicacion.

### 7.2 Reembolso o contracargo

1. Hotmart envia el evento correspondiente.
2. Cloudflare valida el evento.
3. El permiso cambia a estado inactivo.
4. Las rutas privadas rechazan nuevas solicitudes de ese usuario.
5. Los datos del usuario se conservan durante el plazo definido en la politica de privacidad y despues se eliminan o anonimizan.

### 7.3 Compra no reconocida de inmediato

La interfaz pedira esperar unos minutos y volver a intentar. Si persiste, mostrara un canal de soporte y solicitara solamente la informacion minima necesaria. No mostrara si otro correo existe en la base de datos.

## 8. Generacion automatica del menu

La generacion se ejecutara cuando el usuario abra una semana que aun no tiene menu. No es necesario generar menus masivamente cada domingo.

Entradas:

- Recetas activas y aprobadas editorialmente.
- Categoria de cada receta.
- Preferencias del usuario.
- Alimentos excluidos.
- Numero de personas.
- Historial reciente.
- Favoritos como senal opcional, no obligatoria.

Reglas iniciales:

1. Elegir solamente recetas compatibles con las exclusiones declaradas.
2. Respetar la categoria del tiempo de comida.
3. Evitar repetir la misma receta dentro de la semana.
4. Reducir repeticiones respecto de las semanas recientes.
5. Alternar ingredientes principales cuando haya suficiente contenido.
6. Mantener siempre la posibilidad de cambiar una receta.
7. Si no hay suficientes recetas compatibles, informar la limitacion y permitir ampliar filtros.

La seleccion sera reproducible para una semana mientras no se regenere. Un cambio puntual no alterara las demas comidas.

## 9. Lista de compras

Cada ingrediente se almacenara con:

- Nombre canonico.
- Nombre visible.
- Cantidad.
- Unidad.
- Categoria de compra.
- Indicacion opcional.

El consolidado sumara solamente unidades compatibles. Por ejemplo, gramos con gramos y unidades con unidades. Cuando dos recetas describan un ingrediente de forma incompatible, se mostraran lineas separadas antes que producir una cantidad incorrecta.

Al cambiar las porciones o sustituir una receta, la lista se recalculara a partir del menu. Los productos marcados manualmente se conservaran cuando sea posible.

## 10. Arquitectura tecnica

### Componentes

#### Aplicacion web

- Interfaz responsiva y prioritaria para celular.
- PWA instalable.
- Rutas publicas para landing y activacion.
- Rutas privadas para el producto.

#### Cloudflare Workers

- Publicacion del frontend y API ligera.
- Endpoint de webhook de Hotmart.
- Validacion de eventos.
- Orquestacion de permisos.
- Generacion de menus.
- Proteccion contra abuso y limites de solicitudes.

#### Supabase

- Auth con correo y OTP.
- PostgreSQL.
- Row Level Security.
- Sesiones y renovacion de tokens.
- Almacenamiento de preferencias, menus y listas.

#### Hotmart

- Checkout.
- Cobro.
- Correo de confirmacion comercial.
- Webhooks de compra aprobada, reembolso y contracargo.

#### SMTP

- Entrega de OTP y recuperacion de acceso.
- En desarrollo se usara el mecanismo de prueba de Supabase.
- Antes del lanzamiento se configurara un SMTP con dominio validado. Resend ofrece un plan gratuito inicial de 3.000 correos por mes y 100 por dia al momento de redactar este documento.

### Flujo tecnico resumido

```text
TikTok -> Landing en Cloudflare -> Checkout Hotmart
                                      |
                                      v
                             Webhook a Cloudflare
                                      |
                                      v
                            Permiso en Supabase
                                      |
                         Correo -> OTP -> Sesion
                                      |
                                      v
                   Menu semanal -> Lista de compras
```

## 11. Modelo de datos inicial

### profiles

- id: referencia al usuario de Supabase Auth.
- email_normalized.
- household_size.
- onboarding_completed_at.
- created_at y updated_at.

### entitlements

- id.
- purchaser_email_normalized.
- provider: hotmart.
- product_id.
- purchase_id cifrado o identificado de forma no expuesta.
- status: pending, active, refunded, chargeback o revoked.
- user_id cuando el acceso queda vinculado.
- approved_at, revoked_at y updated_at.

Restriccion: una compra solo puede quedar vinculada a un usuario.

### webhook_events

- provider_event_id unico.
- event_type.
- received_at.
- processed_at.
- processing_status.
- hash o referencia segura del contenido necesario para auditoria.

No se conservara indiscriminadamente todo el contenido recibido.

### recipes

- id y slug.
- title.
- description.
- category.
- servings_base.
- prep_minutes y cook_minutes.
- instructions.
- image_path.
- status editorial.
- source_document.

### ingredients

- id.
- canonical_name.
- display_name.
- shopping_category.
- allergen_tags.

### recipe_ingredients

- recipe_id.
- ingredient_id.
- quantity.
- unit.
- preparation_note.

### user_preferences

- user_id.
- excluded_ingredients.
- enabled_meal_types.
- optional_preferences.

### favorites

- user_id.
- recipe_id.
- created_at.

### weekly_plans

- id.
- user_id.
- week_start.
- household_size_snapshot.
- generation_version.
- created_at y updated_at.

### weekly_plan_items

- weekly_plan_id.
- date.
- meal_type.
- recipe_id.
- servings.
- replaced_at opcional.

### shopping_list_items

- weekly_plan_id.
- ingredient_id opcional.
- label.
- quantity y unit.
- category.
- checked.
- source: generated o manual.

## 12. Seguridad y privacidad

- Validar la autenticidad de todos los webhooks de Hotmart.
- Registrar identificadores de evento para impedir reprocesamiento.
- Normalizar correos en servidor.
- No indicar publicamente si un correo realizo una compra.
- Verificar control del correo mediante OTP antes de vincular el permiso.
- Mantener claves administrativas solamente como secretos de servidor.
- Aplicar Row Level Security a todas las tablas de usuario.
- Nunca exponer la clave de servicio de Supabase al navegador.
- Limitar intentos de OTP, activacion y webhook.
- Usar HTTPS en todos los ambientes externos.
- No almacenar tarjetas ni datos completos de pago.
- Recopilar la menor cantidad posible de informacion personal.
- Ofrecer un mecanismo de eliminacion de cuenta y datos.

## 13. Seguridad medica y editorial

El producto es educativo y organizativo. No reemplaza a profesionales de la salud.

Antes del lanzamiento:

- Un nutricionista o profesional competente revisara recetas, porciones y afirmaciones.
- Se verificaran carbohidratos y otros datos solamente si se publican valores numericos.
- Se identificaran alergenos y contraindicaciones generales pertinentes.
- Se eliminaran promesas absolutas como evitar picos o mantener estable la glucosa cuando no exista sustento y contexto suficientes.
- Se aclarara que la respuesta glucemica varia entre personas.
- Los usuarios con tratamiento o condiciones especiales deberan consultar a su equipo de salud.
- Los materiales de ejercicio y cuidado del pie recibiran revision independiente antes de integrarse como contenido destacado.

## 14. Manejo de errores

- Webhook invalido: rechazar, registrar el intento minimo necesario y no modificar permisos.
- Evento duplicado: responder correctamente sin repetir efectos.
- Supabase temporalmente no disponible: reintentar el procesamiento de forma segura.
- Compra aun no sincronizada: mostrar espera y reintento sin revelar datos.
- OTP vencido: permitir solicitar uno nuevo respetando limites.
- Sin recetas suficientes: mantener las elecciones posibles y explicar como ampliar filtros.
- Ingredientes incompatibles: no sumar cantidades dudosas.
- Proyecto gratuito pausado: incluir monitoreo operativo y procedimiento documentado de recuperacion.

## 15. Pruebas y criterios de aceptacion

### Compra y acceso

- Una compra aprobada habilita el correo correcto.
- Un correo sin compra activa no obtiene acceso.
- La interfaz no revela si el correo existe.
- Una compra no puede vincularse a dos usuarios.
- Un reembolso o contracargo bloquea el acceso.
- Un webhook duplicado no duplica datos.

### Menu

- Se crea un solo menu por usuario y semana salvo regeneracion explicita.
- Las exclusiones se respetan.
- No hay duplicados dentro de una semana cuando existe contenido suficiente.
- Cambiar una receta no modifica las demas.
- Cambiar porciones actualiza las cantidades.

### Lista de compras

- Ingredientes compatibles se suman correctamente.
- Unidades incompatibles permanecen separadas.
- Los elementos marcados se guardan.
- El reemplazo de una receta elimina ingredientes anteriores y agrega los nuevos.

### Seguridad

- RLS impide leer o modificar datos de otro usuario.
- Los secretos nunca aparecen en el cliente ni en registros publicos.
- Los endpoints sensibles tienen limites de intentos.
- Se prueban compra, reembolso, contracargo y errores de firma.

### Experiencia

- Las tareas principales funcionan en pantalla movil.
- El usuario puede llegar de compra a primer menu sin instrucciones externas.
- Los estados de carga, vacio y error tienen mensajes claros.

## 16. Medicion del MVP

Indicadores iniciales:

- Porcentaje de compradores que activa el acceso.
- Porcentaje que crea su primer menu.
- Porcentaje que abre la lista de compras.
- Sustituciones de recetas por menu.
- Usuarios que regresan la semana siguiente.
- Solicitudes de soporte por acceso.
- Reembolsos y motivos declarados.

No se incorporara analitica invasiva. Los eventos medidos deberan ser necesarios para mejorar el producto.

## 17. Plan de desarrollo

### Fase 1 - Base tecnica

- Repositorio y estructura del proyecto.
- Ambientes local, preview y produccion.
- Supabase y esquema inicial.
- Autenticacion por OTP.
- Rutas publicas y privadas.

### Fase 2 - Contenido y recetas

- Normalizar las 45 recetas.
- Cargar ingredientes y unidades.
- Construir listado, filtros y detalle.
- Incorporar favoritos.

### Fase 3 - Planificador y compras

- Preferencias.
- Algoritmo semanal.
- Reemplazo de recetas.
- Ajuste de porciones.
- Consolidacion de lista de compras.

### Fase 4 - Venta y permisos

- Landing.
- Producto y checkout en Hotmart.
- Webhook.
- Permisos por correo.
- Reembolso y contracargo.
- SMTP de produccion.

### Fase 5 - Calidad y lanzamiento

- Revision profesional del contenido.
- Avisos legales y privacidad.
- Pruebas funcionales y de seguridad.
- Prueba real de compra y reembolso.
- Dominio propio.
- Monitoreo basico.

## 18. Costos y limites operativos

El MVP puede desarrollarse y probarse con costo de infraestructura cercano a cero.

- Cloudflare Workers Free: 100.000 solicitudes por dia segun la documentacion consultada.
- Supabase Free: 50.000 usuarios activos mensuales, 500 MB de base de datos y 1 GB de archivos segun la documentacion consultada.
- Resend Free: 3.000 correos por mes y 100 por dia segun la pagina de precios consultada.
- Hotmart: sin costo inicial, pero descuenta tarifas de cada venta aprobada.
- Dominio: opcional durante desarrollo y recomendado antes del lanzamiento; es el costo fijo inicial mas probable.

Riesgos del nivel gratuito:

- Supabase puede pausar proyectos gratuitos con baja actividad.
- El correo predeterminado de Supabase no es apto para produccion y tiene restricciones fuertes.
- Al superar 100 correos diarios se necesitara ajustar el metodo de acceso o el plan SMTP.
- Los limites y precios pueden cambiar; se verificaran nuevamente antes del lanzamiento.

## 19. Checklist de lanzamiento

- Contenido revisado por profesional competente.
- Recetas normalizadas y probadas.
- Politica de privacidad publicada.
- Terminos de uso publicados.
- Aviso educativo visible.
- Dominio y HTTPS activos.
- SMTP y remitente validados.
- Compra real aprobada probada.
- Reembolso real o prueba equivalente validada.
- Contracargo manejado en entorno de prueba o simulacion controlada.
- RLS revisada.
- Secretos rotados despues de pruebas iniciales.
- Copia exportable de recetas y datos esenciales.
- Soporte y recuperacion de acceso definidos.
- Analitica minima validada.
- Prueba completa en telefonos Android e iPhone.

## 20. Fuentes tecnicas consultadas

- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/
- Cloudflare workers.dev: https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
- Hotmart Webhook: https://help.hotmart.com/es/article/360001491352/
- Hotmart tarifas: https://help.hotmart.com/es/article/208298448/
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Passwordless: https://supabase.com/docs/guides/auth/auth-email-passwordless
- Supabase SMTP: https://supabase.com/docs/guides/auth/auth-smtp
- Supabase project pausing: https://supabase.com/docs/guides/platform/free-project-pausing
- Supabase pricing: https://supabase.com/pricing
- Resend pricing: https://resend.com/pricing

## 21. Decision final de producto

La primera version sera una microapp de recetas y organizacion semanal. Su centro sera el ciclo:

```text
Elegir preferencias -> Crear menu -> Cambiar recetas -> Generar lista -> Comprar
```

La experiencia de acceso pedira solamente el correo utilizado en Hotmart y un codigo temporal enviado a ese mismo correo. No pedira codigo de transaccion. Esta decision mejora la facilidad de uso sin permitir que el conocimiento de un correo sea suficiente para apropiarse de una compra.
