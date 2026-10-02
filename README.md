<div align="center">

# 💍 Wedplan

App personal para planificar una boda de principio a fin: presupuesto, invitados, canciones, línea de tiempo y un editor visual de distribución del salón.

[![CI](https://img.shields.io/github/actions/workflow/status/agchavez/wedding-planner/ci.yml?branch=main&style=for-the-badge&label=CI)](https://github.com/agchavez/wedding-planner/actions/workflows/ci.yml)
[![Last Commit](https://img.shields.io/github/last-commit/agchavez/wedding-planner?style=for-the-badge)](https://github.com/agchavez/wedding-planner/commits/main)
[![PRs](https://img.shields.io/badge/PRs-code%20owner%20review-blueviolet?style=for-the-badge)](./.github/CODEOWNERS)

</div>

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js%2016-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS%204-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-764ABC?style=for-the-badge&logo=react&logoColor=white)
![Konva](https://img.shields.io/badge/Konva-0D83CD?style=for-the-badge&logo=html5&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

</div>

## Índice

- [Características](#-características)
- [Stack tecnológico](#-stack-tecnológico)
- [Puesta en marcha](#-puesta-en-marcha)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Contribuir](#-contribuir)
- [Roadmap](#-roadmap)

## ✨ Características

| Módulo | Descripción |
|---|---|
| 💰 **Presupuesto** | Categorías de gasto con alertas cuando se supera el límite asignado |
| 👥 **Invitados** | Lista de invitados con asignación de mesa y estado de confirmación |
| 🎵 **Canciones** | Playlist del evento organizada por categoría |
| 🕐 **Línea de tiempo** | Cronograma del día del evento |
| 🪑 **Distribución** | Editor visual tipo "Lego" para el layout del salón — mesas, escenario, pista de baile, zona de fotos |

## 🛠 Stack tecnológico

| Categoría | Tecnología |
|---|---|
| Framework | [Next.js](https://nextjs.org) (App Router) + [React](https://react.dev) |
| Lenguaje | [TypeScript](https://www.typescriptlang.org) |
| Estilos | [Tailwind CSS](https://tailwindcss.com) |
| Base de datos | [MongoDB](https://www.mongodb.com) vía [Prisma](https://www.prisma.io) |
| Estado (editor de canvas) | [Zustand](https://github.com/pmndrs/zustand) |
| Canvas 2D | [Konva](https://konvajs.org) / [react-konva](https://github.com/konvajs/react-konva) |
| Listas reordenables | [`@dnd-kit`](https://dndkit.com) |
| Infraestructura local | [Docker](https://www.docker.com) |

## 🚀 Puesta en marcha

**Requisitos:** Node.js 20+ y Docker Desktop (para MongoDB local).

```bash
npm install
docker compose up -d mongo   # levanta MongoDB como replica set de un solo nodo
cp .env.example .env.local   # si no existe ya
npx prisma db push           # sincroniza el esquema con la base de datos
npm run dev                  # http://localhost:3000
```

Completa `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) y `ADMIN_EMAIL` / `ADMIN_PASSWORD` en `.env.local`: al arrancar se crea ese administrador si todavía no existe ninguno.

<details>
<summary>¿Por qué MongoDB corre como replica set?</summary>

Prisma requiere que MongoDB esté configurado como replica set para poder **escribir** datos (incluso un solo documento) — ver [pris.ly/d/mongodb-replica-set](https://pris.ly/d/mongodb-replica-set). El `docker-compose.yml` ya levanta el contenedor con `--replSet rs0` y lo inicializa automáticamente vía `healthcheck` la primera vez.

</details>

<details>
<summary>Conectar a MongoDB Atlas en vez de local</summary>

Solo cambia `MONGODB_URI` en `.env.local` por la cadena de conexión de Atlas (que ya corre como replica set) — no se necesita ningún cambio de código.

</details>

## 🔐 Usuarios, bodas y roles

- Autenticación con [Better Auth](https://better-auth.com): correo y contraseña (registro abierto en `/registro`) y Google (si `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` están definidos).
- Cada boda es una **organización** de Better Auth. Quien la crea queda como *Pareja*; desde `/participantes` invita a otros con un enlace y un rol:

  | Rol | Puede |
  | --- | --- |
  | Pareja (`owner`) | Todo, incluida la gestión de participantes |
  | Organizador (`admin`) | Editar todo e invitar o quitar participantes |
  | Colaborador (`member`) | Editar los datos de la boda |
  | Solo lectura (`viewer`) | Ver, sin cambiar nada |

- Una persona puede participar en varias bodas y cambiar entre ellas desde el selector del sidebar. La boda activa vive en la sesión.
- Toda lectura pasa por `requireWeddingContext()` y toda mutación por `getEditableWeddingId()` (`src/lib/wedding.ts`): exigen sesión, limitan los datos a la boda activa y bloquean a quien tiene rol de solo lectura.
- **Consola `/admin`** (administradores de la plataforma): resumen con salud del sistema, actividad y alertas de seguridad; bodas con sus métricas y participantes; usuarios y en qué bodas participan; auditoría filtrable; sesiones activas. El admin no crea bodas: las crean los usuarios.
- **Auditoría** (`AuditLog`): inicios de sesión (también los fallidos, con IP), registros, cada cambio en los datos de una boda y cada acción de administración. Se conserva 180 días (índice TTL).

## 🚢 Despliegue

Producción corre en [Dokploy](https://dokploy.partners.hn) (proyecto **Wedding Planner**, entorno `production`) en https://wedding.partners.hn.

- Cada push a `main` ejecuta `.github/workflows/deploy.yml`: construye la imagen con el `Dockerfile` en GitHub Actions, la publica en `ghcr.io/agchavez/wedding-planner` (`:sha-<commit>` y `:latest`) y con `scripts/dokploy-deploy.mjs` fija esa imagen en la app de Dokploy y la despliega. Dokploy no construye nada (los PRs pasan antes por `ci.yml`).
- Para volver a una versión anterior: en Dokploy cambia la imagen a otro `:sha-<commit>` y despliega, o re-ejecuta el workflow `Deploy` de ese commit.
- HTTPS lo resuelve Traefik de Dokploy con Let's Encrypt; el healthcheck es `/api/health`.
- Los comprobantes subidos viven en el volumen `wedding-planner-uploads`, montado en `/app/uploads`.

Las variables de entorno se configuran en Dokploy (app → *Environment*), no en GitHub:

| Variable | Uso |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas (base `weddingplanner`) |
| `BETTER_AUTH_SECRET` | Firma de sesiones |
| `BETTER_AUTH_URL` | `https://wedding.partners.hn` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Administrador inicial (solo se usa si no existe ningún admin) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Inicio de sesión con Google (opcional) |
| `TZ` | `America/Tegucigalpa` |

En GitHub (environment `production`) solo va lo necesario para desplegar:

| Tipo | Nombre | Uso |
| --- | --- | --- |
| Secret | `DOKPLOY_URL` | `https://dokploy.partners.hn` (sin `/api`) |
| Secret | `DOKPLOY_API_KEY` | API key de Dokploy (perfil → *API/CLI*) |
| Variable | `DOKPLOY_APP_ID` | `applicationId` de la app en Dokploy |

En Dokploy la app usa *Source: Docker* con la imagen de ghcr y un registro `ghcr.io` con un PAT de solo `read:packages` (o el paquete público).

## 📁 Estructura del proyecto

```
src/
├─ app/(app)/           # rutas protegidas: /, /invitados, /presupuesto, /canciones, /linea-tiempo, /distribucion, /cuenta, /admin
├─ app/(auth)/login/    # inicio de sesión
├─ app/api/             # /api/auth (Better Auth) y /api/health
├─ components/          # componentes de UI compartidos
├─ proxy.ts             # redirige al login si no hay cookie de sesión
├─ lib/                 # auth.ts, session.ts, conexión a Prisma/Mongo y helpers de negocio (wedding.ts, budgetAlerts.ts, seatGeometry.ts, seatingLayout.ts)
└─ generated/prisma/    # cliente de Prisma generado (no se edita a mano)
prisma/
└─ schema.prisma        # modelos de datos
```

## 🤝 Contribuir

Este repo usa Conventional Commits, CI obligatorio y revisión de code owner en cada PR. Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para el flujo completo.

## 🗺 Roadmap

- [ ] Zoom/pan en el editor de distribución
- [ ] Exportar el plano como imagen
- [ ] Deshacer/rehacer en el editor
- [ ] Importar/exportar invitados en CSV

> **Nota:** v1 está pensada para una sola boda, sin autenticación. El modelo de datos ya incluye `weddingId` en cada colección para soportar multi-boda/autenticación más adelante sin reescribir el esquema.
