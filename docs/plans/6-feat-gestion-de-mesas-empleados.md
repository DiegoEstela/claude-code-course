# Gestión de mesas — web-empleados

| | |
|---|---|
| **Issue** | [#6](https://github.com/DiegoEstela/claude-code-course/issues/6) |
| **Estado** | Borrador |
| **Autor de la issue** | @DiegoEstela |
| **Fecha** | 2026-10-08 |
| **Etiquetas** | `feature`, `proyecto:api`, `proyecto:web-admin`, `proyecto:web-empleados`, `proyecto:web-clientes` |

> Plan 4 de 4 ([api](6-feat-gestion-de-mesas-api.md) · [admin](6-feat-gestion-de-mesas-admin.md) · [clientes](6-feat-gestion-de-mesas-clientes.md) · empleados). Depende del plan de la API (tareas 1-10 y 13).

## 1. Contexto

`web-empleados` tiene las vistas Cocina, Barra y Salón, que muestran pedidos activos con un badge `Mesa {{ order.tableId }}` (hoy sería un UUID cuando haya mesas reales). La issue pide que los empleados vean los estados de las mesas, los cambien, y vean el estado de los pedidos de las mesas ocupadas. La issue no tiene comentarios.

## 2. Alcance

**Incluido**
- Nueva página "Mesas" con el estado de cada mesa y cambio de estado.
- Para mesas ocupadas, estado de sus pedidos (por ítem).
- Mostrar el número de mesa (no el id) en los badges de Cocina, Barra y Salón.

**Excluido**
- Crear, editar o borrar mesas (es del admin).
- Tests de frontend: no existen; verificación con build y prueba manual.

## 3. Comportamiento esperado

### 3.1 Ver mesas
**Dado** un empleado en `/mesas`
**Entonces** ve una cuadrícula con una tarjeta por mesa: número, descripción, capacidad y estado (color distinto para libre / ocupada / reservada). Se refresca cada 30 s.

### 3.2 Cambiar estado
**Cuando** cambia el estado de una mesa con el selector
**Entonces** la tarjeta se actualiza; si falla, se muestra el error y se mantiene el estado anterior.

### 3.3 Pedidos de mesas ocupadas
**Dado** una mesa ocupada con pedidos activos
**Entonces** su tarjeta lista los ítems con su estado (`pendiente`, `preparando`, `listo`, `entregado`) y un resumen; sin pedidos muestra "Sin pedidos todavía".

### 3.4 Badges
Cocina, Barra y Salón muestran `Mesa {{ tableNumber }}`.

## 4. Diseño técnico

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `packages/web-empleados/src/app/features/tables/models/table.model.ts` | Nuevo |
| `packages/web-empleados/src/app/features/tables/services/table.service.ts` | Nuevo — `getAll`, `updateStatus` |
| `packages/web-empleados/src/app/features/tables/store/table.store.ts` | Nuevo — signals + polling 30 s |
| `packages/web-empleados/src/app/features/tables/pages/mesas/mesas.component.{ts,html,css}` | Nuevo — página |
| `packages/web-empleados/src/app/app.routes.ts` | Ruta `mesas` |
| `packages/web-empleados/src/app/core/layout/shell.component.html` | Enlace "Mesas" |
| `packages/web-empleados/src/app/features/orders/models/order.model.ts` | `tableNumber?` |
| `.../orders/pages/{cocina,barra,salon}/*.html` | Badge con `tableNumber` |

### Enfoque

Igual que `features/orders`: store `root` con signals privadas y polling con `setInterval` (`startPolling`/`stopPolling` como en `OrderStore`), servicio con `firstValueFrom`. Los pedidos de cada mesa se obtienen reutilizando `OrderStore.orders()` (ya trae pedidos activos) filtrando por `tableId`, sin endpoint nuevo.

### Modelo de datos / contratos

`GET /restaurants/:restaurantId/tables`, `PATCH /restaurants/:restaurantId/tables/:id/status` `{ status }` y `tableNumber` en `/orders/active` (ver plan API).

## 5. Casos borde y errores

| Situación | Comportamiento esperado |
|---|---|
| Rol sin permiso para cambiar (`cocinero`) | El selector se deshabilita; solo lectura |
| Empleado sin `restaurantId` | No se cargan mesas |
| Fallo del PATCH | Revierte el estado y muestra el error |
| Pedido con `tableNumber` nulo (mesa borrada) | Badge "Mesa ?" |
| Mesa ocupada sin pedidos activos | "Sin pedidos todavía" |

## 6. Plan de implementación

Cada tarea: 5-10 min, compila tras cada una. Verificación base: `npm run build -w @resttek/web-empleados`.

1. [ ] **Modelo y service** — `table.model.ts`, `table.service.ts`. Verificación: build.
2. [ ] **Store con polling** — `table.store.ts` (`load`, `updateStatus`, `startPolling`, `stopPolling`). Verificación: build.
3. [ ] **Página Mesas (lectura)** — cuadrícula con estado por colores, carga/error/vacío, ciclo de vida del polling. Verificación: build + manual.
4. [ ] **Cambio de estado** — selector por mesa, actualización optimista con reversión y deshabilitado para `cocinero`. Verificación: manual con `camarero1@resttek.com` y `cocinero1@resttek.com`.
5. [ ] **Pedidos por mesa** — filtra `OrderStore.orders()` por `tableId` y lista ítems con estado en las tarjetas ocupadas. Verificación: manual con un pedido de cliente.
6. [ ] **Ruta y navegación** — `mesas` en `app.routes.ts` y enlace en `shell.component.html`. Verificación: manual.
7. [ ] **Badges con número de mesa** — `tableNumber` en `order.model.ts` y plantillas de Cocina, Barra y Salón. Verificación: manual.

## 7. Criterios de aceptación

- [ ] Los empleados ven todas las mesas del restaurante con su estado.
- [ ] Pueden cambiar el estado (admin, manager, camarero); `cocinero` solo lee.
- [ ] Las mesas ocupadas muestran el estado de sus pedidos.
- [ ] Cocina, Barra y Salón muestran el número de mesa.
- [ ] Los cambios de otros usuarios aparecen en ≤ 30 s.
- [ ] `npm run build -w @resttek/web-empleados` pasa.

### Tests

- **Unitarios:** sin infraestructura en frontends; fuera de alcance.
- **Integración / E2E:** manual con API, seed y un pedido creado desde `web-clientes`.

## 8. Impacto y riesgos

- **Retrocompatibilidad:** los badges dependen de `tableNumber` (plan API, tarea 13); sin él se muestra "Mesa ?".
- **Rendimiento:** un polling más cada 30 s; `OrderStore` ya tiene el suyo, hay que evitar duplicarlo al abrir Mesas.
- **Seguridad:** la API restringe los roles; el front solo oculta controles.
- **Operación:** ninguna.

## 9. Suposiciones y preguntas abiertas

**Suposiciones**
- La página Mesas se muestra a todos los roles de empleado; solo cambian estado admin, manager y camarero.

**Preguntas abiertas**
- ¿Debe `cocinero` ver la página de Mesas? (@DiegoEstela)
