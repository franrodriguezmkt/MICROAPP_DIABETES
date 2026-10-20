# Activación de Supabase, Hotmart y Cloudflare

## Estado de esta integración

El recorrido automatizado usa adaptadores deterministas y **no representa una compra real**. La activación real queda completa únicamente después de aplicar la migración a un proyecto Supabase de desarrollo, configurar los secretos del Worker y ensayar una compra aprobada y un reembolso desde Hotmart.

## 1. Preparar Supabase

1. Crear un proyecto de desarrollo en Supabase.
2. Guardar por separado la URL del proyecto, la clave publicable y la clave `service_role`. La clave `service_role` nunca puede llegar al navegador.
3. Vincular este repositorio y revisar la migración antes de aplicarla:

   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <PROJECT_REF>
   pnpm exec supabase db push --dry-run
   pnpm exec supabase db push
   ```

4. En Authentication, mantener habilitado el acceso por correo.
5. En la plantilla **Magic Link / OTP**, mostrar el código con `{{ .Token }}`. Esta app espera seis dígitos en `/verificar`; no usa enlaces mágicos ni pide el código de transacción al comprador.
6. En URL Configuration, establecer como Site URL la URL pública del Worker y permitir, como mínimo:

   - `http://127.0.0.1:4173/**` para desarrollo local.
   - `https://<worker>.workers.dev/**` para el primer despliegue.
   - `https://<dominio-propio>/**` cuando se conecte el dominio final.

La migración versionada es `supabase/migrations/202610190001_access_planner_schema.sql`. Para probarla localmente hace falta Docker activo y se ejecuta `pnpm test:db`. No ejecutar `db reset --linked` contra producción.

## 2. Configurar variables sin exponer secretos

Copiar `.env.example` a `.env.local`. El navegador recibe solamente:

```dotenv
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Copiar `.dev.vars.example` a `.dev.vars` para el Worker local. En Cloudflare, cargar cada valor del servidor como secreto:

```bash
pnpm exec wrangler secret put SUPABASE_URL
pnpm exec wrangler secret put SUPABASE_PUBLISHABLE_KEY
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY
pnpm exec wrangler secret put HOTMART_HOTTOK
pnpm exec wrangler secret put HOTMART_PRODUCT_UCODE
pnpm exec wrangler secret put ACCESS_RATE_LIMIT_PEPPER
```

`ACCESS_RATE_LIMIT_PEPPER` debe ser un valor aleatorio largo. No copiar secretos en GitHub, capturas, logs o variables `VITE_*`. El build comprueba que los nombres y valores disponibles de `service_role` y Hottok no aparezcan en los recursos del navegador.

## 3. Configurar Hotmart Webhook 2.0

1. Crear la configuración de webhook para el producto correcto.
2. Usar la URL `https://<host>/api/webhooks/hotmart`.
3. Seleccionar estos eventos:

   - `PURCHASE_APPROVED`
   - `PURCHASE_COMPLETE`
   - `PURCHASE_REFUNDED`
   - `PURCHASE_CHARGEBACK`

4. Copiar el `ucode` exacto del producto a `HOTMART_PRODUCT_UCODE`.
5. Copiar el Hottok a `HOTMART_HOTTOK`. El Worker valida el encabezado `X-HOTMART-HOTTOK` antes de leer o procesar el evento.

Los eventos aprobados/completados activan el correo de compra; reembolso y contracargo lo revocan. El identificador del evento evita duplicados y la fecha de creación impide que un evento viejo sobrescriba uno más reciente.

## 4. Ensayo real obligatorio antes del lanzamiento

Registrar identificadores y horas, nunca secretos ni el correo completo del comprador.

- [ ] Aplicar la migración al Supabase de desarrollo y confirmar las políticas RLS.
- [ ] Desplegar el Worker con los seis secretos.
- [ ] Enviar una compra de prueba firmada desde Hotmart y comprobar respuesta `204`.
- [ ] Solicitar el código usando el mismo correo de compra y verificar el OTP real.
- [ ] Crear preferencias, generar una semana, cambiar una receta y marcar/agregar una compra.
- [ ] Recargar y confirmar que semana y compras persisten.
- [ ] Reenviar el mismo evento y confirmar que no duplica ni cambia el estado.
- [ ] Emitir el reembolso/contracargo y confirmar que las rutas privadas responden `403` y la interfaz muestra Cuenta con acceso inactivo.

Consultas de auditoría útiles en Supabase, restringidas al entorno de desarrollo:

```sql
select event_id, event_type, event_created_at, processed_at
from public.webhook_events
order by processed_at desc
limit 20;

select status, product_ucode, updated_at
from public.entitlements
order by updated_at desc
limit 20;
```

## 5. Repetición, rotación y recuperación

- **Repetir un webhook:** reenviar el mismo payload conserva la idempotencia por `event_id`. Si falla con `503`, corregir la conexión/secretos y repetirlo desde Hotmart.
- **Rotar secretos:** reemplazar el valor con `wrangler secret put`, desplegar y probar; después invalidar el anterior. Si se rota Hottok, actualizar Hotmart y Cloudflare en una ventana coordinada.
- **Desactivar temporalmente:** retirar la configuración del webhook en Hotmart o volver al despliegue anterior de Cloudflare. No borrar tablas ni usuarios.
- **Revertir base de datos:** crear una migración nueva de avance que deshaga el cambio revisado. No editar una migración ya aplicada ni resetear una base remota con datos.
- **Revocar una prueba:** procesar el reembolso real o actualizar únicamente el registro de prueba identificado, conservando `webhook_events` como auditoría.

## Referencias operativas

- [Plantillas de correo y `{{ .Token }}`](https://supabase.com/docs/guides/auth/auth-email-templates)
- [URLs permitidas de Supabase Auth](https://supabase.com/docs/guides/auth/redirect-urls)
- [Flujo de migraciones de Supabase](https://supabase.com/docs/guides/local-development/cli-workflows)
- [Webhooks de compra Hotmart 2.0](https://developers.hotmart.com/docs/en/2.0.0/webhook/purchase-webhook/)
