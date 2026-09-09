<div align="center">

# 💍 WeddingPlanner

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

<details>
<summary>¿Por qué MongoDB corre como replica set?</summary>

Prisma requiere que MongoDB esté configurado como replica set para poder **escribir** datos (incluso un solo documento) — ver [pris.ly/d/mongodb-replica-set](https://pris.ly/d/mongodb-replica-set). El `docker-compose.yml` ya levanta el contenedor con `--replSet rs0` y lo inicializa automáticamente vía `healthcheck` la primera vez.

</details>

<details>
<summary>Conectar a MongoDB Atlas en vez de local</summary>

Solo cambia `MONGODB_URI` en `.env.local` por la cadena de conexión de Atlas (que ya corre como replica set) — no se necesita ningún cambio de código.

</details>

## 📁 Estructura del proyecto

```
src/
├─ app/                 # rutas en español: /, /invitados, /presupuesto, /canciones, /linea-tiempo, /distribucion
├─ components/          # componentes de UI compartidos
├─ lib/                 # conexión a Prisma y helpers de negocio (wedding.ts, budgetAlerts.ts, seatGeometry.ts, seatingLayout.ts)
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
