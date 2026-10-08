# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

Resttek: plataforma de gestión de restaurantes. Monorepo con **npm workspaces** (`packages/*`): una API Node/Express (`api`) y cuatro paquetes Angular 21 (`web-admin`, `web-empleados`, `web-clientes` y la librería `web-shared`). La documentación del proyecto está en español y en `docs/` (arquitectura, dominio, revisiones); el código y los mensajes de usuario también van en español.

## Comandos (desde la raíz)

Requiere Node 22+ y npm 10+. `npm install` una sola vez en la raíz instala todos los workspaces.

```bash
npm run seed            # puebla SQLite con datos de prueba (credencial = email, ver README)
npm run dev:api         # API en :3000 (tsx watch); health: GET /health
npm run dev:admin       # :4200
npm run dev:empleados   # :4201
npm run dev:clientes    # :4202
npm test                # vitest run (solo existen tests en la API)
```

- Test individual: `npm run test -w @resttek/api -- src/services/order.service.test.ts` (o `-t "nombre del test"`). Modo watch: `npm run test:watch -w @resttek/api`.
- No hay lint configurado. Build de un frontend: `npm run build -w @resttek/web-admin` (idem para los otros).
- Los frontends hacen proxy de `/api` a `localhost:3000` (`proxy.conf.json`); hay que tener la API arriba. Tras cambiar `web-shared` hay que reiniciar el dev server del frontend.

## Arquitectura

### API (`packages/api`, ESM + TypeScript estricto)
- **Dos estilos conviven**: el contexto `employee` (`src/contexts/employee/`) es hexagonal/DDD (domain → application/use cases → infrastructure, interfaces con prefijo `I`, value objects `Email`/`Role`); `restaurant`, `dish`, `ingredient` y `order` van por capas transversales (`routes/ → controllers/ → services/ → repositories/ → models/`). Sigue el estilo de la zona que toques, no mezcles.
- Imports con alias de `tsconfig.json` (`@employee/*`, `@services/*`, `@shared/*`, …) y **extensión `.js`** en los imports (ESM nodenext).
- Errores: jerarquía `AppError`/`DomainErrors` mapeada a HTTP en `contexts/shared/infrastructure/http/errorHandler.ts`. `OrderController` tiene su propio try/catch (peculiaridad conocida).
- Auth: JWT (payload `{id, role, restaurantId}`, 8h) + middlewares `authenticate`/`authorize(roles)` en `contexts/shared/infrastructure/http/middlewares.ts`. Los clientes finales son filas de `employees` con `role='cliente'` (no hay tabla de clientes).
- SQLite (`packages/api/resttek.db`; `:memory:` con `NODE_ENV=test`). **No hay framework de migraciones**: el esquema se crea con `CREATE TABLE IF NOT EXISTS` en `config/database.ts`; añadir una columna no afecta a una BD existente (borrar el `.db` y re-sembrar). `PRAGMA foreign_keys = ON` está activo, así que los fixtures de tests deben insertar la fila padre.
- Tests con Vitest, unitarios con dobles en `*/mocks/`; `supertest` está instalado pero no se usa (no hay tests HTTP).
- Rutas bajo `/api/v1`; las públicas (`/public/restaurants...`) son para `web-clientes`.

### Frontends (Angular 21: standalone, signals, zoneless, lucide-angular)
- `web-admin` y `web-empleados`: features con `models/ pages/ services/ store/`; los stores son servicios `root` con signals privadas (`loading`/`error`/datos) que envuelven el service con `firstValueFrom`. `web-empleados` hace polling cada 30 s en `OrderStore`.
- `web-clientes` es distinta: modelos/servicios en `core/`, los componentes llaman a los services con `.subscribe()`; solo `CartStore` es un store (local). Polling de 10 s en `my-orders`.
- `web-shared` (`@resttek/web-shared`, consumido desde `src/index.ts`) aporta auth, interceptor y guard comunes; los frontends no dependen entre sí.

## Otros

- `scripts/seed-issues.sh` + `scripts/issues.json` crean issues de GitHub (bugs/features del curso) con `gh` y `jq`; `issues.json` es una buena lista de bugs conocidos.
- `docs/revisiones/` contiene revisiones de inconsistencias doc↔código; actualiza `docs/` si cambias comportamiento documentado.
- El directorio no es (aún) un repositorio git.
