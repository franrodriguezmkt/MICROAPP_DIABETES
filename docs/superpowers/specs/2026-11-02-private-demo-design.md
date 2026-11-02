# Diseño: demostración privada de Mi Semana de Recetas

## Intención

Dar al propietario una instancia separada donde pueda recorrer y evaluar la aplicación completa antes de terminar Brevo y el acceso comercial. La demostración sirve para detectar cambios de producto, grabar videos y revisar la experiencia sin crear compras, usuarios o permisos reales.

## Objetivos

- Publicar un Worker de Cloudflare distinto del Worker comercial.
- Permitir el ingreso mediante un enlace secreto largo, sin Hotmart, Supabase Auth ni Brevo.
- Mostrar de forma permanente que se está usando el modo demostración.
- Habilitar Semana, Compras, Recetas, Recursos y Cuenta con datos exclusivamente de demostración.
- Conservar los cambios de prueba durante la sesión de evaluación y permitir restablecerlos.
- Mantener completamente intactos el checkout, webhook, base de compradores y autenticación de producción.

## No objetivos

- No crear una prueba gratuita pública ni un flujo de captación.
- No compartir datos entre la demostración y la aplicación comercial.
- No usar la demostración como sustituto del ensayo real de compra, OTP y reembolso.
- No publicar como contenido clínicamente aprobado recetas o recursos todavía pendientes de revisión.

## Alternativas consideradas

1. **Worker de demostración separado con enlace secreto (seleccionada).** Aísla despliegue, datos y autenticación; exige mantener una configuración adicional de Cloudflare.
2. **Ruta secreta dentro del Worker comercial.** Requiere menos despliegue, pero mezcla una puerta de demostración con compradores reales y aumenta el impacto de una configuración incorrecta.
3. **Cloudflare Access por correo.** Ofrece mayor control de identidad, pero añade otra autenticación por correo antes de que Brevo esté listo y hace más lenta la revisión cotidiana.

Se selecciona la primera alternativa porque la prioridad es poder revisar libremente la aplicación sin reducir la seguridad del producto comercial.

## Diseño de acceso

- La demostración tendrá un nombre de Worker propio y una URL `workers.dev` distinta.
- Cloudflare guardará una clave aleatoria larga como secreto `DEMO_ACCESS_TOKEN`; nunca se incluirá en Git, variables `VITE_*`, el bundle del navegador ni registros.
- El primer ingreso utilizará `/?demo_token=<secreto>`. El Worker comparará el valor en tiempo constante y, si coincide, emitirá una cookie `HttpOnly`, `Secure`, `SameSite=Strict` con duración limitada y redirigirá a una URL limpia sin el token.
- Las peticiones posteriores necesitarán esa cookie. Sin ella, el Worker responderá con una pantalla neutra de acceso privado; no mostrará la landing comercial ni las pantallas internas.
- La cookie estará firmada con un segundo secreto `DEMO_SESSION_SECRET`; no almacenará el token de acceso original.

## Aplicación de demostración

- Un build explícito `demo` habilitará el cliente de autenticación simulado ya existente. La condición será de compilación y solo se usará para el Worker de demostración.
- Al abrir la instancia autorizada, se creará automáticamente la sesión simulada y se entrará en `/semana`; el propietario no tendrá que escribir correo ni código.
- Un banner persistente dirá `Modo demostración · datos de prueba` y ofrecerá `Restablecer demo`.
- El planificador usará un repositorio de demostración aislado. Los cambios no escribirán en Supabase ni ejecutarán webhooks.
- La demostración podrá mostrar el catálogo editorial pendiente únicamente dentro del Worker protegido. El build comercial continuará excluyéndolo.
- Los datos de Semana y Compras se conservarán durante la vida del proceso del Worker y en el navegador cuando corresponda; el botón de restablecimiento devolverá el estado a su semilla inicial. No se promete almacenamiento permanente entre despliegues.

## Configuración y despliegue

- Añadir una configuración de Cloudflare específica para la demostración, con nombre distinto y sin los secretos de producción de Supabase o Hotmart.
- Añadir comandos separados de build y deploy; el comando comercial actual seguirá apuntando exclusivamente a `mi-semana-de-recetas`.
- El build de demostración fallará si no está marcado explícitamente como demo o si intenta reutilizar el nombre del Worker comercial.
- La documentación registrará cómo rotar el enlace: reemplazar ambos secretos, desplegar, verificar el nuevo enlace y dejar de usar el anterior.

## Seguridad y fallos

- Token ausente o incorrecto: `404` o pantalla neutra, sin revelar qué parte falló.
- Cookie manipulada o vencida: se elimina y vuelve a pedir el enlace secreto.
- Ninguna respuesta, log o mensaje de error incluirá el token.
- El reinicio de la demo no puede llamar a rutas de producción ni borrar datos de Supabase.
- La URL secreta no se colocará en la landing, Hotmart, GitHub ni materiales públicos.

## Verificación

- Pruebas unitarias del intercambio token-cookie, expiración, manipulación y comparación segura.
- Pruebas de que el Worker comercial rechaza cualquier modo demo.
- Recorrido de navegador: enlace secreto → Semana → cambio de receta → Compras → recarga → restablecimiento.
- Comprobación del bundle para confirmar que los secretos no aparecen.
- Smoke test independiente de la URL comercial y la URL privada antes de entregar el enlace.

