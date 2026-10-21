# Brevo como SMTP de Supabase Auth

Estado: **elegido para lanzamiento, todavía no activado**.

Brevo no reemplaza a Hotmart ni genera los códigos de acceso. Hotmart confirma la compra; Supabase genera y verifica el OTP; Brevo actúa únicamente como el servidor SMTP que entrega el correo de Supabase al comprador.

La app no contiene una dependencia de Brevo. Si en el futuro cambia el proveedor, solo se reemplaza la configuración SMTP de Supabase.

## Por qué se eligió

Al 21 de octubre de 2026, la documentación oficial de Brevo indica que su plan gratuito incluye hasta 300 envíos por día, acceso al relay SMTP y no tiene vencimiento. Es un límite operativo, no una garantía contractual; debe revisarse nuevamente antes del lanzamiento.

- [Límites vigentes del plan gratuito de Brevo](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan)
- [Enviar correos transaccionales mediante Brevo SMTP](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP)
- [SMTP personalizado de Supabase Auth](https://supabase.com/docs/guides/auth/auth-smtp)

## Momento correcto para activarlo

Completar esta configuración cuando se haya decidido el dominio final del producto. Mientras tanto, el subdominio gratuito `workers.dev` sigue alojando la aplicación, pero no sirve como dominio de correo propio.

Para producción conviene separar la reputación del correo de acceso, por ejemplo:

```text
Aplicación: app.dominio-elegido.com
Remitente OTP: acceso@auth.dominio-elegido.com
```

No comprar ni conectar un dominio solamente para avanzar el desarrollo. Esta es una puerta de lanzamiento.

## 1. Preparar el remitente en Brevo

1. Crear o abrir la cuenta de Brevo que administrará el producto.
2. Ir a la configuración de remitentes y dominios.
3. Agregar el dominio o subdominio elegido para autenticación.
4. Copiar exactamente los registros DNS que Brevo muestre para DKIM y los demás controles recomendados.
5. Crear esos registros en Cloudflare DNS sin modificar otros registros existentes.
6. Esperar la verificación de Brevo y confirmar que el remitente aparece autenticado.
7. Crear el remitente, por ejemplo `Mi semana de recetas <acceso@auth.dominio-elegido.com>`.

No inventar registros DNS ni copiar valores de otra cuenta: se usan únicamente los que Brevo genere para este dominio.

## 2. Crear la credencial SMTP

1. En Brevo, abrir **SMTP & API**.
2. Crear una clave SMTP dedicada a Supabase, con un nombre reconocible como `supabase-mi-semana`.
3. Guardar la clave en un gestor seguro durante la configuración. Brevo puede mostrarla una sola vez.
4. No guardar la clave en Git, `.env`, variables `VITE_*`, Cloudflare ni capturas.

Datos esperados:

```text
Host: smtp-relay.brevo.com
Puerto: 587
Usuario: el login SMTP mostrado por Brevo
Contraseña: la clave SMTP dedicada
Remitente: acceso@auth.dominio-elegido.com
Nombre: Mi semana de recetas
```

Antes de pegarlos, confirmar los valores vigentes en la propia cuenta de Brevo.

## 3. Conectar Brevo en Supabase

1. Abrir el proyecto correcto en Supabase.
2. Ir a **Authentication → Emails → SMTP Settings**.
3. Habilitar SMTP personalizado.
4. Completar remitente, nombre, host, puerto, usuario y contraseña con los datos de Brevo.
5. Guardar sin copiar la clave a ninguna otra configuración de la aplicación.
6. Revisar **Authentication → Rate Limits**. Mantener un límite conservador para evitar abuso y no superar el cupo diario de Brevo.

La clave SMTP queda en Supabase. El navegador y el Worker nunca deben recibirla.

## 4. Configurar el código de seis dígitos

En la plantilla de correo que Supabase utiliza para Magic Link / OTP:

- Asunto recomendado: `Tu código para Mi semana de recetas`.
- Mostrar el código con `{{ .Token }}`.
- Explicar que vence y que no debe compartirse.
- Evitar promociones, imágenes pesadas y enlaces innecesarios.
- No usar `{{ .ConfirmationURL }}` como acción principal: esta aplicación espera que el usuario escriba seis dígitos en `/verificar`.

Ejemplo mínimo:

```html
<h2>Tu código de acceso</h2>
<p>Escribe este código en Mi semana de recetas:</p>
<p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">{{ .Token }}</p>
<p>Si no solicitaste este correo, puedes ignorarlo.</p>
```

## 5. Verificación obligatoria

- [ ] Enviar un OTP a un correo externo que no pertenezca al equipo de Supabase.
- [ ] Confirmar que el remitente, SPF/DKIM y contenido aparecen correctamente.
- [ ] Verificar que el código tiene seis dígitos y crea una sesión válida.
- [ ] Probar código incorrecto, vencido y reenvío.
- [ ] Revisar en Brevo entrega, rebote y motivo de rechazo sin almacenar el OTP.
- [ ] Ejecutar una compra real, activar con el correo de compra y conservar una semana.
- [ ] Ejecutar un reembolso controlado y verificar que la aplicación devuelve acceso inactivo.

Registrar fechas, identificadores técnicos y resultado. No registrar la clave SMTP, el OTP ni el correo completo del comprador.

## Recuperación y rotación

- **Credencial comprometida:** crear una nueva clave SMTP, cambiarla en Supabase, probar un OTP y recién después revocar la anterior.
- **Entregas demoradas:** revisar el estado del dominio, los registros DNS, los límites de Supabase y la cola transaccional de Brevo.
- **Cupo diario agotado:** no omitir la verificación ni enviar códigos desde el navegador; reducir reintentos, revisar abuso y evaluar el plan o un proveedor alternativo.
- **Falla prolongada:** pausar temporalmente nuevas activaciones o cambiar Supabase a un SMTP de respaldo previamente probado. El SMTP predeterminado de Supabase no es un respaldo válido para compradores externos.
