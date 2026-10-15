# Mi Semana de Recetas: diseno integral de producto, frontend y backend

Fecha: 15 de octubre de 2026

Estado: listo para revision del usuario

Base funcional: `2026-10-14-microapp-recetas-diabetes-design.md`

Base implementada: catalogo y detalle de recetas, PWA, Worker y proteccion de contenido no aprobado

## 1. Resultado que debe entregar esta etapa

Completar la microapp movil de recetas y organizacion semanal sin convertirla en una aplicacion de control clinico diario. El usuario comprador debe poder:

1. Activar su acceso con el correo usado en Hotmart y un codigo temporal enviado a ese mismo correo.
2. Indicar cantidad de personas, comidas habilitadas y alimentos que desea excluir.
3. Recibir una semana organizada con desayuno, almuerzo, cena y snack; el postre queda disponible como categoria de receta y puede agregarse o sustituirse cuando corresponda.
4. Cambiar una receta sin alterar las demas comidas de la semana.
5. Obtener una lista de compras consolidada, marcar articulos y agregar elementos manuales.
6. Consultar las 45 recetas y los recursos educativos que hayan sido revisados y aprobados.

La aplicacion conserva las cinco areas de navegacion ya acordadas: **Semana, Compras, Recetas, Recursos y Cuenta**.

## 2. Alcance y limites

### Incluido

- Renovacion visual completa del shell y de las pantallas existentes.
- Categoria visible **Snack** en filtros, tarjetas y planificacion.
- Experiencia responsiva para telefono, tableta y escritorio.
- Preferencias, favoritos, plan semanal y lista de compras persistentes.
- Autenticacion por correo con OTP.
- Permiso de acceso basado en el correo de compra de Hotmart.
- Revocacion por reembolso o contracargo.
- Landing publica y redireccion al checkout de Hotmart.
- Recursos educativos y avisos legales.
- Despliegues de preview y produccion en Cloudflare.
- Supabase para Auth y datos privados del usuario.
- Documento maestro para generar una imagen coherente por cada una de las 45 recetas en Google Flow.

### No incluido

- Registro de glucosa, insulina, medicamentos, peso o sintomas.
- Diagnostico, prescripcion, calculo de dosis o recomendaciones clinicas personalizadas.
- Chat con inteligencia artificial.
- Suscripcion recurrente en la primera version.
- Panel administrativo complejo.
- Publicacion de contenido que no haya completado la revision editorial y profesional definida.

## 3. Direccion visual aprobada

La interfaz utilizara un lenguaje editorial calido, alimentario y confiable, evitando estetica hospitalaria.

### Identidad

- Simbolo: plato, hoja y referencia sutil a calendario; no se usaran cruces, glucometros ni iconografia clinica.
- Fondo principal crema suave.
- Verde azulado profundo para estructura, navegacion y acciones principales.
- Terracota para acentos y estados destacados.
- Superficies claras con bordes suaves y sombras discretas.
- Titulares con Manrope y texto de interfaz con Inter, usando fuentes locales o una carga que no bloquee la primera vista.
- Iconos SVG de una sola familia, sin emojis estructurales.

### Estructura responsiva

- Telefono: barra inferior fija con las cinco areas; contenido con espacio seguro para que no quede oculto.
- Escritorio: barra lateral persistente con las mismas cinco areas y el mismo orden.
- Tableta: comportamiento adaptativo segun ancho disponible, sin duplicar navegacion.
- Area tactil minima de 44 por 44 pixeles CSS.
- Estados de foco visibles, contraste WCAG AA y soporte para `prefers-reduced-motion`.
- Diseno comprobado a 375 px, orientacion horizontal y ampliacion de texto al 125 %.

### Recetas e imagenes

Los filtros visibles seran: Todas, Desayunos, Almuerzos, Cenas, Snacks y Postres. Las tarjetas mostraran imagen, categoria, titulo, tiempo y porciones. La ausencia de una imagen nunca bloqueara la lectura: se mostrara un placeholder editorial con relacion de aspecto estable.

Cada receta tendra una imagen unica, sin texto incrustado, logotipos, personas ni material medico. Todas compartiran iluminacion natural, paleta calida y encuadre consistente. Los archivos usaran el `slug` de la receta y formatos optimizados WebP/AVIF con alternativa cuando el navegador lo requiera.

## 4. Arquitectura

### Frontend

- React y React Router mantienen la SPA/PWA existente.
- Un cliente de API aislado gestiona sesion, errores y renovacion de tokens.
- El estado remoto se carga por ruta; los estados de formulario permanecen locales salvo cuando deban persistirse.
- Las pantallas privadas comparten un guard que exige sesion valida y permiso activo.
- Las recetas aprobadas se incluyen como contenido versionado y validado durante el build.

### Cloudflare

- Cloudflare Workers publica los archivos estaticos y la API Hono.
- El Worker valida el token de Supabase en cada operacion privada.
- El Worker ejecuta la generacion determinista de semanas y la consolidacion de compras.
- El endpoint de Hotmart valida el secreto configurado, registra la idempotencia y actualiza permisos con credenciales de servidor.
- Secretos de Supabase y Hotmart se almacenan como secretos del Worker y nunca forman parte del bundle del navegador.

### Supabase

- Supabase Auth administra OTP y sesiones.
- PostgreSQL guarda perfil, permiso, preferencias, favoritos, semanas, elementos de semana y lista de compras.
- Row Level Security limita cada fila al usuario autenticado correspondiente.
- Las operaciones administrativas de Hotmart se realizan exclusivamente desde Cloudflare con una clave de servicio.

### Hotmart

- Hotmart mantiene checkout y cobro.
- Los webhooks de compra aprobada, reembolso y contracargo son la fuente de verdad comercial.
- El navegador nunca decide si una compra esta activa.

## 5. Fronteras de datos

### Contenido versionado en el repositorio

- 45 recetas: 10 desayunos, 10 almuerzos, 10 cenas, 5 snacks y 10 postres.
- Ingredientes, pasos, tiempos, porciones base, alergenos, estado editorial y procedencia.
- Metadatos de recursos educativos.
- Rutas de las imagenes optimizadas.

El build de produccion seguira excluyendo cualquier receta cuyo estado no sea `approved`.

### Datos persistentes en Supabase

- `profiles`: correo normalizado, cantidad de personas y estado de onboarding.
- `entitlements`: compra Hotmart, producto, estado, correo comprador y usuario vinculado.
- `webhook_events`: identificador de evento, tipo, estado y marcas de tiempo para idempotencia.
- `user_preferences`: comidas habilitadas, exclusiones y preferencias opcionales.
- `favorites`: usuario y receta.
- `weekly_plans`: usuario, lunes de inicio, porciones y version del generador.
- `weekly_plan_items`: fecha, tipo de comida, receta, porciones y reemplazo.
- `shopping_list_items`: ingrediente o etiqueta, cantidad, unidad, categoria, marcado y origen.

Las referencias a recetas se guardan por identificador estable; no se duplicara en la base el contenido completo de cada receta.

## 6. Activacion y autorizacion

1. Hotmart envia una compra aprobada al webhook de Cloudflare.
2. El Worker valida el evento, lo procesa una sola vez y crea o activa el permiso del correo normalizado.
3. En Activar acceso, el comprador escribe solamente el correo usado al pagar.
4. El Worker responde siempre con un mensaje generico.
5. Si existe un permiso activo, el sistema crea el usuario cuando sea necesario y solicita a Supabase el envio del OTP.
6. El usuario escribe el codigo recibido y Supabase crea la sesion.
7. Una funcion protegida vincula el permiso activo con ese usuario. Un permiso no puede vincularse a dos usuarios distintos.
8. Cada llamada privada valida sesion y permiso activo.
9. Un reembolso, contracargo o revocacion cambia el permiso y bloquea el acceso privado.

Se aplicaran limites de frecuencia por correo anonimizado y por origen a la solicitud y verificacion de OTP. La interfaz no revelara si un correo compro, existe o esta registrado.

## 7. Planificador semanal

### Tipos de comida

- Desayuno.
- Almuerzo.
- Cena.
- Snack.

Postre permanece como categoria independiente del catalogo. No se insertara automaticamente todos los dias para no sobrecargar el plan; el usuario podra elegirlo al reemplazar o agregar una opcion cuando la interfaz lo permita.

### Generacion

- Se genera solo cuando el usuario abre una semana vacia o confirma una regeneracion.
- La seleccion es determinista para usuario, semana y version del algoritmo.
- Solo usa recetas aprobadas, compatibles con las exclusiones y pertenecientes al tipo de comida solicitado.
- Evita repetir la misma receta dentro de la semana.
- Reduce repeticiones recientes y alterna ingredientes principales cuando hay inventario suficiente.
- Si faltan opciones compatibles, conserva lo que puede construir y explica que preferencia limita el resultado.
- Reemplazar una comida modifica solo ese elemento.
- Cambiar el numero de personas recalcula porciones y compras, previa confirmacion cuando ya existe una semana.

## 8. Lista de compras

- Se deriva de los elementos actuales del plan, no de una copia manual de recetas.
- Suma cantidades solo cuando ingrediente canonico y unidad sean compatibles.
- Mantiene separadas cantidades incompatibles o expresiones como “al gusto”.
- Agrupa por categoria de compra.
- Guarda el estado marcado de cada linea generada mediante una clave estable.
- Conserva los articulos manuales al regenerar.
- Al reemplazar una receta, elimina su contribucion anterior y agrega la nueva sin alterar compras manuales.

## 9. Contrato inicial de API

- `GET /api/health`: estado tecnico.
- `POST /api/access/request`: solicitud generica de OTP para correo elegible.
- `GET /api/me`: perfil y permiso activo del usuario autenticado.
- `PATCH /api/me/preferences`: preferencias y cantidad de personas.
- `GET /api/favorites`: favoritos propios.
- `PUT /api/favorites/:recipeId`: agregar favorito.
- `DELETE /api/favorites/:recipeId`: quitar favorito.
- `GET /api/weeks/:weekStart`: recuperar o generar la semana.
- `POST /api/weeks/:weekStart/regenerate`: regenerar con confirmacion del cliente.
- `PUT /api/weeks/:weekStart/items/:itemId`: reemplazar receta o cambiar porciones.
- `GET /api/weeks/:weekStart/shopping-list`: lista consolidada.
- `PATCH /api/weeks/:weekStart/shopping-list/:itemId`: marcar o editar elemento permitido.
- `POST /api/weeks/:weekStart/shopping-list`: agregar elemento manual.
- `DELETE /api/weeks/:weekStart/shopping-list/:itemId`: eliminar elemento manual.
- `POST /api/webhooks/hotmart`: compra, reembolso y contracargo.

Las rutas privadas exigen `Authorization: Bearer <token>`. Los errores usan un formato estable con `code`, `message` seguro y `requestId`; los detalles internos se registran solo en servidor.

## 10. Pantallas y estados

### Publicas

- Landing.
- Activar acceso.
- Verificar codigo.
- Privacidad, terminos y aviso educativo.

### Privadas

- Semana: vacia, generando, lista, parcial por falta de opciones y error recuperable.
- Compras: agrupada, vacia, guardando y sin conexion.
- Recetas: carga, resultados, sin resultados y detalle inexistente.
- Recursos: disponible, pendiente de revision y descarga fallida.
- Cuenta: onboarding, preferencias, soporte, cierre de sesion y eliminacion de cuenta.

Ningun error tecnico mostrara secretos, consultas SQL, estado de compra de terceros ni detalles del webhook.

## 11. Trabajo dividido en incrementos

### Incremento A: sistema visual y navegacion

- Tokens, tipografia, iconos y marca.
- Shell responsivo y estados accesibles.
- Rediseño de catalogo y detalle.
- Snack visible en todos los filtros pertinentes.
- Placeholders y contrato para imagenes de Flow.

### Incremento B: planificador y compras

- Dominio de preferencias, semanas y consolidacion.
- API y persistencia en un repositorio intercambiable.
- Semana, reemplazo, porciones y compras completas.
- Pruebas deterministas del algoritmo y de unidades.

### Incremento C: Supabase, acceso y Hotmart

- Migraciones, RLS, Auth y OTP.
- Guards privados.
- Webhook idempotente.
- Activacion, reembolso y contracargo.
- Limites de frecuencia y auditoria segura.

### Incremento D: landing, recursos y lanzamiento

- Landing conectada al checkout.
- Recursos aprobados.
- Terminos, privacidad y aviso educativo.
- Dominio, SMTP, analitica minima y pruebas reales de compra/reembolso.

Cada incremento se integra solo cuando sus pruebas unitarias, de contrato y de navegador estan verdes. La ausencia temporal de credenciales externas se resuelve con adaptadores falsos verificables; no se hardcodean secretos ni se simula que una integracion real ya fue validada.

## 12. Estrategia de pruebas

- Dominio: elegibilidad de recetas, determinismo, exclusiones, repeticiones, porciones y unidades.
- API: autenticacion, autorizacion, validacion, idempotencia y errores genericos.
- Base de datos: migraciones y politicas RLS que impiden acceso cruzado.
- Componentes: estados de carga, vacio, error, seleccion y guardado.
- Navegador: activar acceso, completar onboarding, generar semana, reemplazar, marcar compras y cerrar sesion.
- Hotmart: compra aprobada, evento duplicado, firma invalida, reembolso y contracargo.
- Visual: 375 px, tableta, escritorio, paisaje, texto al 125 %, teclado y movimiento reducido.
- Produccion: verificacion automatica de que ninguna receta no aprobada aparezca en el bundle.

## 13. Criterios de terminacion

La aplicacion estara lista para lanzamiento cuando:

- Las cinco categorias de recetas, incluida Snack, sean visibles y correctas.
- Un comprador pueda pasar de Hotmart al primer plan semanal usando solo correo y OTP.
- Un no comprador no pueda leer ni modificar datos privados.
- La semana y las compras persistan entre dispositivos del mismo usuario.
- Reemplazos y cambios de porciones recalculen la compra correctamente.
- Reembolso y contracargo revoquen el permiso.
- Las 45 recetas permanezcan ocultas en produccion hasta su aprobacion individual.
- La interfaz cumpla los controles de accesibilidad y respuesta definidos.
- Las pruebas automatizadas y el recorrido real de compra/reembolso hayan sido ejecutados con evidencia.
- Haya instrucciones de recuperacion, exportacion y rotacion de secretos.

## 14. Decisiones cerradas

- Producto: organizador de recetas, semana y compras; no control medico diario.
- Acceso: correo de compra y OTP; no se pide codigo de transaccion.
- Infraestructura: Cloudflare + Supabase + Hotmart, priorizando niveles gratuitos.
- Navegacion: Semana, Compras, Recetas, Recursos y Cuenta.
- Categorias: desayuno, almuerzo, cena, snack y postre.
- Imagenes: una por receta, generadas externamente con un prompt maestro de Google Flow.
- Implementacion: incrementos pequenos, verificables y desplegables sobre la base existente.
