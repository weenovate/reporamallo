# Repositorio Ramallo

Aplicación de almacenamiento, indexado y consulta de documentos de la Municipalidad de Ramallo.

## Stack

- **Next.js 15** (App Router, Server Actions)
- **TypeScript**, **Tailwind CSS**, **shadcn/ui**
- **Prisma** sobre **MySQL 8** (InnoDB, FULLTEXT)
- **Meilisearch** para búsqueda
- **Argon2id** para hashing de contraseñas
- **Resend** para reset de contraseña
- **pdf-parse** + **wink-nlp** para extracto y tags automáticos (en español)

## Requisitos

- Node.js 20+
- Docker (para MySQL y Meilisearch en dev) o un MySQL 8 y Meilisearch accesibles
- En producción: Almalinux 9 + Node 20 (gestionado por cPanel) + MySQL 8 + Meilisearch instalado en el VPS

## Setup local

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

La app queda en http://localhost:3000.
Credenciales por defecto del admin: ver `.env.example` (`SEED_ADMIN_*`).

## Scripts

- `npm run dev` — server de desarrollo
- `npm run build && npm start` — producción
- `npm run prisma:migrate` — crea/migra schema en MySQL
- `npm run prisma:seed` — admin inicial + entidades y categorías
- `npm run meili:reindex` — reindexa todos los documentos en Meilisearch

## Roles

- **ADMIN**: acceso total, incluye CRUD de usuarios, restaurar soft-deletes y panel de configuración.
- **GESTOR**: acceso a todo el contenido (entidades, categorías, documentos), salvo administración de usuarios y restauración.

## Estructura de carpetas

```
src/
  app/             # rutas Next.js (App Router)
  components/      # UI compartida
  lib/             # auth, storage, search, nlp, audit, email, db
  server/actions/  # server actions por dominio
prisma/            # schema + migrations + seed
storage/           # archivos PDF subidos (no commiteado)
```

## Fases de desarrollo

- [x] Fase 1 — Scaffolding (Next.js + Prisma + Tailwind + docker-compose)
- [ ] Fase 2 — Modelo Prisma + migraciones + seed
- [ ] Fase 3 — Auth + reset password
- [ ] Fase 4 — Layout, navbar, theme switcher, toasts, confirm dialog
- [ ] Fase 5 — CRUD Entidades y Categorías
- [ ] Fase 6 — CRUD Documentos (sin NLP)
- [ ] Fase 7 — NLP: extracto y tags automáticos
- [ ] Fase 8 — Búsqueda Meilisearch
- [ ] Fase 9 — Vista pública con filtros acumulativos en pills
- [ ] Fase 10 — Usuarios + restauración soft-delete
- [ ] Fase 11 — Panel de configuración
- [ ] Fase 12 — Auditoría + guía de deploy en cPanel
