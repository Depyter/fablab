# FabLab Management System

> A full-lifecycle web app for university fabrication labs — from service browsing to job completion.

## Tech Stack

**Frontend**
![Next.js](https://img.shields.io/badge/Next.js_16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?style=flat-square&logo=shadcnui&logoColor=white)
![TanStack Form](https://img.shields.io/badge/TanStack_Form-FF4154?style=flat-square&logo=react-query&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-black?style=flat-square&logo=three.js)

**Backend & Auth**
![Convex](https://img.shields.io/badge/Convex-EE342F?style=flat-square&logo=convex&logoColor=white)
![Better Auth](https://img.shields.io/badge/Better_Auth-4F46E5?style=flat-square&logo=auth0&logoColor=white)

**Infrastructure & Observability**
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![PostHog](https://img.shields.io/badge/PostHog-000000?style=flat-square&logo=posthog&logoColor=white)
[![Oracle Cloud](https://custom-icon-badges.demolab.com/badge/Oracle%20Cloud-F80000?logo=oracle&logoColor=white)](#)

**Tooling**
![Bun](https://img.shields.io/badge/Bun-000000?style=flat-square&logo=bun&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white)

---

## Roles & Permissions

| Role | Browse Services | Submit Projects | Manage Services | View All Projects | Admin Access |
|------|:-:|:-:|:-:|:-:|:-:|
| `client` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `maker`  | ✅ | ✅ | ✅ | ✅ | ❌ |
| `admin`  | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Roadmap

| Phase | Items | Status |
|-------|-------|:------:|
| **1 · Foundation** | Auth (email + OAuth), RBAC, role-aware nav | ✅ Done |
| **2 · Services & Projects** | Service CRUD, project requests, file storage, real-time chat | ✅ Done |
| **3 · Operations** | Project & inventory tracking, receipts & payments, dashboard widgets | 🔄 In Progress |
| **4 · Analytics & QA** | Reporting, in-app & PWA notifications, PostHog, Playwright E2E | 📅 Planned |

---

## Architecture

```mermaid
graph TD
    Client["🌐 Browser / PWA"]
    Edge["Cloudflare Workers"]
    Analytics["PostHog"]

    subgraph NextJS ["Next.js 16 (App Router)"]
        Public["(public)\nLogin · Services · Profile"]
        Private["(private)\nDashboard · Chat · Projects · Reports"]
    end

    subgraph Auth ["Better Auth"]
        OAuth["Google OAuth"]
    end

    subgraph Docker ["Docker Compose (Self-Hosted)"]
        subgraph Convex ["Convex Backend"]
            DB["Real-Time Database"]
            Storage["File Storage"]
            Fns["Server Functions"]
        end
    end

    Client --> Edge
    Edge --> NextJS
    Public -->|unauthenticated| Fns
    Private --> Auth
    Auth --> |authenticated| Fns
    Fns --> DB
    Fns --> Storage
    Client --> Analytics
```

---

## Project Structure

```text
src/
  app/
    (public)/         # Login, services listing, profile
    (private)/
      dashboard/
        (manage)/     # Admin/maker: services, reports
        chat/         # Real-time messaging
        projects/     # Project management
convex/
  services/           # Service CRUD
  projects/           # Project lifecycle
  chat/               # Rooms & messages
  notification/       # (planned)
  emails/             # Email helpers
  schema.ts           # Database schema
  auth.ts             # Auth config
  files.ts            # File storage
```

---

## Getting Started

**Prerequisites:** Node.js 18+, [Bun](https://bun.sh/), a [Convex](https://dashboard.convex.dev/) account.

```sh
# 1. Install dependencies
bun install

# 2. Link Convex project (prompts login on first run)
bunx convex dev --until-success

# 3. Configure environment
cp .dev.vars.example .dev.vars   # fill in BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID, etc.

# 4. Start dev server
bun run dev   # → http://localhost:3000
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Frontend + Convex backend (concurrent) |
| `bun run build` | Build Next.js app |
| `bun run preview` | Build & preview on Cloudflare Workers locally |
| `bun run deploy` | Build & deploy to Cloudflare Workers |
| `bun run test` | Unit tests (watch mode) |
| `bun run test:once` | Unit tests (single run) |
| `bun run test:coverage` | Tests with coverage report |
| `bun run lint` / `format` | ESLint / Prettier |

## Deployment

```sh
# First time only — create R2 cache bucket
bunx wrangler r2 bucket create fablab-opennext-cache

# Deploy
bun run deploy
```

> Set secrets via the Cloudflare dashboard or `wrangler secret put` before deploying.
