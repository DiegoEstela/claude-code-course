# Análisis del proyecto Resttek

Fecha: 2026-10-07

## Qué hace

Resttek es una plataforma de gestión de restaurantes con tres aplicaciones sobre una API común:

- **web-admin**: panel de administración (restaurantes, platos, ingredientes, empleados).
- **web-empleados**: app para cocina, barra y salón (seguimiento de los ítems de pedido).
- **web-clientes**: app de pedidos para clientes (carta, carrito, mis pedidos).

## Tecnología

| Capa | Tecnología |
| --- | --- |
| Monorepo | npm workspaces (`packages/*`) |
| API (`api`) | Node 22+, Express 5, TypeScript estricto (ESM), SQLite (`sqlite3`), JWT, bcrypt |
| Tests API | Vitest (`supertest` instalado pero sin uso) |
| Frontends | Angular 21: componentes standalone, signals, zoneless, lucide-angular, RxJS solo para HTTP |
| Librería compartida | `web-shared`: auth, interceptors, guard, login y registro |

## Arquitectura

- **API**: dos estilos conviven. El contexto `employee` es hexagonal/DDD (domain, application, infrastructure). `restaurant`, `dish`, `ingredient` y `order` van por capas (routes, controllers, services, repositories, models).
- **Base de datos**: SQLite en `packages/api/resttek.db` (`:memory:` con `NODE_ENV=test`). Sin framework de migraciones: el esquema se crea con `CREATE TABLE IF NOT EXISTS` y `PRAGMA foreign_keys = ON` está activo.
- **Usuarios**: los clientes son filas de `employees` con `role='cliente'`; no hay tabla de clientes.
- **Auth**: JWT de 8 horas con payload `{id, role, restaurantId}`.
- **Estado en frontends**: `web-admin` y `web-empleados` usan stores con signals. `web-clientes` llama a los services con `.subscribe()` y solo tiene `CartStore`. Hay polling de 30 s en empleados y de 10 s en mis pedidos de clientes.
- **Proxy de desarrollo**: cada frontend redirige `/api` a `http://localhost:3000`.

## Cómo arrancarlo

Desde la raíz del repo:

```bash
npm install
npm run seed
npm run dev:api         # :3000
npm run dev:admin       # :4200
npm run dev:empleados   # :4201
npm run dev:clientes    # :4202
npm test
```

Los usuarios de prueba tienen como contraseña su propio email (por ejemplo `admin@resttek.com`). La lista completa está en el [README](../README.md).

## Estado verificado

- `npm install`: correcto.
- `npm test`: 66 de 66 tests pasan.
- API: arranca en :3000 y `/health` responde `{"status":"ok"}`.
- Frontends: **no se arrancaron ni probaron en el navegador**, y no tienen tests.

## Bugs conocidos

Procedentes de `scripts/issues.json`; el detalle y la propuesta de corrección están en [specs/spec-correccion-bugs.md](./specs/spec-correccion-bugs.md).

| Bug | Causa probable |
| --- | --- |
| Páginas de empleados sin control de acceso por rol | `authGuard` solo comprueba autenticación |
| No se recargan datos al cambiar de restaurante | El `restaurantId` se lee una vez en `ngOnInit` |
| Página en blanco en `/restaurants/:id/dishes` | Sin determinar; hay que reproducirlo |
| El seed no borra datos previos | Todos los inserts son `INSERT OR IGNORE` |

Las causas son hipótesis a partir del código, no están reproducidas.

## Documentación relacionada

- [CLAUDE.md](../CLAUDE.md): guía para futuras sesiones de Claude Code.
- [Arquitectura general](./arquitectura/arquitectura-general.md), [API](./arquitectura/arquitectura-api.md) y [frontend](./arquitectura/arquitectura-frontend.md).
- [Modelo de datos](./dominio/modelo-datos.md) y [glosario](./dominio/glosario.md).
