# Gestión de mesas — API

| | |
|---|---|
| **Issue** | [#6](https://github.com/DiegoEstela/claude-code-course/issues/6) |
| **Estado** | Borrador |
| **Autor de la issue** | @DiegoEstela |
| **Fecha** | 2026-10-08 |
| **Etiquetas** | `feature`, `proyecto:api`, `proyecto:web-admin`, `proyecto:web-empleados`, `proyecto:web-clientes` |

> Plan 1 de 4 (api · [admin](6-feat-gestion-de-mesas-admin.md) · [clientes](6-feat-gestion-de-mesas-clientes.md) · [empleados](6-feat-gestion-de-mesas-empleados.md)). Este plan **debe ir primero**: los otros tres consumen su contrato.

## 1. Contexto

Hoy `orders.table_id` existe como `TEXT` sin ninguna entidad detrás: los clientes envían `tableId: null` y los empleados muestran `Mesa {{ tableId }}` cuando viene informado. No hay forma de gestionar las mesas de un restaurante ni de saber cuáles están libres.

La issue pide: (a) el administrador gestiona las mesas (CRUD) con `id`, `número`, `descripción`, `capacidad` y `estado` (`libre`, `ocupada`, `reservada`); (b) el cliente indica nº de personas, ve las mesas libres con capacidad suficiente, elige una y al continuar queda `ocupada`; (c) los empleados ven y cambian el estado de las mesas y ven el estado de los pedidos de las mesas ocupadas. La issue no tiene comentarios.

## 2. Alcance

**Incluido**
- Entidad `Table` (tabla `tables`) con CRUD por restaurante (solo admin escribe).
- Cambio de estado por empleados (admin, manager, camarero).
- Consulta pública de mesas disponibles por nº de personas y ocupación atómica por el cliente.
- El pedido valida que su mesa pertenezca al restaurante y esté ocupada; los pedidos activos devuelven `tableNumber`.
- Datos de seed y documentación.

**Excluido**
- Liberar la mesa automáticamente cuando el pedido se entrega: la issue dice que los empleados cambian los estados, así que lo hacen a mano (ver preguntas abiertas).
- Reservas con fecha/hora: `reservada` es solo un estado manual.
- Migraciones: el proyecto no las tiene; hay que borrar el `.db` y re-sembrar.

## 3. Comportamiento esperado

### 3.1 Admin crea una mesa
**Dado** un admin autenticado y un restaurante existente
**Cuando** `POST /api/v1/restaurants/:restaurantId/tables` con `{ number, description?, capacity }`
**Entonces** 201 con la mesa `{ id, number, description, capacity, status: 'libre', restaurantId, createdAt, updatedAt }`.

### 3.2 Listado de mesas
**Dado** un usuario `admin | manager | camarero | cocinero` del restaurante
**Cuando** `GET /api/v1/restaurants/:restaurantId/tables`
**Entonces** 200 con todas las mesas ordenadas por `number`, con su estado.

### 3.3 Empleado cambia el estado
**Cuando** `PATCH /api/v1/restaurants/:restaurantId/tables/:id/status` con `{ status }` (rol `admin | manager | camarero`)
**Entonces** 200 con la mesa actualizada. Estado inválido → 400.

### 3.4 Cliente consulta mesas disponibles
**Cuando** `GET /api/v1/public/restaurants/:restaurantId/tables/available?people=4`
**Entonces** 200 con las mesas `libre` con `capacity >= 4`, ordenadas por capacidad ascendente y luego número. `people` ausente, no entero o `< 1` → 400.

### 3.5 Cliente ocupa una mesa
**Cuando** `POST /api/v1/restaurants/:restaurantId/tables/:id/occupy` con `{ people }` (rol `cliente`)
**Entonces** 200 con la mesa en `ocupada`. Si ya no está libre o no cabe → 409 `TableNotAvailableError`.

### 3.6 Pedido con mesa
**Cuando** `POST /api/v1/orders` con `tableId`
**Entonces** se valida que la mesa exista en ese restaurante y esté `ocupada`; si no, 400 con el mensaje de error. `GET /orders/active` devuelve además `tableNumber`.

## 4. Diseño técnico

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `packages/api/src/models/table.model.ts` | Nuevo — `Table`, estados válidos, `normalizeTableStatus` |
| `packages/api/src/errors/DomainErrors.ts` | Errores de mesa |
| `packages/api/src/contexts/shared/infrastructure/http/errorHandler.ts` | Mapea `TableNotFoundError` → 404 y `TableNotAvailableError`/`DuplicatedTableNumberError` → 409 |
| `packages/api/src/config/database.ts` | `CREATE TABLE IF NOT EXISTS tables` |
| `packages/api/src/repositories/table.repository.ts` | Nuevo — interfaz + `SqliteTableRepository` |
| `packages/api/src/repositories/mocks/MockTableRepository.ts` | Nuevo — doble para tests |
| `packages/api/src/services/table.service.ts` | Nuevo — reglas de negocio |
| `packages/api/src/controllers/table.controller.ts` | Nuevo |
| `packages/api/src/routes/table.routes.ts`, `table.public.routes.ts` | Nuevos |
| `packages/api/src/app.ts` | Monta las rutas |
| `packages/api/src/services/order.service.ts`, `controllers/order.controller.ts`, `routes/order.routes.ts` | Valida la mesa del pedido |
| `packages/api/src/repositories/order.repository.ts`, `models/order.model.ts` | `tableNumber` en pedidos activos |
| `packages/api/src/scripts/seed.ts` | Mesas de ejemplo |
| `docs/dominio/`, `docs/arquitectura/` | Documentar mesas |

### Enfoque

Capas transversales (`routes → controllers → services → repositories → models`), igual que `ingredient.*` (zona no hexagonal). Rutas anidadas bajo `/restaurants/:restaurantId/...` con `Router({ mergeParams: true })` como `ingredient.routes.ts`, y una ruta pública aparte como `dish.public.routes.ts`. La ocupación usa un `UPDATE tables SET status='ocupada' WHERE id=? AND status='libre'` y comprueba `changes` para evitar que dos clientes cojan la misma mesa (descartado: leer y luego guardar, que tiene condición de carrera).

### Modelo de datos / contratos

```sql
CREATE TABLE IF NOT EXISTS tables (
    id TEXT PRIMARY KEY,
    number INTEGER NOT NULL,
    description TEXT,
    capacity INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'libre',
    restaurant_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(restaurant_id, number),
    FOREIGN KEY(restaurant_id) REFERENCES restaurants(id)
)
```

```ts
type TableStatusType = 'libre' | 'ocupada' | 'reservada'
interface Table { id: string; number: number; description: string | null; capacity: number
  status: TableStatusType; restaurantId: string; createdAt: string; updatedAt: string }
```

## 5. Casos borde y errores

| Situación | Comportamiento esperado |
|---|---|
| `number` no entero o `< 1`, `capacity < 1` | 400 |
| Número de mesa repetido en el restaurante | 409 `DuplicatedTableNumberError` |
| Borrar una mesa `ocupada` | 409 `TableNotAvailableError` |
| Mesa inexistente | 404 `TableNotFoundError` |
| Dos clientes ocupan la misma mesa a la vez | Solo uno gana; el otro recibe 409 |
| `people` mayor que la capacidad al ocupar | 409 |
| Pedido con mesa no ocupada o de otro restaurante | 400 |
| Rol sin permiso (p. ej. `cliente` en CRUD) | 403 |
| Mesa con pedidos asociados al borrarla | Los pedidos conservan `table_id` (sin FK); `tableNumber` queda `null` |

## 6. Plan de implementación

Cada tarea: TDD (test rojo → verde), 5-10 min, el proyecto compila y los tests pasan tras cada una.

1. [x] **Modelo y estados** — `table.model.ts` con `normalizeTableStatus` y `InvalidTableStatusError`. Test: `table.service.test.ts` (estados válidos, normaliza mayúsculas, rechaza inválido).
2. [x] **Errores de dominio y HTTP** — `TableNotFoundError`, `InvalidTableNumberError`, `InvalidTableCapacityError`, `DuplicatedTableNumberError`, `TableNotAvailableError` y su mapeo en `errorHandler.ts`. Verificación: `npm test` + `npx tsc --noEmit` (se ejercitan en las tareas 4-8).
3. [x] **Repositorio: interfaz y mock** — `TableRepository` (`findById`, `findByRestaurantId`, `findAvailable`, `save`, `delete`, `occupyIfFree`) y `MockTableRepository.ts`. Test: lo usan las tareas siguientes.
4. [x] **`TableService.create`** — valida número, capacidad, restaurante, duplicado; estado inicial `libre`. Test: `table.service.test.ts`.
5. [x] **`update`, `delete`, `findById`, `findByRestaurantId`** — `delete` rechaza mesas `ocupada`; `update` mantiene `restaurantId`. Test: `table.service.test.ts`.
6. [x] **`updateStatus`** — normaliza estado y persiste. Test: `table.service.test.ts`.
7. [x] **`findAvailable(restaurantId, people)`** — valida `people >= 1`, devuelve libres con capacidad suficiente ordenadas. Test: `table.service.test.ts`.
8. [x] **`occupy(restaurantId, id, people)`** — usa `occupyIfFree`; 409 si no libre/no cabe. Test: `table.service.test.ts`, incluido el caso de la carrera (segunda llamada falla).
9. [x] **Esquema + `SqliteTableRepository`** — tabla `tables` en `database.ts`, implementación con `UPDATE … WHERE status='libre'`. Test: `table.repository.test.ts` con `:memory:` (insertar restaurante padre por `foreign_keys = ON`), siguiendo `restaurant.repository.test.ts`.
10. [x] **Controller + rutas de gestión** — `TableController`, `table.routes.ts` (CRUD admin; GET admin/manager/camarero/cocinero; PATCH status admin/manager/camarero; `occupy` cliente), montaje en `app.ts`. Verificación: `npm test` + `curl` manual con token (no hay tests HTTP).
11. [x] **Ruta pública de disponibles** — `table.public.routes.ts` en `/public/restaurants/:restaurantId/tables/available`, con 400 si `people` es inválido. Verificación: `curl` manual.
12. [x] **Pedido valida su mesa** — `OrderService` recibe `TableRepository`; si hay `tableId` exige mesa del restaurante y `ocupada`. Test: ampliar `order.service.test.ts` (ajustar `MockOrderRepository` y construcción en `order.routes.ts`).
13. [x] **`tableNumber` en pedidos activos** — `LEFT JOIN tables` en `findActiveByRestaurant` y campo opcional en `Order`. Test: nuevo `order.repository.test.ts` con `:memory:`.
14. [x] **Seed y documentación** — mesas de ejemplo en ambos restaurantes en `seed.ts`; actualizar `docs/dominio` y `docs/arquitectura` con la entidad y los endpoints. Verificación: `npm run seed` sobre BD limpia.

## 7. Criterios de aceptación

- [ ] El admin puede crear, listar, editar y borrar mesas con número, descripción, capacidad y estado.
- [ ] El estado solo admite `libre`, `ocupada`, `reservada`.
- [ ] Los empleados (admin, manager, camarero) pueden cambiar el estado; los demás roles reciben 403 donde corresponda.
- [ ] El endpoint público devuelve solo mesas libres con capacidad ≥ personas.
- [ ] Ocupar una mesa la pasa a `ocupada` de forma atómica; una segunda ocupación devuelve 409.
- [ ] Un pedido con `tableId` exige mesa ocupada del mismo restaurante.
- [ ] Los pedidos activos incluyen `tableNumber`.
- [ ] `npm test` pasa y `npm run seed` funciona.

### Tests

- **Unitarios:** `table.service.test.ts`, `table.repository.test.ts`, ampliación de `order.service.test.ts`, `order.repository.test.ts`.
- **Integración / E2E:** no hay tests HTTP; verificación manual con `curl` de los endpoints (tareas 10-11).

## 8. Impacto y riesgos

- **Retrocompatibilidad:** `tableId` en pedidos pasa de libre a validado; los clientes antiguos que envían `null` siguen funcionando. BD existente: hay que borrar el `.db` y re-sembrar.
- **Rendimiento:** consultas simples por restaurante; sin riesgo.
- **Seguridad:** `occupy` y el listado exigen JWT; hay que comprobar que el `restaurantId` de la URL coincide con el del recurso. Hoy los endpoints de ingredientes no comprueban que el empleado pertenezca al restaurante; se mantiene el mismo criterio salvo decisión contraria.
- **Operación:** sin configuración nueva.

## 9. Suposiciones y preguntas abiertas

**Suposiciones**
- Un cliente puede ocupar cualquier mesa libre sin tener pedido previo; las mesas no se liberan solas.
- `camarero` y `manager` pueden cambiar estados; `cocinero` solo lee.
- "Reservada" no la elige el cliente, solo el personal.

**Preguntas abiertas**
- ¿Debe liberarse la mesa automáticamente cuando todos sus pedidos están `entregado`? (@DiegoEstela)
- ¿Puede un cliente tener varias mesas ocupadas a la vez? Hoy no se limita.
