# Gestión de mesas — web-clientes

| | |
|---|---|
| **Issue** | [#6](https://github.com/DiegoEstela/claude-code-course/issues/6) |
| **Estado** | Borrador |
| **Autor de la issue** | @DiegoEstela |
| **Fecha** | 2026-10-08 |
| **Etiquetas** | `feature`, `proyecto:api`, `proyecto:web-admin`, `proyecto:web-empleados`, `proyecto:web-clientes` |

> Plan 3 de 4 ([api](6-feat-gestion-de-mesas-api.md) · [admin](6-feat-gestion-de-mesas-admin.md) · clientes · [empleados](6-feat-gestion-de-mesas-empleados.md)). Depende del plan de la API (tareas 1-11).

## 1. Contexto

Hoy el cliente elige restaurante (`/restaurants`) y entra directamente a la carta (`/restaurants/:id`); el pedido se envía con `tableId: null`. La issue pide un paso intermedio: indicar el número de personas, ver las mesas libres con capacidad suficiente, elegir una y al pulsar "Continuar" ocuparla y pasar a la carta para enviar el pedido a cocina y barra. La issue no tiene comentarios.

## 2. Alcance

**Incluido**
- Pantalla de selección de mesa entre la lista de restaurantes y la carta.
- Guardar la mesa elegida en el estado del cliente y enviarla como `tableId` en el pedido.

**Excluido**
- Liberar la mesa desde el cliente (la gestionan los empleados).
- Tests de frontend: no existen; verificación con build y prueba manual.

## 3. Comportamiento esperado

### 3.1 Elegir personas
**Dado** un cliente que pulsa un restaurante en `/restaurants`
**Cuando** llega a `/restaurants/:id/tables`
**Entonces** ve un campo "¿Cuántas personas sois?" (entero ≥ 1) y, al indicarlo, la lista de mesas libres con capacidad suficiente (número, descripción, capacidad).

### 3.2 Elegir mesa y continuar
**Cuando** selecciona una mesa y pulsa "Continuar"
**Entonces** se llama a `occupy`, la mesa queda ocupada y navega a `/restaurants/:id` (la carta) con la mesa guardada.

### 3.3 Sin mesas o mesa tomada
**Dado** que no hay mesas libres para ese número de personas
**Entonces** ve "No hay mesas disponibles para X personas".
**Dado** que otro cliente tomó la mesa antes (409)
**Entonces** ve un aviso y la lista se recarga.

### 3.4 Enviar pedido
**Cuando** confirma el pedido en el carrito
**Entonces** se envía con el `tableId` elegido. Si entra a la carta sin mesa, vuelve a `/restaurants/:id/tables`.

## 4. Diseño técnico

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `packages/web-clientes/src/app/core/models/table.model.ts` | Nuevo — `Table` |
| `packages/web-clientes/src/app/core/services/table.service.ts` | Nuevo — `getAvailable`, `occupy` |
| `packages/web-clientes/src/app/core/store/cart.store.ts` | Guarda `tableId`/`tableNumber` |
| `packages/web-clientes/src/app/features/tables/table-select.component.ts` | Nuevo — pantalla |
| `packages/web-clientes/src/app/app.routes.ts` | Ruta `restaurants/:id/tables` |
| `packages/web-clientes/src/app/features/restaurants/restaurant-list.component.ts` | El enlace apunta a la selección de mesa |
| `packages/web-clientes/src/app/features/menu/restaurant-menu.component.ts` | Redirige si no hay mesa; muestra "Mesa N" |
| `packages/web-clientes/src/app/core/services/order.service.ts`, `features/cart/cart.component.ts` | Envía `tableId` |

### Enfoque

Estilo de `web-clientes`: modelos y servicios en `core/`, componente que llama al service con `.subscribe()` y estado local con signals; solo `CartStore` es store. Se extiende `CartStore` (como ya guarda `restaurantId`) en lugar de crear otro store. La mesa se reinicia si cambia el restaurante o tras confirmar el pedido.

### Modelo de datos / contratos

`GET /public/restaurants/:id/tables/available?people=N` y `POST /restaurants/:id/tables/:tableId/occupy` `{ people }` (ver plan API). `OrderService.createOrder(restaurantId, tableId, items)`.

## 5. Casos borde y errores

| Situación | Comportamiento esperado |
|---|---|
| `people` vacío o < 1 | No se consulta; botón "Continuar" deshabilitado |
| 409 al ocupar | Aviso "La mesa ya no está disponible" y recarga la lista |
| Error de red | Mensaje de error con reintento |
| Cambio de restaurante con mesa elegida | Se descarta la mesa del restaurante anterior |
| Recarga de página en la carta | `CartStore` es memoria: se pierde la mesa y se vuelve a la selección (la mesa quedó ocupada; la libera el personal) |

## 6. Plan de implementación

Cada tarea: 5-10 min, compila tras cada una. Verificación base: `npm run build -w @resttek/web-clientes`.

1. [x] **Modelo y service** — `table.model.ts`, `table.service.ts`. Verificación: build.
2. [x] **`CartStore` con mesa** — `tableId`, `tableNumber`, `setTable`, `clearTable`; se limpia al cambiar de restaurante. Verificación: build.
3. [x] **Componente: personas y listado** — input de personas y carga de mesas disponibles, con estados vacío/error. Verificación: build + manual.
4. [x] **Selección y "Continuar"** — selección, `occupy`, guardado en `CartStore`, navegación a la carta, manejo del 409. Verificación: manual con dos sesiones.
5. [x] **Ruta y enlace** — ruta en `app.routes.ts` y cambio del enlace en `restaurant-list`. Verificación: manual.
6. [x] **Carta exige mesa** — redirección si no hay mesa y cabecera "Mesa N". Verificación: abrir `/restaurants/:id` directamente.
7. [x] **Pedido con `tableId`** — `OrderService.createOrder` y `cart.component.ts` envían la mesa; se limpia tras confirmar. Verificación: manual, comprobar `GET /orders/mine`.

## 7. Criterios de aceptación

- [ ] El cliente indica el nº de personas y solo ve mesas libres con capacidad suficiente.
- [ ] Al pulsar "Continuar", la mesa pasa a ocupada y se accede a la carta.
- [ ] No se puede llegar a la carta sin mesa elegida.
- [ ] El pedido enviado a cocina y barra lleva el `tableId`.
- [ ] Si la mesa se ocupa antes, se informa y se refresca.
- [ ] `npm run build -w @resttek/web-clientes` pasa.

### Tests

- **Unitarios:** sin infraestructura en frontends; fuera de alcance.
- **Integración / E2E:** manual con API y `npm run seed`.

## 8. Impacto y riesgos

- **Retrocompatibilidad:** cambia el flujo de entrada a la carta (ahora pasa por mesa).
- **Rendimiento:** una consulta al escribir/confirmar personas; sin polling.
- **Seguridad:** `occupy` requiere sesión de cliente; la API valida la disponibilidad.
- **Operación:** ninguna.

## 9. Suposiciones y preguntas abiertas

**Suposiciones**
- La mesa se recuerda solo en memoria de la sesión.
- Se muestran las mesas ordenadas por capacidad ascendente (la más ajustada primero).

**Preguntas abiertas**
- ¿Debe persistirse la mesa (localStorage) para sobrevivir a una recarga? (@DiegoEstela)
