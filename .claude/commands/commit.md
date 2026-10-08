---
description: Crea un commit siguiendo Conventional Commits a partir de los cambios actuales
argument-hint: "[tipo(scope)?: descripción opcional | pista sobre qué commitear]"
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git branch:*)
---

## Contexto

- Rama actual: !`git branch --show-current`
- Estado: !`git status --short`
- Cambios en stage: !`git diff --cached --stat`
- Cambios sin stage: !`git diff --stat`
- Últimos commits (para seguir el estilo): !`git log --oneline -10 2>/dev/null || echo "(sin commits todavía)"`

Argumentos del usuario: $ARGUMENTS

## Tarea

Creá un commit que siga la especificación **Conventional Commits 1.0.0**.

1. **Qué commitear**
   - Si hay cambios en stage, commiteá solo eso.
   - Si no hay nada en stage, revisá los cambios (`git diff`, archivos sin trackear) y agregá con `git add <rutas>` solo los archivos relacionados entre sí. Nunca uses `git add -A` ni `git add .` a ciegas.
   - No agregues nunca `data/*.db`, `node_modules/`, `.env` ni archivos con secretos.
   - Si los cambios mezclan temas distintos (p. ej. un fix y una feature), proponé dividirlos en varios commits y preguntá antes de seguir.

2. **Formato del mensaje**

   ```
   <tipo>(<scope opcional>): <descripción>

   <cuerpo opcional>

   <footer opcional>
   ```

   - **Tipos permitidos**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
   - **Scopes sugeridos** para este proyecto: `auth`, `vendehumos`, `db`, `middlewares`, `validators`, `repositories`, `controllers`, `routes`, `openapi`, `readme`, `deps`, `seed`.
   - **Descripción**: en español, modo imperativo ("agrega", "corrige", "convierte"), minúscula inicial, sin punto final, máximo ~72 caracteres en la primera línea.
   - **Cuerpo** (opcional): explica el *qué* y el *por qué*, no el *cómo*. Líneas de ~72 caracteres.
   - **Breaking changes**: agregá `!` tras el tipo/scope (`feat(auth)!: ...`) y un footer `BREAKING CHANGE: <explicación>` (p. ej. cambios en el contrato de la API o en el esquema de la DB que requieren borrar `data/vendehumos.db`).
   - Si `$ARGUMENTS` trae un mensaje ya escrito, validalo contra estas reglas y usalo (corrigiéndolo si hace falta).

3. **Ejecución**
   - Hacé el commit con un heredoc para preservar el formato:
     ```bash
     git commit -m "$(cat <<'EOF'
     tipo(scope): descripción

     cuerpo
     EOF
     )"
     ```
   - No uses `--no-verify` ni `--amend` salvo que el usuario lo pida.
   - No hagas `git push`.
   - Al terminar, mostrá `git log --oneline -1` y un resumen breve de lo commiteado.

## Ejemplos

- `feat(auth): agrega endpoint de refresh token`
- `fix(vendehumos): devuelve 404 al votar un id inexistente`
- `refactor(vendehumos): convierte controller y repository a clases`
- `docs(openapi): documenta respuesta 429 del login`
- `chore(deps): actualiza express a 5.1.0`

## Pasos

1. Si no hay cambios, díselo al usuario y detente.
2. Si no hay nada en staging, añade con `git add` los archivos relevantes
   (nunca `git add -A` ni `git add .`, y nunca archivos de secretos como `.env` o bases de datos como `data/*.db`).
3. Redacta el mensaje y usa la tool `AskUserQuestion` para preguntarle al usuario si el mensaje le parece bien.
4. Si el usuario acepta el mensaje, entonces ejecuta `git commit` pasando el mensaje con un HEREDOC. Y si no, redacta uno nuevo y vuelve al paso 3.
5. Ejecuta `git status` para confirmar el resultado y muestra al usuario el mensaje del commit.
