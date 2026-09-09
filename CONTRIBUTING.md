# Contribuir

## Flujo de trabajo

1. Crea una rama a partir de `main`: `feat/nombre-corto`, `fix/nombre-corto`, `chore/...`, etc.
2. Haz commits siguiendo la convención de abajo.
3. Abre un Pull Request hacia `main` usando la plantilla.
4. `main` está protegida: se requiere al menos **1 aprobación del code owner** (`@agchavez`) y que los checks de CI pasen antes de poder hacer merge. No se permite push directo a `main`.

## Commits

Este repo usa [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/):

```
<tipo>(<alcance opcional>): <descripción corta>

[cuerpo opcional]

[footer opcional]
```

Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

Ejemplos:

```
feat(invitados): agregar filtro por estado de confirmación
fix(presupuesto): corregir cálculo de total con descuentos
chore(deps): actualizar prisma a 6.19.3
```

Los commits de cada PR se validan automáticamente con `commitlint` en CI.

## Versionado y releases

El versionado sigue [SemVer](https://semver.org/lang/es/) (`vMAJOR.MINOR.PATCH`).

Para publicar una versión:

```
git tag v1.2.0
git push origin v1.2.0
```

Al hacer push de un tag `v*.*.*`, el workflow `.github/workflows/release.yml` construye el proyecto y crea automáticamente un GitHub Release con las notas generadas a partir de los PRs/commits incluidos desde el tag anterior.
