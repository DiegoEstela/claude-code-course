# Gestión de mesas — web-admin

| | |
|---|---|
| **Issue** | [#6](https://github.com/DiegoEstela/claude-code-course/issues/6) |
| **Estado** | Borrador |
| **Autor de la issue** | @DiegoEstela |
| **Fecha** | 2026-10-08 |
| **Etiquetas** | `feature`, `proyecto:api`, `proyecto:web-admin`, `proyecto:web-empleados`, `proyecto:web-clientes` |

> Plan 2 de 4 ([api](6-feat-gestion-de-mesas-api.md) · admin · [clientes](6-feat-gestion-de-mesas-clientes.md) · [empleados](6-feat-gestion-de-mesas-empleados.md)). Depende del plan de la API (tareas 1-10).

## 1. Contexto

El administrador gestiona hoy platos, ingredientes y empleados de cada restaurante, pero no sus mesas. La issue pide un CRUD de mesas con `id`, `número`, `descripción`, `capacidad` y `estado` (`libre`, `ocupada`, `reservada`). La issue no tiene comentarios.

## 2. Alcance

**Incluido**
- Feature `tables` en `web-admin` con listado, alta, edición y borrado, y acceso desde el dashboard del restaurante.

**Excluido**
- Cambio rápido de estado por los empleados (vive en `web-empleados`).
- Tests de frontend: no existen en el repo; se verifica con build y prueba manual.

## 3. Comportamiento esperado

### 3.1 Listado
**Dado** un admin en `/restaurants/:restaurantId/tables`
**Cuando** carga la página
**Entonces** ve una tabla con número, descripción, capacidad y estado (badge por color) y botones Editar / Eliminar; si no hay mesas, un estado vacío con enlace a "Nueva mesa".

### 3.2 Alta y edición
**Cuando** completa el formulario (`número` entero ≥ 1, `capacidad` ≥ 1, `descripción` opcional, `estado` solo en edición) y guarda
**Entonces** vuelve al listado con la mesa creada/actualizada. Un número duplicado muestra el mensaje de error de la API (409).

### 3.3 Borrado
**Cuando** pulsa Eliminar y confirma
**Entonces** la mesa desaparece; si está ocupada, se muestra el error devuelto por la API.

## 4. Diseño técnico

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `packages/web-admin/src/app/features/tables/models/table.model.ts` | Nuevo — `Table`, `TableStatus`, DTOs |
| `packages/web-admin/src/app/features/tables/services/table.service.ts` | Nuevo — HTTP |
| `packages/web-admin/src/app/features/tables/store/table.store.ts` | Nuevo — signals |
| `packages/web-admin/src/app/features/tables/pages/table-list/*` | Nuevo — listado |
| `packages/web-admin/src/app/features/tables/pages/table-form/*` | Nuevo — alta/edición |
| `packages/web-admin/src/app/features/tables/tables.routes.ts` | Nuevo — `TABLE_ROUTES` |
| `packages/web-admin/src/app/app.routes.ts` | Ruta `tables` bajo `restaurants/:restaurantId` |
| `packages/web-admin/src/app/features/restaurants/pages/restaurant-dashboard/restaurant-dashboard.component.html` | Tarjeta "Mesas" |

### Enfoque

Copia el patrón de `features/ingredients` (`models/ pages/ services/ store/`): store `root` con signals privadas `loading`/`error`/datos que envuelve el service con `firstValueFrom`, páginas standalone con lazy routes `*_ROUTES`. Iconos con `lucide-angular` como el resto.

### Modelo de datos / contratos

Consume `GET|POST /restaurants/:restaurantId/tables`, `PUT|DELETE /restaurants/:restaurantId/tables/:id` (ver plan API). `TableStatus = 'libre' | 'ocupada' | 'reservada'`.

## 5. Casos borde y errores

| Situación | Comportamiento esperado |
|---|---|
| Error de carga | Mensaje "No se pudieron cargar las mesas." |
| 409 por número duplicado o mesa ocupada | Se muestra el mensaje de la API en el formulario / listado |
| Edición con id inexistente | Redirige al listado |
| Recarga directa en `/tables/:id/edit` | Carga las mesas si el store está vacío |

## 6. Plan de implementación

Cada tarea: 5-10 min, el proyecto compila tras cada una. Verificación base: `npm run build -w @resttek/web-admin`.

1. [ ] **Modelo y service** — `table.model.ts` y `table.service.ts` (`getAll`, `create`, `update`, `delete`). Verificación: build.
2. [ ] **Store** — `table.store.ts` (`loadByRestaurant`, `create`, `update`, `delete`), igual que `ingredient.store.ts`. Verificación: build.
3. [ ] **Listado** — `table-list` con estados de carga/error/vacío y badge de estado. Verificación: build + manual.
4. [ ] **Formulario** — `table-form` (número, capacidad, descripción, estado en edición) con validación y errores de API. Verificación: build + manual.
5. [ ] **Rutas** — `tables.routes.ts` y entrada en `app.routes.ts`. Verificación: navegar a `/restaurants/:id/tables`.
6. [ ] **Acceso desde el dashboard** — tarjeta "Mesas" en `restaurant-dashboard.component.html`. Verificación: manual.
7. [ ] **Borrado con confirmación** — acción Eliminar y manejo del 409. Verificación: manual con una mesa ocupada.

## 7. Criterios de aceptación

- [ ] El admin ve, crea, edita y elimina mesas con número, descripción, capacidad y estado.
- [ ] Se accede desde el dashboard del restaurante.
- [ ] Los errores de la API (duplicado, mesa ocupada) se muestran al usuario.
- [ ] `npm run build -w @resttek/web-admin` pasa.

### Tests

- **Unitarios:** no hay infraestructura de tests en frontends; fuera de alcance.
- **Integración / E2E:** prueba manual con la API y `npm run seed`.

## 8. Impacto y riesgos

- **Retrocompatibilidad:** solo añade rutas y una tarjeta.
- **Rendimiento:** listado pequeño por restaurante.
- **Seguridad:** el guard existente protege las rutas; la API aplica los roles.
- **Operación:** tras cambiar `web-shared` reiniciar el dev server (no se toca aquí).

## 9. Suposiciones y preguntas abiertas

**Suposiciones**
- El estado se puede editar también desde el formulario de admin.

**Preguntas abiertas**
- Ninguna adicional a las del plan de la API.
