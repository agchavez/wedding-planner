# WeddingPlanner

App personal para planificar una boda: presupuesto por categoría con alertas, lista de invitados con asignación de mesa, lista de canciones, línea de tiempo del día, y un editor visual de distribución del salón (mesas, escenario, pista de baile, área de fotos) tipo "Lego".

Stack: Next.js (App Router, TypeScript, Tailwind), Prisma + MongoDB, Zustand (estado del editor de canvas), react-konva/Konva (canvas 2D), `@dnd-kit` (listas reordenables).

## Requisitos

- Node.js 20+
- Docker Desktop (para levantar MongoDB localmente)

## Puesta en marcha

```bash
npm install
docker compose up -d mongo   # levanta MongoDB como replica set de un solo nodo
cp .env.example .env.local   # si no existe ya
npx prisma db push           # sincroniza el esquema con la base de datos
npm run dev                  # http://localhost:3000
```

### Por qué MongoDB corre como replica set

Prisma requiere que MongoDB esté configurado como replica set para poder **escribir** datos (incluso un solo documento) — ver [pris.ly/d/mongodb-replica-set](https://pris.ly/d/mongodb-replica-set). El `docker-compose.yml` ya levanta el contenedor con `--replSet rs0` y lo inicializa automáticamente vía `healthcheck` la primera vez.

### Conectar a MongoDB Atlas en vez de local

Solo cambia `MONGODB_URI` en `.env.local` por la cadena de conexión de Atlas (que ya corre como replica set) — no se necesita ningún cambio de código.

## Estructura

- `src/app/` — rutas de la app en español: `/`, `/invitados`, `/presupuesto`, `/canciones`, `/linea-tiempo`, `/distribucion`.
- `src/lib/` — conexión a Prisma, helpers de negocio (`wedding.ts`, `budgetAlerts.ts`, `seatGeometry.ts`, `seatingLayout.ts`).
- `src/generated/prisma/` — cliente de Prisma generado (no se edita a mano).
- `prisma/schema.prisma` — modelos de datos.

## Notas de v1

- Pensada para una sola boda, sin autenticación. El modelo de datos ya incluye `weddingId` en cada colección para poder agregar multi-boda/autenticación más adelante sin reescribir el esquema.
- Pendiente para versiones futuras: zoom/pan en el editor de distribución, exportar el plano como imagen, deshacer/rehacer, importar/exportar invitados en CSV.
