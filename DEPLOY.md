# Deploy en VPS — Almalinux 9 + cPanel + MySQL

Guía paso a paso para poner Repositorio Ramallo en producción.

> **Convenciones**
> - Usuario cPanel: `ramallo` (reemplazar por el real)
> - Dominio: `repositorio.ramallo.gob.ar` (reemplazar por el real)
> - Home del usuario: `/home/ramallo`
> - Carpeta de la app: `/home/ramallo/apps/reporamallo`
> - Carpeta de uploads: `/home/ramallo/storage/reporamallo`

---

## 1. Pre-requisitos en el VPS

Tareas que el operador con acceso root debe hacer **una sola vez**.

### 1.1 Node.js 20 LTS

cPanel/WHM trae el módulo **"Setup Node.js App"** (basado en Passenger). Si Node 20 no está disponible:

```bash
# como root
dnf module reset nodejs -y
dnf module install nodejs:20/common -y
node -v   # esperado: v20.x
```

### 1.2 MySQL — verificar versión y FULLTEXT

Necesitamos MySQL 8.x (InnoDB con FULLTEXT). cPanel suele traer MariaDB; **verificar** que sea MySQL 8 o MariaDB ≥ 10.5 con soporte de FULLTEXT en InnoDB. Si es MariaDB vieja, pedir upgrade.

```bash
mysql --version
```

### 1.3 Meilisearch como servicio systemd

```bash
# como root
useradd -r -s /sbin/nologin meilisearch || true
mkdir -p /var/lib/meilisearch /etc/meilisearch
chown meilisearch:meilisearch /var/lib/meilisearch

curl -L https://install.meilisearch.com | sh
mv ./meilisearch /usr/local/bin/meilisearch
chmod +x /usr/local/bin/meilisearch

# generar master key
MEILI_KEY=$(openssl rand -hex 32)
echo "MEILI_MASTER_KEY=${MEILI_KEY}" > /etc/meilisearch/meilisearch.env
echo "MEILI_ENV=production"          >> /etc/meilisearch/meilisearch.env
echo "MEILI_DB_PATH=/var/lib/meilisearch/data" >> /etc/meilisearch/meilisearch.env
echo "MEILI_HTTP_ADDR=127.0.0.1:7700" >> /etc/meilisearch/meilisearch.env
chmod 600 /etc/meilisearch/meilisearch.env

cat >/etc/systemd/system/meilisearch.service <<'EOF'
[Unit]
Description=Meilisearch
After=network.target

[Service]
Type=simple
User=meilisearch
Group=meilisearch
EnvironmentFile=/etc/meilisearch/meilisearch.env
ExecStart=/usr/local/bin/meilisearch
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now meilisearch
systemctl status meilisearch
```

> Meilisearch queda escuchando **solo en `127.0.0.1:7700`** (no se expone al exterior). El acceso público lo da la app Next.js mediante su API.
> Guardar la `MEILI_MASTER_KEY` — se usa en `.env` de la app.

### 1.4 Firewall

```bash
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

Meilisearch no se expone porque está bindeado a `127.0.0.1`.

---

## 2. Crear base de datos y usuario MySQL

Desde **cPanel → MySQL Databases**:

1. Crear base: `ramallo_reporamallo`
2. Crear usuario: `ramallo_repo` con contraseña fuerte
3. Asignar el usuario a la base con **ALL PRIVILEGES**

Anotar `DATABASE_URL`:
```
mysql://ramallo_repo:CONTRASEÑA@localhost:3306/ramallo_reporamallo
```

---

## 3. Crear la app en cPanel (Passenger)

Desde **cPanel → Setup Node.js App**:

| Campo | Valor |
|---|---|
| Node.js version | 20.x |
| Application mode | Production |
| Application root | `apps/reporamallo` |
| Application URL | `repositorio.ramallo.gob.ar` (o subdominio) |
| Application startup file | `server.js` |

Esto crea el virtualenv de Node y un archivo `passenger_wsgi.js` / `server.js` que Apache invoca. **No** instalar dependencias todavía — primero subimos el código.

---

## 4. Subir el código

Opción recomendada: clonar desde git.

```bash
# como usuario ramallo (SSH)
cd ~
mkdir -p apps
cd apps
git clone https://github.com/weenovate/reporamallo.git
cd reporamallo
```

Si no hay acceso SSH a GitHub desde el VPS, hacer `npm run build` localmente y subir por SFTP las carpetas `.next/`, `public/`, `node_modules/`, `prisma/`, `package.json`, `package-lock.json` y `server.js`.

---

## 5. Configurar variables de entorno

```bash
cd ~/apps/reporamallo
cp .env.example .env
nano .env
```

Setear como mínimo:

```ini
DATABASE_URL="mysql://ramallo_repo:CONTRASEÑA@localhost:3306/ramallo_reporamallo"
APP_URL="https://repositorio.ramallo.gob.ar"
SESSION_SECRET="<openssl rand -hex 64>"
STORAGE_DIR="/home/ramallo/storage/reporamallo"
MAX_UPLOAD_SIZE_MB="25"
MEILISEARCH_HOST="http://127.0.0.1:7700"
MEILISEARCH_API_KEY="<MEILI_MASTER_KEY del paso 1.3>"
RESEND_API_KEY="re_xxxxxxxx"
RESEND_FROM="Repositorio Ramallo <no-reply@ramallo.gob.ar>"
SEED_ADMIN_EMAIL="admin@ramallo.gob.ar"
SEED_ADMIN_USERNAME="admin"
SEED_ADMIN_PASSWORD="<contraseña fuerte y temporal>"
SEED_ADMIN_FIRSTNAME="Admin"
SEED_ADMIN_LASTNAME="Ramallo"
```

Crear la carpeta de uploads:

```bash
mkdir -p /home/ramallo/storage/reporamallo
chmod 750 /home/ramallo/storage/reporamallo
```

---

## 6. Instalar dependencias y construir

Desde **cPanel → Setup Node.js App → Run NPM Install** (botón), o por SSH usando el wrapper que cPanel deja en el home:

```bash
cd ~/apps/reporamallo
source /home/ramallo/nodevenv/apps/reporamallo/20/bin/activate
npm ci --omit=dev=false
npm run prisma:generate
npm run build
```

> El `activate` carga las variables de `PATH` con el Node 20 elegido por cPanel.

---

## 7. Aplicar migraciones y seed

```bash
cd ~/apps/reporamallo
source /home/ramallo/nodevenv/apps/reporamallo/20/bin/activate

# Crea tablas, indices y FULLTEXT segun prisma/migrations
npm run prisma:deploy

# Admin inicial + entidades + categorias + settings por defecto
npm run prisma:seed
```

Verificar que se creó el usuario admin:

```bash
mysql -u ramallo_repo -p ramallo_reporamallo -e "SELECT email, role FROM User;"
```

**Inmediatamente después, loguearse a la app y cambiar la contraseña del admin** desde la vista de perfil.

---

## 8. Server entrypoint para Passenger

cPanel usa Passenger, que necesita un `server.js` que arranque Next en modo standalone.

Crear `~/apps/reporamallo/server.js`:

```js
const { createServer } = require('http');
const next = require('next');

const port = process.env.PORT || 3000;
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
```

Desde **cPanel → Setup Node.js App → Restart**.

---

## 9. SSL

cPanel → **SSL/TLS Status** → ejecutar **AutoSSL** sobre el dominio. Forzar HTTPS desde **Domains → Force HTTPS Redirect**.

---

## 10. Verificación

1. `https://repositorio.ramallo.gob.ar/` → vista pública (vacía por ahora).
2. `https://repositorio.ramallo.gob.ar/login` → login con admin.
3. Probar subir un PDF y buscarlo.
4. Revisar logs:
   - App: `cPanel → Errors` o `tail -f ~/apps/reporamallo/logs/*.log`
   - Meilisearch: `journalctl -u meilisearch -f`

---

## 11. Backups

Configurar en cron del usuario `ramallo`:

```cron
# DB nightly
0 2 * * * mysqldump --single-transaction ramallo_reporamallo | gzip > /home/ramallo/backups/db-$(date +\%Y\%m\%d).sql.gz

# Uploads weekly
0 3 * * 0 tar -czf /home/ramallo/backups/storage-$(date +\%Y\%m\%d).tar.gz /home/ramallo/storage/reporamallo

# Retencion: 30 dias
0 4 * * * find /home/ramallo/backups -mtime +30 -delete
```

Meilisearch no requiere backup: se reconstruye con `npm run meili:reindex`.

---

## 12. Actualizaciones (re-deploys)

```bash
cd ~/apps/reporamallo
source /home/ramallo/nodevenv/apps/reporamallo/20/bin/activate

git pull origin main
npm ci --omit=dev=false
npm run prisma:generate
npm run prisma:deploy   # solo aplica migraciones nuevas
npm run build
# desde cPanel: Restart App
```

Si una migración nueva implica cambios en el índice de búsqueda:

```bash
npm run meili:reindex
```

---

## 13. Troubleshooting rápido

| Problema | Diagnóstico |
|---|---|
| 502 / app no levanta | `tail -f ~/apps/reporamallo/logs/*.log`, revisar `.env` y `node -v` ≥ 20 |
| Búsqueda no devuelve resultados | `systemctl status meilisearch`, `curl http://127.0.0.1:7700/health`, correr `npm run meili:reindex` |
| Error de FULLTEXT en migración | Verificar que la tabla `Document` quedó en **InnoDB** y MySQL es 8.x. Migraciones de Prisma usan InnoDB por default |
| `EACCES` al subir archivo | `chmod 750 /home/ramallo/storage/reporamallo` y que sea propiedad del usuario `ramallo` |
| Email de reset no llega | Revisar `RESEND_API_KEY` y que el dominio de `RESEND_FROM` esté verificado en Resend |
