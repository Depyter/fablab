# FabLab Management System

A web application for managing fabrication lab services, project bookings, and client communications. Built for a university FabLab to handle the full lifecycle of a client request — from browsing available services to job completion.

## 💻 Tech Stack

### Frontend & UI

- **[Next.js 16](https://nextjs.org/)** — App Router, SSR, and file-based routing
- **[React 19](https://react.dev/)** — Core UI library
- **[Tailwind CSS v4](https://tailwindcss.com/)** — Utility-first styling
- **[shadcn/ui](https://ui.shadcn.com/)** — Accessible component library (via Radix UI primitives)
- **[TanStack Form](https://tanstack.com/form)** — Type-safe form state management
- **[Threejs](https://threejs.org)** — Render 3d models using Javascript

### Backend & Data

- **[Convex](https://convex.dev/)** — Real-time database, server functions, and file storage

### Authentication

- **[Better Auth](https://better-auth.com/)** — Identity management (email/password and Google OAuth) with `@convex-dev/better-auth` integration

### Infrastructure & Deployment

- **[Cloudflare Workers](https://workers.cloudflare.com/)** — Edge deployment target via `@opennextjs/cloudflare`

### Testing & QA

- **[Vitest](https://vitest.dev/)** — Unit testing suite with `convex-test`

---

## 🗺️ Roadmap

### Phase 1: Core Foundation & Access (Completed)

- [x] **Authentication Setup** — Email/password and Google OAuth login.
- [x] **Role-Based Access Control** — Distinct roles for `admin`, `maker`, and `client`.
- [x] **Role-Aware Navigation** — Sidebar adapts dynamically based on the authenticated user's permissions.

### Phase 2: Services & Project Lifecycle (Completed)

- [x] **Service Management** — Public listings; admin/maker dashboard for CRUD operations with image/file uploads.
- [x] **Project Requests** — Clients can submit jobs tied to specific services.
- [x] **File Storage** — Convex file storage integration for service images, sample outputs, and project files.
- [x] **Real-Time Communication** — Dedicated, auto-generated chat rooms for every project with paginated message history.

### Phase 3: Operations & Dashboarding (In Progress)

- [ ] **Dashboard Overview** — Replace placeholder UI with interactive summary widgets on the main dashboard.
- [ ] **Project Management** — Project tracking (Schema defined, UI pending).
- [ ] **Inventory Management** — Machine and material tracking (Schema defined, UI pending).
- [ ] **Receipts & Payments** — Proof of payment tracking and receipt generation (Schema defined, mutations pending).

### Phase 4: Analytics, Notifications & QA (Planned)

- [ ] **Reporting System** — Overview, analytics, usage statistics, and data export.
- [ ] **In-App Notifications** — Robust notification center for project updates and chat pings.
- [ ] **PWA Push Notifications** — Native-feeling alerts for the Progressive Web App.
- [ ] **Observability** — User behavior tracking and analytics integration via PostHog.
- [ ] **End-to-End Testing** — Automated UI and flow testing using Playwright.

---

## 👥 Roles & Permissions

| Role     | Capabilities                                                                     |
| -------- | -------------------------------------------------------------------------------- |
| `client` | Browse services, submit project requests, view own projects, access project chat |
| `maker`  | All client capabilities + manage services, view all projects                     |
| `admin`  | All maker capabilities + full administrative access                              |

---

## 📂 Project Structure

```text
src/
  app/
    (public)/         # Unauthenticated routes: login, services listing, profile
    (private)/
      dashboard/      # Authenticated dashboard
        (manage)/     # Admin/maker-only: services management, reports
        chat/         # Real-time messaging
        projects/     # Project management
convex/
  services/           # Service CRUD mutations & queries
  projects/           # Project creation & listing
  chat/               # Room and message queries/mutations
  notification/       # (planned)
  emails/             # Email helpers
  schema.ts           # Full database schema
  auth.ts             # Better Auth configuration
  files.ts            # File upload/storage helpers
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Bun](https://bun.sh/) installed locally
- A [Convex](https://dashboard.convex.dev/) account and project
- (Optional) Google OAuth credentials for social login

### Installation

1. Clone the repository and install dependencies:

```sh
bun install
```

2. Set up your Convex backend. On the first run, this will prompt you to log in and link a project:

```sh
bunx convex dev --until-success
```

3. Copy `.dev.vars.example` to `.dev.vars` (if provided) and fill in the required environment variables:

```env
BETTER_AUTH_SECRET=...
GOOGLE_CLIENT_ID=...       # optional, for Google OAuth
GOOGLE_CLIENT_SECRET=...   # optional, for Google OAuth
```

4. Start the development server (runs Next.js and Convex concurrently):

```sh
bun run dev
```

The app will be available at `http://localhost:3000`.

---

## 📜 Scripts

| Command                 | Description                                       |
| ----------------------- | ------------------------------------------------- |
| `bun run dev`           | Start frontend and Convex backend concurrently    |
| `bun run build`         | Build the Next.js app                             |
| `bun run preview`       | Build and preview with Cloudflare Workers locally |
| `bun run deploy`        | Build and deploy to Cloudflare Workers            |
| `bun run test`          | Run unit tests (watch mode)                       |
| `bun run test:once`     | Run unit tests once                               |
| `bun run test:coverage` | Run tests with coverage report                    |
| `bun run lint`          | Run ESLint                                        |
| `bun run format`        | Format all files with Prettier                    |

---

## ☁️ Deployment

This project is configured for deployment to **Cloudflare Workers** using [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare).

1. Create the R2 bucket for incremental cache (first time only):

```sh
bunx wrangler r2 bucket create fablab-opennext-cache
```

2. Deploy:

```sh
bun run deploy
```

_Note: Environment variables must also be set in the Cloudflare dashboard or via `wrangler secret put` before deploying._
