# FabLab Management System

A web application for managing fabrication lab services, project bookings, and client communications. Built for a university FabLab to handle the full lifecycle of a client request — from browsing available services to job completion.

## Tech Stack

- **[Next.js 16](https://nextjs.org/)** — App Router, SSR, file-based routing
- **[Convex](https://convex.dev/)** — Backend: real-time database, server functions, and file storage
- **[Better Auth](https://better-auth.com/) + `@convex-dev/better-auth`** — Authentication (email/password and Google OAuth)
- **[React 19](https://react.dev/)** — UI
- **[Tailwind CSS v4](https://tailwindcss.com/)** — Styling
- **[shadcn/ui](https://ui.shadcn.com/)** — Component library (via Radix UI primitives)
- **[TanStack Form](https://tanstack.com/form)** — Form state management
- **[Vitest](https://vitest.dev/)** — Unit testing (with `convex-test`)
- **[Cloudflare Workers](https://workers.cloudflare.com/)** — Deployment target via `@opennextjs/cloudflare`

## Features

### Implemented

- **Authentication** — Email/password and Google OAuth login; role-based access control (`admin`, `maker`, `client`)
- **Services** — Public-facing services listing; admin/maker dashboard for creating, editing, and deleting services (with image and sample file uploads)
- **Projects** — Clients can submit project requests tied to a service; admins and makers can view and manage all projects; clients see only their own
- **Real-time Chat** — Each project submission automatically creates a dedicated chat room shared between the client and all admins; paginated message history
- **Role-aware Sidebar** — Navigation adapts dynamically based on the authenticated user's role
- **File Uploads** — Convex file storage for service images, sample outputs, and project files

### Planned / In Progress

- **Reports** — Overview, analytics, usage, and export (routes scaffolded, not yet implemented)
- **Inventory** — Machine and material tracking (schema defined, UI not yet built)
- **Notifications** — Notification system (folder scaffolded, not yet implemented)
- **Receipts & Payments** — Receipt and payment proof tracking (schema defined, mutations not yet implemented)
- **Dashboard Overview** — Summary widgets on the main dashboard page (currently placeholder UI)

## Roles

| Role     | Capabilities                                                                     |
| -------- | -------------------------------------------------------------------------------- |
| `client` | Browse services, submit project requests, view own projects, access project chat |
| `maker`  | All client capabilities + manage services, view all projects                     |
| `admin`  | All maker capabilities + full administrative access                              |

## Project Structure

```
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

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A [Convex](https://dashboard.convex.dev/) account and project
- (Optional) Google OAuth credentials for social login

### Installation

1. Clone the repository and install dependencies:

   ```sh
   bun install
   ```

2. Set up your Convex backend. On first run this will prompt you to log in and link a project:

   ```sh
   bunx convex dev --until-success
   ```

3. Copy `.dev.vars.example` to `.dev.vars` (if provided) and fill in the required environment variables:

   ```
   BETTER_AUTH_SECRET=...
   GOOGLE_CLIENT_ID=...       # optional, for Google OAuth
   GOOGLE_CLIENT_SECRET=...   # optional, for Google OAuth
   ```

4. Start the development server (runs Next.js and Convex concurrently):

   ```sh
   bun run dev
   ```

   The app will be available at `http://localhost:3000`.

## Scripts

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

## Deployment

This project is configured for deployment to **Cloudflare Workers** using [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare).

1. Create the R2 bucket for incremental cache (first time only):

   ```sh
   bunx wrangler r2 bucket create fablab-opennext-cache
   ```

2. Deploy:

   ```sh
   bun run deploy
   ```

   Environment variables must also be set in the Cloudflare dashboard or via `wrangler secret put`.
