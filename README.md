# CLOUD Storage

Penyimpanan file berbasis **Discord** dengan web UI modern. Upload, kelola, dan bagikan file melalui Discord sebagai backend storage — folder jadi Discord channel, file jadi attachment di dalamnya.

## Konsep

Aplikasi ini menggunakan Discord sebagai _storage backend_ melalui Bot API. Setiap operasi di aplikasi dipetakan ke aksi Discord:

| Aplikasi | Discord |
|----------|---------|
| Root storage | 1 Discord Guild (Server) |
| Folder (root) | Text Channel di bawah 1 Category |
| Sub-folder | DB-only, file upload ke channel parent |
| Upload file | Bot mengirim message + attachment ke channel |
| List/download file | Query local DB, redirect ke Discord CDN URL |
| Delete file | Bot hapus message dari channel |
| Rename folder | Bot rename channel |
| Delete folder | Bot hapus channel |

Sub-folder hanya ada di database (tidak membuat Discord channel baru). File yang diupload ke sub-folder dikirim ke channel root folder dengan label bot `[root/sub] filename`.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                     Browser                          │
│  Next.js 15 + React 19 + Tailwind v4 + shadcn/ui    │
└──────────────────────┬───────────────────────────────┘
                       │ HTTP (REST API)
┌──────────────────────▼───────────────────────────────┐
│                Go Backend (Echo v4)                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │   Auth   │  │  Folder  │  │       File        │  │
│  │  (JWT)   │  │   CRUD   │  │  Upload/Download  │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Admin   │  │ Storage  │  │     Discord       │  │
│  │  Panel   │  │  Stats   │  │     Service       │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
└──────┬────────────────────┬──────────────────────────┘
       │                    │
┌──────▼──────┐    ┌────────▼──────────┐
│  PostgreSQL │    │  Discord API      │
│  (metadata) │    │  (Bot via REST)   │
└─────────────┘    └───────────────────┘
```

## Tech Stack

### Backend
- **Go 1.24** + **Echo v4** — HTTP framework
- **GORM** + **PostgreSQL** — ORM & database
- **discordgo** — Discord Bot API wrapper
- **JWT** (golang-jwt) — Authentication

### Frontend
- **Next.js 15** (App Router) + **React 19**
- **Tailwind CSS v4** + **shadcn/ui** (new-york style)
- **Axios** + **SWR** — HTTP client & caching
- **Lucide React** — Icons

## Project Structure

```
discordStorage/
├── backend/
│   ├── main.go              # Entry point
│   ├── config/               # DB & Discord session init
│   ├── controllers/          # HTTP handlers
│   │   ├── auth_controller.go
│   │   ├── folder_controller.go
│   │   ├── file_controller.go
│   │   ├── storage_controller.go
│   │   ├── admin_controller.go
│   │   └── health_controller.go
│   ├── helpers/              # Response & upload utilities
│   ├── middlewares/           # JWT auth & admin-only middleware
│   ├── migration/            # AutoMigrate
│   ├── model/                # GORM models (User, Folder, File, Tier)
│   ├── repository/           # Data access layer
│   ├── routes/               # Route registration & DI wiring
│   ├── services/             # Business logic
│   │   ├── auth_service.go
│   │   ├── folder_service.go
│   │   ├── file_service.go
│   │   ├── discord_service.go
│   │   ├── storage_service.go
│   │   └── admin_service.go
│   └── utils/                # Env helper & error constants
│
├── frontend/
│   ├── app/                  # Next.js App Router pages
│   │   ├── page.tsx          # Landing
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── admin/page.tsx     # Admin panel (user tier management)
│   │   └── storage/
│   │       ├── page.tsx       # Folder list grid
│   │       └── [folderId]/
│   │           └── page.tsx   # File browser + sub-folders
│   ├── components/
│   │   ├── molecules/         # UI components
│   │   │   ├── Header, Sidebar
│   │   │   ├── FolderCard, FileCard
│   │   │   ├── CreateFolderModal, UploadZone
│   │   │   ├── FilePreviewModal, ConfirmModal, PromptModal
│   │   │   └── Table
│   │   ├── organisms/         # LoginForm, RegisterForm
│   │   └── templates/         # ConsoleTemplate, ConditionalLayout
│   ├── services/              # API client services
│   │   ├── api.ts             # Axios instance + interceptors
│   │   ├── auth.ts, folder.ts, file.ts
│   │   ├── admin.ts, stats.ts
│   ├── hooks/                 # useApi, useDebounce, useUserFromCookie
│   ├── lib/                   # Utilities & toast setup
│   └── middleware.ts          # Auth guard (cookie-based)
│
├── docs/
│   └── deployment-plan.md     # Jenkins CI/CD deployment plan
│
└── deploy/                    # (planned) Docker, Compose, Jenkinsfile
```

## Features

### Authentication
- Register & login dengan JWT
- Cookie-based session (httpOnly)
- Role: `user` dan `admin`

### Storage Management
- **Folder** = Discord text channel (root) atau DB-only (sub-folder)
- **Grid view** folder dengan file count
- **File browser** dengan thumbnail grid & table list view
- **Search** real-time filter by filename
- **Category tabs** filter by type (image, video, audio, document, other)
- **Sub-folder** — hierarki DB saja, upload ke channel root dengan label

### Upload
- **Drag & drop** + click-to-browse
- Multi-file upload
- Bot message format: `[folderLabel] filename`

### Preview & Download
- Image/Video preview di modal
- Direct download via Discord CDN URL

### Tiered Storage
| Tier | Limit | Label |
|------|-------|-------|
| `standard` | 1 GB | Standard Plan |
| `premium` | 50 GB | Premium Plan |
| `pro` | Unlimited | Pro Plan |

- Dashboard menampilkan usage bar sesuai tier
- Upload diblokir jika melebihi limit
- Admin bisa mengubah tier user via `/admin`

### Admin Panel
- List semua user dengan search & pagination
- Update tier user (Standard / Premium / Pro)
- Admin bisa melihat isi folder semua user

## API Endpoints

```
# Public
POST   /api/v1/register          Register
POST   /api/v1/login             Login
GET    /api/v1/health            Health check

# Protected (JWT required)
GET    /api/v1/profile           Get profile
GET    /api/v1/stats             Storage usage stats

# Folders
GET    /api/v1/folders           List folders (query: parent_id)
POST   /api/v1/folders           Create folder
GET    /api/v1/folders/:id       Get folder detail
PUT    /api/v1/folders/:id       Rename folder
DELETE /api/v1/folders/:id       Delete folder + all contents

# Files
GET    /api/v1/folders/:id/files List files (query: page, limit)
POST   /api/v1/folders/:id/files Upload files (multipart: files[])
GET    /api/v1/files/:id         Get file detail
DELETE /api/v1/files/:id         Delete file

# Admin (JWT + admin role required)
GET    /api/v1/admin/users       List all users (query: page, limit, q)
PUT    /api/v1/admin/users/:id/tier  Update user tier
```

## Setup Lokal

### Prerequisites
- Go 1.24+
- Node.js 22+
- PostgreSQL 17+
- Discord Bot (lihat [Discord Bot Setup](#discord-bot-setup))

### Backend

```bash
cd backend

# Salin dan isi environment variables
cp .env.example .env

# Install dependencies & jalankan
go mod tidy
go run main.go
# Server berjalan di :8000
```

### Frontend

```bash
cd frontend

# Salin dan isi environment variables
cp .env.example .env

# Install & jalankan
npm install
npm run dev
# Dev server di http://localhost:3000
```

### Environment Variables

**Backend** (`backend/.env`):

```env
APP_PORT=8000
APP_ENV=development
APP_NAME=DiscordStorage API

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASS=
DB_NAME=discord_storage
DB_SSLMODE=disable
DB_TIMEZONE=Asia/Jakarta

FRONTEND_ORIGIN=http://localhost:3000
JWT_SECRET=change_me_in_production

DISCORD_BOT_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_guild_id
DISCORD_STORAGE_CATEGORY_ID=your_category_id

MAX_FILE_SIZE_MB=5
UPLOAD_DIR=uploads
```

**Frontend** (`frontend/.env`):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/
NEXT_PUBLIC_APP_NAME=DiscordStorage
```

## Discord Bot Setup

1. Buka [Discord Developer Portal](https://discord.com/developers/applications)
2. Buat **New Application** → tab **Bot** → **Add Bot**
3. Copy **Bot Token**
4. Invite bot ke server dengan URL (ganti `CLIENT_ID`):

```
https://discord.com/developers/oauth2/authorize?client_id=CLIENT_ID&permissions=68672&scope=bot
```

Permissions yang dibutuhkan: `ManageChannels`, `SendMessages`, `ReadMessageHistory`, `AttachFiles`, `ManageMessages`

5. Buat **Category** di server Discord untuk storage (klik kanan server → Create Category)
6. Aktifkan **Developer Mode** di Discord (Settings → Appearance → Developer Mode)
7. Klik kanan Category → **Copy ID** → ini `DISCORD_STORAGE_CATEGORY_ID`
8. Klik kanan Server → **Copy ID** → ini `DISCORD_GUILD_ID`

## Production Deployment

Lihat [docs/deployment-plan.md](docs/deployment-plan.md) untuk setup lengkap:

- Docker multi-stage build (Go & Next.js)
- Docker Compose (backend + frontend + postgres + nginx)
- Jenkins CI/CD pipeline (checkout → test → deploy → verify)
- Nginx reverse proxy

Build production:

```bash
# Backend
go build -ldflags="-s -w" -o server .

# Frontend (standalone output)
npx next build
```

## License

MIT
