# Spec: corrección de bugs conocidos

Origen: `scripts/issues.json` (issues de tipo `bug`). Estado inicial verificado: `npm install` OK, `npm test` 66/66 en verde, API arranca en :3000 y `/health` responde `{"status":"ok"}`.

Reglas para todos los bugs:

- Un bug = un cambio pequeño y revisable. Reproducir primero, corregir después.
- Seguir el estilo de la zona tocada (ver `CLAUDE.md`). No refactorizar de paso.
- Si cambia comportamiento documentado, actualizar `docs/`.
- Los frontends no tienen tests: la verificación es manual (pasos abajo) más `npm run build -w <paquete>` sin errores. En la API, añadir test Vitest cuando haya lógica testeable.

---

## BUG-1 · Páginas de empleados sin control de acceso por rol

- **Paquetes**: `web-empleados`, `web-shared`
- **Síntoma**: cualquier usuario autenticado entra en `/cocina`, `/barra` y `/salon`.
- **Causa probable**: `authGuard` (`web-shared/src/lib/auth/auth.guard.ts`) solo comprueba `isAuthenticated()`. Las rutas de `web-empleados/src/app/app.routes.ts` no declaran roles y no hay guard por rol. `AuthStore` ya expone `userRole`.
- **Comportamiento esperado**:
  | Rol | Acceso |
  | --- | --- |
  | cocinero | solo `/cocina` |
  | camarero | `/barra` y `/salon` |
  | manager | las tres |
  | admin / cliente | ninguna (decidir: redirigir a `/login` o a una pantalla de "sin permisos") |
- **Propuesta**: guard funcional `roleGuard(...roles)` (o lectura de `data.roles` en las rutas) en `web-shared`; aplicarlo por ruta. La ruta por defecto `''` redirige hoy a `cocina`: debe redirigir a la primera ruta permitida del rol (un camarero no puede aterrizar en cocina).
- **Fuera de alcance**: la API ya aplica `authorize()`; no tocar el backend.
- **Verificación**: login con `cocinero1@resttek.com`, `camarero1@resttek.com` y `gerente1@resttek.com` (contraseña = email) y probar las tres URLs directamente y tras recargar.

## BUG-2 · No se recargan datos al cambiar de restaurante (ingredientes y platos)

- **Paquete**: `web-admin`
- **Síntoma**: en `/restaurants/rest-1/ingredients`, al navegar a ingredientes de `rest-2` se siguen viendo los de `rest-1`. Igual con platos.
- **Causa probable**: `IngredientListComponent` y `DishListComponent` leen `route.parent?.snapshot.params['restaurantId']` una sola vez en `ngOnInit`. Angular reutiliza el componente cuando solo cambia el parámetro, así que `ngOnInit` no se vuelve a ejecutar.
- **Comportamiento esperado**: al cambiar `restaurantId` se vacía la lista anterior y se cargan los datos del nuevo restaurante.
- **Propuesta**: suscribirse a los params (`route.parent.paramMap` / `toSignal` + `effect`) y llamar a `store.loadByRestaurant` en cada cambio; el store no debe mostrar datos del restaurante anterior mientras carga. Revisar también `restaurant-dashboard` y la lista de empleados por si tienen el mismo patrón.
- **Verificación**: desde el dashboard de `rest-1` ir a ingredientes, cambiar a `rest-2` (por navegación, no por recarga) y comprobar que la lista cambia. Repetir con platos.

## BUG-3 · Página en blanco al entrar directo en `/restaurants/:id/dishes`

- **Paquete**: `web-admin`
- **Síntoma**: abrir `http://localhost:4200/restaurants/rest-2/dishes` (o similar) por URL directa deja la página en blanco.
- **Causa**: **sin determinar**. Hipótesis a descartar por orden:
  1. `restaurantId` llega vacío en `DishListComponent` (`route.parent` apunta a la ruta `dishes`, no a `:restaurantId`) y no se carga nada;
  2. error en consola durante el arranque en frío (`authGuard`, `AuthStore`, `DishStore`) que rompe el render;
  3. colisión entre `restaurants` (`loadChildren`) y `restaurants/:restaurantId` en `app.routes.ts`.
- **Primer paso obligatorio**: reproducir con DevTools abierto y anotar el error real antes de tocar código. Comprobar si `/restaurants/rest-2/ingredients` falla igual (indicaría un problema de rutas y no del componente de platos).
- **Comportamiento esperado**: la URL directa muestra la lista de platos de ese restaurante (con sesión iniciada) o redirige a `/login`.
- **Nota**: probablemente se resuelve junto con BUG-2 si la causa es la lectura de `restaurantId`.

## BUG-4 · `seed` no borra los datos previos

- **Paquete**: `api` (`packages/api/src/scripts/seed.ts`; la issue menciona `seed.py` por error, el fichero es `.ts`)
- **Síntoma**: todos los inserts son `INSERT OR IGNORE`, así que lo añadido o modificado a mano sobrevive a `npm run seed`.
- **Comportamiento esperado**: el seed vacía todas las tablas y las vuelve a rellenar, dejando siempre el mismo estado.
- **Propuesta**: al principio del seed, borrar en orden de dependencias (`order_items`, `orders`, `dish_ingredients`, `dishes`, `ingredients`, `employees`, `restaurants`). Las FK están activas (`PRAGMA foreign_keys = ON`), por lo que el orden importa. Mantener los IDs fijos `rest-1`/`rest-2`.
- **Cuidado**: es una operación destructiva; no debe poder ejecutarse contra una BD que no sea la de desarrollo, y el mensaje final debe avisar de que se ha reseteado.
- **Verificación**: `npm run seed`, crear un plato extra desde la API, `npm run seed` de nuevo → el plato extra ya no existe y el conteo por tabla es el del seed original. Las credenciales del README deben seguir funcionando.

---

## Orden recomendado

1. BUG-4 (aislado, en la API, base limpia para probar el resto).
2. BUG-2, y reevaluar BUG-3.
3. BUG-3 si persiste.
4. BUG-1 (requiere decisión sobre admin/cliente).

## Preguntas abiertas

- BUG-1: ¿qué debe ver un `admin` o `cliente` que entra en web-empleados?
- BUG-4: ¿se quiere un flag (`--keep`) para el comportamiento actual, o se elimina?

## Fuera de alcance

Las issues de tipo `feature` (mesas, OpenAPI, puntos, descuentos, packs) tendrán su propia spec.
