---
name: plan-tdd
description: Genera un plan de implementación guiado por TDD (red-green-refactor), lo implementa en un git worktree aislado y avisa por Slack (canal planes-generales) al terminar el plan y al terminar el código. Úsala cuando el usuario pida planificar e implementar un cambio, feature o bugfix con TDD.
argument-hint: <descripción del cambio>
---

# plan-tdd

Planifica e implementa `$ARGUMENTS` con TDD, siempre dentro de un git worktree, notificando por Slack en dos hitos.

## Reglas fijas

- **Nunca modifiques el árbol de trabajo principal.** Todo cambio (plan incluido, si se guarda en archivo, y código) ocurre dentro del worktree.
- **Slack**: canal `planes-generales`, vía el MCP `slack` (herramientas `slack_list_channels` para resolver el ID del canal y `slack_post_message` para enviar). Todo mensaje debe empezar con la línea:
  `Mensaje enviado por Diego Estela López`
- Si el MCP de Slack no está disponible o falla, dilo al usuario y continúa; no inventes que se envió.
- Código, tests y mensajes en español, siguiendo el estilo de la zona tocada (ver CLAUDE.md: API con Vitest; los frontends no tienen tests).

## Flujo

### 1. Preparar el worktree
1. Comprueba `git rev-parse --is-inside-work-tree`. Si el directorio no es un repo, pregunta al usuario antes de ejecutar `git init` y hacer un commit inicial (los worktrees lo requieren).
2. Deriva un slug corto del cambio (`kebab-case`) y crea la rama y el worktree fuera del árbol principal:
   `git worktree add ../<repo>-wt-<slug> -b feature/<slug>`
3. Trabaja desde ese directorio. Si `node_modules` no está, ejecuta `npm install` en él.

### 2. Generar el plan (TDD)
Explora el código relevante y escribe un plan con:
- **Objetivo y alcance** (qué entra y qué no).
- **Archivos a tocar**.
- **Ciclos TDD** numerados; cada uno con: test que se escribe primero (nombre y comportamiento esperado), por qué falla (RED), implementación mínima (GREEN) y refactor posible.
- **Riesgos y verificación final** (`npm test`, build del frontend afectado si aplica).

Guarda el plan en `docs/planes/<slug>.md` dentro del worktree y muéstraselo al usuario.

### 3. Aviso Slack: plan listo
Envía a `planes-generales`:
```
Mensaje enviado por Diego Estela López
📝 Plan listo: <título>
Rama: feature/<slug>
Resumen: <2-4 líneas>
Ciclos TDD: <n>
```

### 4. Implementar con TDD
Para cada ciclo del plan:
1. **RED**: escribe el test y ejecútalo; confirma que falla por la razón esperada.
2. **GREEN**: implementa lo mínimo para pasarlo.
3. **REFACTOR**: limpia con los tests en verde.
4. Commit por ciclo en la rama del worktree (mensaje en español, con la atribución de commits vigente).

Al final ejecuta la suite completa (`npm test`) y el build si corresponde. Si algo falla, repórtalo tal cual; no marques como terminado.

### 5. Aviso Slack: implementación lista
Envía a `planes-generales`:
```
Mensaje enviado por Diego Estela López
✅ Implementación terminada: <título>
Rama: feature/<slug> · Worktree: <ruta>
Tests: <resultado real>
Cambios: <lista breve>
```
Si hubo fallos, usa `⚠️` y di qué falló en lugar de ✅.

### 6. Cierre
Informa al usuario de la ruta del worktree, la rama y el resultado de tests. No fusiones ni borres el worktree sin que lo pida.
