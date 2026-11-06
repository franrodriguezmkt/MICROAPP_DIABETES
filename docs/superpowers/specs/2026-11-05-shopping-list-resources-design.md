# Compras inteligentes y biblioteca de recursos

Fecha: 5 de noviembre de 2026  
Estado: aprobado para implementación por continuidad del producto

## Objetivo

Convertir la lista derivada de la semana en una lista de supermercado breve y editable, y publicar los cuatro PDF educativos ya entregados por el propietario del producto.

## Compras

- La lista agrupa ingredientes mediante una identidad de compra distinta de la identidad editorial de la receta. Por ejemplo, `spinach`, `spinach-or-arugula`, `leafy-greens` y `mixed-greens` se muestran como una sola familia de hojas verdes.
- Las cantidades con unidades compatibles se convierten antes de sumarse: gramos/kilogramos, mililitros/litros y taza/cucharada/cucharadita. No se suman unidades con dimensiones incompatibles.
- `al gusto` no crea una segunda línea cuando ya existe una cantidad medida de la misma familia; la línea indica `+ al gusto`.
- Las cantidades calculadas se presentan como aproximadas porque provienen de porciones y equivalencias culinarias.
- Cada línea generada conserva una clave estable por familia y dimensión para sostener marcado, edición y eliminación.
- El usuario puede editar nombre, cantidad y unidad de una línea generada. La edición se guarda como una personalización de esa semana y no modifica las recetas fuente.
- Eliminar una línea generada la oculta de esa semana. La supresión se conserva en Supabase aunque la lista se regenere; si la familia deja de formar parte del menú, su marca desaparece naturalmente con la lista reconstruida.
- Los productos manuales siguen pudiendo agregarse, editarse y eliminarse.

## Persistencia

Las líneas generadas incorporan `customized`, `hidden` e `includesToTaste`. Supabase añade columnas equivalentes y las funciones de snapshot las incluyen. La lectura pública de Compras filtra las líneas ocultas, mientras que la reconstrucción interna conserva sus marcas.

## Interacción móvil

- Los botones Editar y Quitar tienen objetivos táctiles de al menos 44 px y nombres accesibles.
- La edición ocurre en la misma fila mediante campos etiquetados; Guardar y Cancelar son visibles.
- Los errores se anuncian cerca de la lista y no destruyen el estado anterior.
- No se depende de gestos, hover ni iconos sin etiqueta.

## Recursos

Se publican como descargas locales del mismo origen:

1. Manual de intercambio de alimentos.
2. Planeadores de menú y actividad.
3. Guía de ejercicios para personas con diabetes.
4. Manual para prevenir el pie diabético.

La interfaz los identifica como material educativo original del producto, no como consejo individual ni revisión clínica. Mantiene un aviso visible para consultar indicaciones personales con profesionales y actuar ante señales de alarma.

## Criterios de aceptación

- Una semana que contiene espinaca medida, espinaca `al gusto` y hojas verdes mixtas produce una sola línea compatible y legible.
- Aceite expresado en cucharaditas y cucharadas se consolida sin perder cantidad.
- Las unidades incompatibles permanecen separadas en vez de usar una conversión inventada.
- Una edición generada sobrevive a reconstruir la semana; una línea quitada no reaparece.
- Los cuatro PDF existen en `public/resources`, superan la validación del build y descargan desde Recursos.
- La lista funciona a 375 px sin desplazamiento horizontal y con navegación por teclado.

