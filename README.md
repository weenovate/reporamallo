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
- [x] Fase 2 — Modelo Prisma + migración inicial + seed
- [x] Fase 3 — Auth + reset password (Argon2id, sesiones opacas, Resend)
- [x] Fase 4 — Layout, navbar, theme switcher (4 paletas), toasts, confirm dialog
- [x] Fase 5 — CRUD Entidades y Categorías con soft delete
- [x] Fase 6 — CRUD Documentos (filesystem + pdf-parse)
- [x] Fase 7 — NLP local en español (extracto + tags automáticos)
- [x] Fase 8 — Búsqueda Meilisearch (fallback MySQL FULLTEXT) + script de reindex
- [x] Fase 9 — Vista pública (cards/lista) con pills acumulativas
- [x] Fase 10 — Usuarios (admin) + papelera con restauración
- [x] Fase 11 — Panel de configuración (admin)
- [x] Fase 12 — Vista de auditoría (admin) + `DEPLOY.md` para Almalinux 9 + cPanel

## Estructura del producto

- `/` — vista pública, sin login. Cards o lista, filtros acumulativos en pills, paginación.
- `/login` — login con usuario o email + "Olvidé mi contraseña".
- `/documentos` — listado y CRUD (HU1-1, HU1-2).
- `/documentos/nuevo`, `/documentos/[id]/editar` — alta/edición con análisis automático del PDF (HU1-3, HU1-4).
- `/entidades` — administración de entidades y categorías (HU3-1 a HU3-3).
- `/usuarios` — admin: alta, edición, baja, reset de contraseña (HU4-1).
- `/papelera` — admin: restauración de entidades, categorías, documentos y usuarios soft-deleted.
- `/configuracion` — admin: tags por defecto, máximo de caracteres del extracto, configuración Resend.
- `/auditoria` — admin: log completo con filtros y before/after expandibles.
- `/perfil` — datos personales + cambio de contraseña.

Ver `DEPLOY.md` para la guía completa de instalación en VPS.
