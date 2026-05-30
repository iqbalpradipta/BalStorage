# BalStorage

BalStorage adalah aplikasi cloud storage berbasis Discord. Metadata file/folder disimpan di PostgreSQL, sedangkan binary file disimpan sebagai attachment Discord melalui bot.

## Ringkasan

- Backend: Go, Echo, GORM, PostgreSQL, Discord Bot API.
- Frontend: Next.js, React, Tailwind CSS.
- Auth: JWT dengan role `user` dan `admin`.
- Storage: Discord dipakai sebagai tempat attachment, aplikasi tetap memakai database sebagai sumber metadata.
- Deploy: Docker Compose via Jenkins pipeline.

## Cara Kerja Discord Storage

Ada 2 mode channel Discord:

| Mode | Behavior |
| --- | --- |
| `folder` | 1 root folder membuat 1 Discord channel. Sub-folder hanya ada di DB dan file dikirim ke channel root folder. |
| `user` | 1 user memiliki 1 Discord channel. Semua folder user tersebut memakai channel yang sama, dengan label path folder pada message. |

Mode ini tidak lagi dibaca dari `.env`. Nilainya disimpan di database pada `app_settings.discord_channel_mode` dan bisa diubah dari Admin UI. Jika setting belum ada, default internal adalah `folder`.

Mapping utama:

| Aplikasi | Discord |
| --- | --- |
| Upload file | Bot mengirim message + attachment |
| File name saat upload | Dibuat random berbasis UUID dan tetap memakai extension asli |
| Rename file | Update nama di DB dan teks message Discord |
| Grid thumbnail | Melalui backend proxy `/api/v1/files/:id/thumbnail` dengan resize kecil |
| Preview file | Melalui backend proxy `/api/v1/files/:id/preview` |
| Download file | Melalui backend proxy `/api/v1/files/:id/download` dengan `Content-Disposition: attachment` |
| Delete file/folder | Soft delete dulu di DB |
| Cleanup deleted data | Setelah retention 30 hari, Discord message/channel dan row DB dihapus permanen |

Catatan: Discord tidak mengizinkan rename attachment yang sudah ter-upload. Rename file hanya mengubah nama yang tampil di aplikasi dan teks message Discord.

## Fitur

### User

- Register dan login.
- Upload multi-file.
- Nama file upload dibuat random otomatis.
- Rename file.
- Delete file dan folder dengan soft delete.
- Preview image, video, dan audio.
- Thumbnail image di grid memakai hasil resize backend agar file besar tidak langsung diunduh penuh.
- Download file paksa lewat backend proxy, bukan membuka tab Discord CDN.
- Grid/list view.
- Search file.
- Filter kategori: image, video, audio, document, other.
- Sub-folder.

### Admin

- List user dengan search dan pagination.
- Ubah tier user: Standard, Premium, Pro.
- Ubah Discord channel mode dari Admin UI.
- Admin dapat melihat isi folder semua user.

### Security dan Operasional

- JWT secret wajib minimal 32 karakter.
- Deploy script/Jenkins auto-generate `JWT_SECRET` jika kosong, placeholder, atau terlalu pendek.
- Rate limit untuk register dan login.
- CORS memakai `FRONTEND_ORIGIN`.
- Download dan preview file tidak membuka URL Discord langsung dari UI.
- URL attachment Discord divalidasi backend sebelum diproxy.
- Deleted item cleanup otomatis aktif secara default.

## Tech Stack

### Backend

- Go 1.24+
- Echo v4
- GORM
- PostgreSQL
- discordgo
- JWT `golang-jwt`

### Frontend

- Next.js 15
- React 19
- Tailwind CSS v4
- Axios
- Lucide React

## Struktur Project

```text
discordStorage/
|-- backend/
|   |-- main.go
|   |-- config/
|   |-- controllers/
|   |-- helpers/
|   |-- middlewares/
|   |-- migration/
|   |-- model/
|   |-- repository/
|   |-- routes/
|   |-- services/
|   `-- utils/
|-- frontend/
|   |-- app/
|   |-- components/
|   |-- hooks/
|   |-- lib/
|   `-- services/
|-- deploy/
|   |-- Jenkinsfile
|   |-- docker-compose.yml
|   |-- nginx/
|   `-- scripts/
`-- docs/
```

## API Endpoints

```text
# Public
POST   /api/v1/register
POST   /api/v1/login
GET    /api/v1/health

# Protected
GET    /api/v1/profile
GET    /api/v1/stats

# Folders
GET    /api/v1/folders
POST   /api/v1/folders
GET    /api/v1/folders/:id
PUT    /api/v1/folders/:id
DELETE /api/v1/folders/:id

# Files
GET    /api/v1/folders/:id/files
POST   /api/v1/folders/:id/files
GET    /api/v1/files/:id
GET    /api/v1/files/:id/thumbnail
GET    /api/v1/files/:id/preview
GET    /api/v1/files/:id/download
PUT    /api/v1/files/:id
DELETE /api/v1/files/:id

# Admin
GET    /api/v1/admin/users
PUT    /api/v1/admin/users/:id/tier
GET    /api/v1/admin/settings/discord-channel-mode
PUT    /api/v1/admin/settings/discord-channel-mode
```

## Environment

### Backend `.env`

```env
APP_PORT=8000
APP_ENV=development
APP_NAME=BalStorage API

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASS=
DB_NAME=cloud_storage
DB_SSLMODE=disable
DB_TIMEZONE=Asia/Jakarta

FRONTEND_ORIGIN=http://localhost:3000
JWT_SECRET=<generate-at-least-32-char-random-string>

DISCORD_BOT_TOKEN=<bot-token>
DISCORD_GUILD_ID=<guild-id>
DISCORD_STORAGE_CATEGORY_ID=<category-id>

MAX_FILE_SIZE_MB=5
UPLOAD_DIR=uploads

DELETED_ITEMS_RETENTION_DAYS=30
DELETED_ITEMS_CLEANUP_INTERVAL_HOURS=24
DELETED_ITEMS_CLEANUP_ENABLED=true

THUMBNAIL_CACHE_TTL_DAYS=30
THUMBNAIL_CACHE_MAX_MB=1024
THUMBNAIL_CACHE_CLEANUP_INTERVAL_HOURS=24
THUMBNAIL_CACHE_CLEANUP_ENABLED=true
```

`DISCORD_CHANNEL_MODE` tidak dipakai lagi di env. Mode channel disimpan di database dan diatur dari Admin UI.

### Frontend `.env`

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/
NEXT_PUBLIC_APP_NAME=BalStorage
```

### Production env

Template production ada di:

```text
deploy/.env.production.example
```

File aktual di VPS:

```text
~/BalStorage/deploy/.env.production
```

Jenkins/deploy akan otomatis membuat `JWT_SECRET` jika nilai production kosong, placeholder, atau kurang dari 32 karakter. Env lain seperti DB, Discord token, domain frontend, dan retention cleanup tetap sebaiknya diisi eksplisit di VPS.

## Setup Lokal

### Prerequisites

- Go 1.24+
- Node.js 22+
- PostgreSQL
- Discord Bot

### Backend

```bash
cd backend
cp .env.example .env
go mod tidy
go run main.go
```

Backend berjalan di:

```text
http://localhost:8000
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend berjalan di:

```text
http://localhost:3000
```

## Discord Bot Setup

1. Buka Discord Developer Portal.
2. Buat application baru.
3. Masuk ke tab Bot, lalu buat bot.
4. Copy bot token ke `DISCORD_BOT_TOKEN`.
5. Invite bot ke server dengan permission:

```text
ManageChannels
SendMessages
ReadMessageHistory
AttachFiles
ManageMessages
```

6. Buat Discord Category khusus storage.
7. Aktifkan Developer Mode di Discord.
8. Copy Server ID ke `DISCORD_GUILD_ID`.
9. Copy Category ID ke `DISCORD_STORAGE_CATEGORY_ID`.

## Delete dan Retention Cleanup

Delete file/folder memakai soft delete melalui kolom `deleted_at`.

Default cleanup:

- Retention: 30 hari.
- Interval check: 24 jam.
- Cleanup aktif.

Setelah data melewati retention:

- File message di Discord dihapus.
- Dalam mode `folder`, channel root folder yang sudah deleted ikut dihapus.
- Row file/folder di database dihapus permanen.

Konfigurasi:

```env
DELETED_ITEMS_RETENTION_DAYS=30
DELETED_ITEMS_CLEANUP_INTERVAL_HOURS=24
DELETED_ITEMS_CLEANUP_ENABLED=true
```

## Thumbnail, Download, dan Preview

Frontend tidak lagi membuka URL Discord CDN secara langsung untuk download.

- Thumbnail grid memakai `GET /api/v1/files/:id/thumbnail?size=480`, lalu backend mengambil attachment asli dan mengembalikan JPEG kecil.
- Thumbnail disimpan otomatis di `UPLOAD_DIR/thumbnails`, sehingga request berikutnya tidak perlu fetch ulang ke Discord.
- Thumbnail cache dibatasi oleh TTL dan total size. Default: 30 hari dan 1024 MB.
- Preview memakai `GET /api/v1/files/:id/preview`.
- Download memakai `GET /api/v1/files/:id/download`.
- Download dipaksa memakai response header `Content-Disposition: attachment`.
- UI mencegah context menu pada preview media untuk mengurangi aksi "open image in new tab".

Catatan keamanan: browser tidak bisa 100% mencegah user teknis mengambil resource jika user tersebut memang punya akses authenticated. Tujuan implementasi ini adalah tidak mengekspos URL Discord langsung di UI normal dan membuat tombol download benar-benar melakukan download.

## CI/CD Jenkins

Pipeline berada di:

```text
deploy/Jenkinsfile
```

Behavior pipeline:

- Trigger otomatis dari GitHub webhook.
- Checkout source dari GitHub.
- Test backend.
- Install/build frontend.
- SSH ke VPS memakai Jenkins Credential.
- Pull latest source di VPS.
- Build ulang Docker image backend dan frontend.
- Recreate container dengan Docker Compose.
- Reload nginx.
- Verify health endpoint.

Credential seperti SSH private key, target host, dan secret tidak disimpan di GitHub. Simpan di Jenkins Credentials.

## Nginx dan SSL

Nginx config production berada di:

```text
deploy/nginx/cloud-storage.conf
```

Certificate path Let's Encrypt aman disimpan di config karena hanya path lokal server, bukan private key content:

```nginx
ssl_certificate /etc/letsencrypt/live/<domain>/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/<domain>/privkey.pem;
```

## Build Manual

Backend:

```bash
cd backend
go test ./...
go vet ./...
go build -ldflags="-s -w" -o server .
```

Frontend:

```bash
cd frontend
npm install
npm run build
```

Jika build frontend kehabisan memory di Windows/local:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=4096'
npm run build
```

## License

MIT
