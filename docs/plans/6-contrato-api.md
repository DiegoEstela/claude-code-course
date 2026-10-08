# Contrato API ↔ frontends — Gestión de mesas (#6)

Fuente de verdad compartida por los 4 agentes. Todas las rutas bajo `/api/v1`. Errores: `{ "message": string }` con el código HTTP indicado (formato del `errorHandler` existente). Todas las respuestas son JSON.

## Tipo `Table`

```ts
type TableStatus = 'libre' | 'ocupada' | 'reservada'
interface Table {
  id: string
  number: number
  description: string | null
  capacity: number
  status: TableStatus
  restaurantId: string
  createdAt: string   // ISO
  updatedAt: string   // ISO
}
```

## Endpoints

| Método y ruta | Roles | Body | Respuesta |
|---|---|---|---|
| `POST /restaurants/:rid/tables` | admin | `{ number, description?, capacity }` | 201 `Table` (status `libre`) |
| `GET /restaurants/:rid/tables` | admin, manager, camarero, cocinero | — | 200 `Table[]` ordenado por `number` |
| `GET /restaurants/:rid/tables/:id` | admin, manager, camarero, cocinero | — | 200 `Table` |
| `PUT /restaurants/:rid/tables/:id` | admin | `{ number, description?, capacity, status? }` | 200 `Table` |
| `DELETE /restaurants/:rid/tables/:id` | admin | — | 204 (409 si `ocupada`) |
| `PATCH /restaurants/:rid/tables/:id/status` | admin, manager, camarero | `{ status }` | 200 `Table` (400 si estado inválido) |
| `POST /restaurants/:rid/tables/:id/occupy` | cliente | `{ people }` | 200 `Table` (`ocupada`); 409 si no libre / no cabe |
| `GET /public/restaurants/:rid/tables/available?people=N` | público | — | 200 `Table[]` (libres, `capacity >= N`, orden capacidad asc y luego número); 400 si `people` inválido |

Códigos: 404 mesa inexistente, 409 número duplicado / mesa no disponible / borrar ocupada, 400 validación, 403 rol.

## Pedidos

- `POST /orders` acepta `tableId` (opcional/null). Si viene: debe existir en el restaurante y estar `ocupada`, si no 400.
- `GET /orders/active` (y los pedidos activos que ya consumen empleados) añade `tableNumber: number | null` junto a `tableId`.

## Decisiones sobre preguntas abiertas

- Liberar mesa automáticamente al entregar el pedido: **No**. La liberan los empleados a mano (lo pide la issue).
- Varias mesas por cliente: **sin límite** (YAGNI; no hay tabla de clientes).
- Persistir la mesa en el cliente: **Sí, en `sessionStorage`** (clave `resttek.table`) dentro de `CartStore`, para que una recarga no deje una mesa ocupada huérfana; se descarta al cambiar de restaurante o tras confirmar el pedido. Envuelto en try/catch.
- `cocinero` ve la página Mesas en `web-empleados`: **Sí, solo lectura**.
