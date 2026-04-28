# Convex Backend Guide

This directory contains the server-side data model and business logic for the app.
Convex code here is the source of truth for:

- database schema and indexes
- authenticated queries and mutations
- internal-only jobs and background work
- file tracking and storage ownership
- auth bootstrap and HTTP route registration
- presence state
- cron jobs
- email delivery actions

The frontend imports these functions through the generated API in `convex/_generated/api`.
The files in `_generated/` are produced by the Convex CLI and should not be edited by hand.

## How Convex Works Here

Convex functions are plain TypeScript modules that export query, mutation, action, or internal variants.
Each function gets a server context and reads or writes the database through that context.

The main execution models in this repository are:

- `publicQuery` and `publicMutation` for functions that do not require the local auth wrapper.
- `authQuery` and `authMutation` for authenticated functions that need the current user profile.
- `internalMutation` and `internalAction` for server-only jobs that are called from Convex itself.
- `query`, `mutation`, and `action` from `convex/_generated/server` for low-level exports when needed.

The auth helpers in `convex/helper.ts` wrap Convex functions so the handler receives both:

- `ctx.user`: the authenticated identity from Convex auth
- `ctx.profile`: the matching row in `userProfile`

That pattern is the backbone of the app. Almost every protected feature depends on `userProfile` as the canonical app-user record.

## Folder Map

| Path | Purpose |
| --- | --- |
| `convex/schema.ts` | Defines every table, index, and search index. |
| `convex/helper.ts` | Shared auth, file, and utility helpers. |
| `convex/auth.ts` | Better Auth integration and user bootstrap. |
| `convex/auth.config.ts` | Auth provider configuration for Convex auth. |
| `convex/http.ts` | Registers HTTP routes for auth and other webhooks. |
| `convex/crons.ts` | Scheduled background jobs. |
| `convex/presence.ts` | Realtime presence wrapper backed by the Convex Presence component. |
| `convex/files.ts` | Upload URL generation, upload tracking, and storage URL access. |
| `convex/users.ts` | Profile reads and profile updates. |
| `convex/chat/` | Chat threads, rooms, messages, membership, unread counts. |
| `convex/projects/` | Project creation, updates, pricing, lifecycle, and related room/thread creation. |
| `convex/services/` | Service catalog reads and mutations. |
| `convex/materials/` | Material inventory reads and mutations. |
| `convex/resource/` | Bookable resource reads, bookings, and resource usage edits. |
| `convex/emails/` | Email templates and Resend delivery action. |
| `convex/constants.ts` | Shared enums, labels, and constant lists used by the schema and helpers. |

## Data Model Overview

The schema in `convex/schema.ts` is organized around a few core domains.

### Authentication and Users

`userProfile` is the app-level user record. It stores:

- `userId`: the auth-provider subject
- `name`, `email`
- `role`: `admin`, `maker`, or `client`
- `profilePic`: optional storage file ID

The auth trigger in `convex/auth.ts` creates a `userProfile` row when a user is created in Better Auth.

### File Tracking

`files` tracks every uploaded file that enters Convex storage.
It stores:

- `originalName`
- `storageId`
- `type`
- `status`: `claimed` or `orphaned`
- `uploadedBy`

This table is what allows the app to distinguish between a raw storage object and a file that belongs to a project, message, profile, or service.

### Catalog and Booking Data

`services` describes the offerings.
`resources` describes physical assets.
`materials` describes consumable inventory.
`resourceUsage` captures actual sessions and ties a project to the service and optional resource/material snapshot used for that session.

### Projects

`projects` is the main business object for fabrication and workshop requests.
It stores:

- the request itself
- who submitted it
- which service is being requested
- current status
- pricing choice
- attachments
- free-text notes
- `searchText` for full-text search

Projects create downstream records:

- a `resourceUsage` row for the booked session
- a `rooms` row if the project needs a client chat room
- a `threads` row for the project conversation
- an initial message in that thread

### Chat

`rooms` groups conversations.
`roomMembers` defines access to rooms.
`threads` groups a conversation inside a room.
`threadReads` stores unread tracking.
`messages` stores the actual message bodies and attachments.

The chat system is intentionally denormalized:

- `threads` keep `lastMessageText`, `lastMessageAt`, and `messageCount`
- `rooms` keep `lastMessageText`, `lastMessageAt`, and unread totals
- `messages` keep the actual text and files

This makes list views fast and keeps the UI from needing to recompute conversation summaries from scratch.

## Schema Relationships

The relationships below are the important ones to keep in mind when making changes.

| Parent | Child | Relationship |
| --- | --- | --- |
| `userProfile` | `projects` | A client owns projects through `projects.userId`. |
| `userProfile` | `rooms` | A room has a `creator`. |
| `userProfile` | `roomMembers` | Membership is stored by participant profile ID. |
| `userProfile` | `threadReads` | Read state is per user per thread. |
| `services` | `projects` | Each project is tied to one service. |
| `services` | `resourceUsage` | A usage row records which service was consumed. |
| `resources` | `resourceUsage` | Optional resource assignment is stored on usage. |
| `materials` | `projects` / `services` / `resourceUsage` | Materials are referenced from project requests, service definitions, and session snapshots. |
| `rooms` | `threads` | A room contains many threads. |
| `rooms` | `roomMembers` | Room access is controlled by membership rows. |
| `threads` | `messages` | Every message belongs to one thread. |
| `rooms` | `messages` | Messages also store the parent room for quick filtering. |
| `projects` | `resourceUsage` | Usage rows point back to the project that created them. |
| `projects` | `rooms` / `threads` | Project creation can bootstrap messaging. |
| `_storage` | `files` | Storage objects are tracked in the `files` table before being claimed. |

## Schema Tables and Indexes

### `files`

Purpose:

- track uploaded storage objects
- enforce ownership/claiming
- support lookup by `storageId`

Indexes:

- `by_storageId`
- `status`

### `services`

Purpose:

- define the lab’s offerings
- store workshop or fabrication-specific pricing and scheduling data
- link services to images, samples, materials, and resources

Indexes:

- `by_slug`

### `resources`

Purpose:

- define rooms, machines, tools, or miscellaneous assets
- store image attachments and availability state

Indexes:

- `by_category`

### `materials`

Purpose:

- inventory management for consumables
- stock, unit, thresholds, cost, and optional image

Indexes:

- `by_category`
- `by_status`

### `resourceUsage`

Purpose:

- immutable-ish historical record of a project session
- links a project to the booked service and optional resource
- stores a snapshot of cost and optionally consumed materials

Indexes:

- `by_project`
- `by_service`
- `by_resource_startTime`

### `projects`

Purpose:

- central business entity
- client request, lifecycle, and billing summary
- search-enabled by `searchText`

Indexes:

- `by_userProfile`
- `by_status`
- `search_body` search index on `searchText`

### `receipts`

Purpose:

- payment receipt metadata and proof
- links project payment records to uploaded files

No explicit indexes are defined yet.

### `rooms`

Purpose:

- top-level chat container
- stores summary fields for sidebar ordering and unread display

Indexes:

- `by_creator`

### `roomMembers`

Purpose:

- many-to-many membership table between rooms and user profiles

Indexes:

- `by_participantId`
- `by_roomId_participantId`

### `threads`

Purpose:

- channel-like conversation under a room
- stores last-message metadata and message count

Indexes:

- `by_roomId`
- `projectId`

### `threadReads`

Purpose:

- per-user thread read cursor
- powers unread badge math

Indexes:

- `by_userId_threadId`

### `messages`

Purpose:

- actual chat messages
- stores room, thread, sender, content, and attached files

Indexes:

- `by_room_and_thread`
- `search_content` search index on `content`

The message search index is what the chat search feature uses. It filters by `room`, `threadId`, and `sender`, while full-text searching the `content` field.

### `userProfile`

Purpose:

- app-level user identity
- authorization and membership source of truth

Indexes:

- `by_userId`
- `by_role`

## Helper Files

### `convex/helper.ts`

This file contains shared behavior that nearly every feature depends on.

Main responsibilities:

- `ensureAuthentication(ctx)`: fails fast if there is no auth identity
- `authQuery` / `authMutation`: wrappers that inject `{ user, profile }` into handlers
- optional role checks for protected queries and mutations
- rate-limit support for mutations
- `claimFiles(ctx, storageIds)`: marks uploaded files as claimed
- `deleteFiles(ctx, storageIds)`: deletes storage objects and their `files` rows
- `slugify(str)`: utility for stable service slugs

Why it matters:

- it prevents every feature from re-implementing auth lookup
- it keeps `userProfile` as the canonical app-user record
- it centralizes file ownership rules so uploads cannot be duplicated or leaked

### `convex/chat/helper.ts`

Chat-specific membership checks live here.

Main responsibilities:

- `checkRoomMembership(roomId, ctx, user)`: ensures the current user has a `roomMembers` row for the room

Why it matters:

- chat read/write operations must be locked to room members
- the helper is reused by both chat queries and mutations

### `convex/projects/helper.ts`

Project orchestration logic is split here so the mutation file stays readable.

Main responsibilities:

- build project search text
- validate file types against service rules
- validate booking time windows
- validate fabrication availability
- compute cost breakdowns
- create workshop and fabrication usage rows
- create project rooms and project threads
- apply status changes, assignments, and snapshots
- send system messages and schedule project emails

Why it matters:

- project creation is the most coupled workflow in the app
- the helper keeps the mutation code focused on orchestration instead of every low-level rule

### `convex/resource/helper.ts`

Main responsibilities:

- `checkOverlap(a, b)`: time-range overlap utility

Why it matters:

- resource booking logic relies on consistent time overlap checks

## Feature Modules

### `convex/auth.ts`

This file wires Better Auth into Convex.

It does three important things:

- creates the auth client component
- registers auth HTTP routes through `httpRouter`
- defines the user creation trigger that inserts a `userProfile`

The auth create trigger is important because many queries assume a profile exists.
Without it, `authQuery` and `authMutation` will throw `User profile not found`.

### `convex/auth.config.ts`

This provides Convex auth configuration.

It currently registers the auth config provider from Better Auth.

### `convex/http.ts`

This file exports the HTTP router.

It currently registers the Better Auth routes so sign-in and callback requests can reach Convex.

If you add webhooks or custom endpoints later, they belong here.

### `convex/crons.ts`

This file defines scheduled jobs.

Current job:

- hourly cleanup of orphaned uploads through `internal.services.mutate.cleanOrphanedFiles`

This is the safety net for files that were uploaded but never fully claimed by a mutation.

### `convex/presence.ts`

This file wraps the Convex Presence component.

Current endpoints:

- `heartbeat`: updates presence for a room/session/user
- `list`: reads present users for a room token
- `disconnect`: removes a session

The frontend chat UI uses this to display live presence in threads.

### `convex/files.ts`

This module manages upload lifecycle.

Current functions:

- `generateUploadUrl`: returns a pre-signed upload URL
- `trackUpload`: stores metadata for a new upload in `files`
- `getUrl`: returns a storage URL after authorization checks

Important behavior:

- upload metadata is validated before being accepted
- oversized files are rejected and deleted from storage
- unsupported MIME types are rejected and deleted from storage
- `uploadedBy` is enforced when a user requests a file URL

This module is the bridge between raw Convex storage and the app’s file-tracking table.

### `convex/users.ts`

This module handles profile access and profile editing.

Current functions:

- `getUserProfile`: returns the current user profile plus a resolved image URL
- `updateProfile`: updates name and/or profile picture
- `getRole`: returns the current profile role
- `createUserProfile`: internal bootstrap for new auth users
- `createAdmin` and `createMaker`: internal bootstrap helpers for privileged accounts
- `getMakers`: returns makers for admin/maker workflows

This module is the primary consumer of `userProfile` and the place where avatar URLs are resolved.

### `convex/chat/query.ts`

This is the chat read API.

Current functions:

- `getRoom`: returns a room after membership validation
- `getRoomMessages`: paginated messages for a room/thread, with optional search
- `getRooms`: returns the current user’s rooms, threads, and unread counts
- `getThreads`: returns threads for a room
- `getRoomMembers`: returns room member profiles
- `getAddableUsers`: returns users not already in the room

Important patterns:

- room access is checked with `checkRoomMembership`
- message pagination is newest-first for the normal timeline
- message search uses the `messages.search_content` index when `searchText` is provided
- list endpoints enrich data with profile and storage URLs so the frontend does not need to stitch them together

### `convex/chat/mutate.ts`

This is the chat write API.

Current functions:

- `sendMessage`: inserts a message and updates room/thread summary fields
- `createThread`: creates a thread and seeds it with an initial system message
- `markThreadRead`: stores the latest read count per user/thread
- `updateRoomName`: renames a room after authorization checks
- `addNewMember`: adds a participant to a room
- `removeMember`: removes a participant from a room

Important relationships:

- `sendMessage` updates both `rooms.lastMessageAt` and `threads.lastMessageAt`
- `sendMessage` also updates `threads.messageCount`, which drives unread math
- `markThreadRead` uses `thread.messageCount` rather than message timestamps
- `addNewMember` and `removeMember` operate on `roomMembers`

### `convex/projects/query.ts`

This module powers project browsing.

Current functions:

- `getProjects`: paginated projects with search, filters, and sort modes
- `getProject`: fetches a single project with all related details

Important patterns:

- search uses the `projects.search_body` index
- non-privileged users only see their own projects
- list results are enriched with service, client, maker, booking, and pricing information

### `convex/projects/mutate.ts`

This module owns the project lifecycle.

Current responsibilities include:

- creating projects
- updating project status
- assigning makers/resources/materials
- syncing usage, stock, and notifications
- managing project-linked chat threads and system messages

Important flow for `createProject`:

1. resolve and validate the service
2. validate uploaded files against service rules
3. validate booking time and availability
4. compute provisional pricing
5. insert the `projects` row with `searchText`
6. create `resourceUsage`
7. ensure a client room exists
8. create a project thread and initial message
9. claim uploaded files
10. schedule the project email

This is the highest-coupling workflow in the backend.

### `convex/services/query.ts`

This module exposes public catalog reads.

Current functions:

- `getServices`: list all services and resolve image URLs
- `getService`: fetch a service by slug, with samples and material details
- `getBookedTimeSlots`: list service bookings for a given day

### `convex/services/mutate.ts`

This module manages the service catalog and related uploads.

Current functions:

- `addService`
- `updateService`
- `deleteService`
- `deleteOrphanedFiles`
- `cleanOrphanedFiles`

Important behavior:

- service slugs are normalized with `slugify`
- images and samples are claimed with `claimFiles`
- orphan cleanup deletes unclaimed `files` rows and storage blobs
- workshop schedules preserve used slot counts when updated

### `convex/materials/query.ts`

This module exposes inventory reads for admins and makers.

Current function:

- `getMaterials`

It resolves each material’s image URL before returning the records.

### `convex/materials/mutate.ts`

This module manages consumable inventory.

Current functions:

- `addMaterial`
- `updateMaterial`
- `deleteMaterial`

Important behavior:

- material images are claimed when attached
- replacing an image deletes the previous storage object
- deleting a material also deletes its tracked image

### `convex/resource/query.ts`

This module exposes resource and booking reads.

Current functions:

- `getResources`
- `getBookings`

Important behavior:

- `getBookings` is role-aware
- clients only get enough information to see their own project bookings
- it intentionally strips private fields from other users’ bookings

### `convex/resource/mutate.ts`

This module manages resources and resource usage.

Current functions:

- `addResource`
- `updateResource`
- `deleteResource`
- `addImageToResource`
- `deleteImageFromResource`
- `updateUsage`
- `deleteUsage`

Important behavior:

- resource images are claimed or deleted in sync with the resource
- usage updates are protected by ownership or privileged role checks
- non-privileged users cannot modify restricted usage fields

### `convex/emails/`

This folder contains the outbound email pipeline.

Files:

- `emails.tsx`: internal Convex action that renders and sends email
- `FabLabEmail.tsx`: React email template
- `send.ts`: Resend client configuration

How it works:

- server logic builds the payload
- the React email component renders the HTML
- Resend sends the final message

This keeps the visual template separate from the delivery mechanism.

## Common Data Flows

### New User Signup

1. Better Auth creates the auth user.
2. The trigger in `convex/auth.ts` calls `internal.users.createUserProfile`.
3. `userProfile` becomes the canonical app identity.
4. Protected queries and mutations use `authQuery` / `authMutation` and read `ctx.profile`.

### File Upload

1. The frontend asks for an upload URL with `files.generateUploadUrl`.
2. The browser uploads directly to Convex storage.
3. The app records metadata with `files.trackUpload`.
4. A later mutation claims the file with `claimFiles`.
5. If a file is never claimed, the cron job removes it later.

### Project Creation

1. A client submits a project mutation.
2. The backend validates the service, files, booking, and pricing.
3. The project row is inserted with a denormalized search string.
4. The relevant `resourceUsage` row is created.
5. A room and thread are created if needed.
6. The initial message is seeded into chat.
7. Files are claimed and the confirmation email is scheduled.

### Chat Messaging

1. The UI loads messages through the paginated `chat.query.getRoomMessages`.
2. The query checks room membership.
3. The normal timeline loads newest-first.
4. If a search term is present, the search index is used.
5. `chat.mutate.sendMessage` stores the message and updates room/thread summaries.
6. `chat.mutate.markThreadRead` updates unread tracking.

### Presence

1. The frontend sends heartbeats through `presence.heartbeat`.
2. The component tracks active sessions by room token.
3. The chat UI reads and renders live presence.

## Indexing Strategy

Convex queries are fast when they use the right index. This repo uses indexes in three main ways:

- equality filters on exact lookup fields like `by_userId`, `by_slug`, `by_roomId`
- ordered pagination on common timelines like messages and threads
- search indexes for full-text search over `projects.searchText` and `messages.content`

Important rule:

- if a query needs full-text search, it should use a search index
- if a query needs stable chronological ordering, it should use a normal index or the default creation-time order

The chat search path uses the message search index, while the default chat timeline uses indexed room/thread pagination ordered by recency.

## Adding New Backend Code

When adding a new Convex feature:

1. Add or update the table/index in `schema.ts` first.
2. Put shared logic in the relevant `helper.ts` file if more than one function needs it.
3. Use `authQuery` or `authMutation` unless the function is explicitly public or internal.
4. Prefer enriching data in Convex when the frontend would otherwise need many round-trips.
5. Claim uploaded files when they become attached to durable records.
6. Update the frontend to call the new function through `api`.

## Practical Notes

- `_generated/` is build output from the Convex CLI.
- If you change `schema.ts`, regenerate the Convex types before relying on the new shapes in TypeScript.
- Some modules return denormalized objects on purpose to reduce frontend complexity.
- Many mutations write summary fields so list views can stay fast.
- Role checks are enforced in backend helpers, not only in the UI.

## Key Entry Points

- `convex/schema.ts` for the data model
- `convex/helper.ts` for auth and file ownership rules
- `convex/auth.ts` for user bootstrap
- `convex/chat/query.ts` and `convex/chat/mutate.ts` for messaging
- `convex/projects/mutate.ts` for project lifecycle orchestration
- `convex/files.ts` for storage lifecycle
- `convex/http.ts` for auth routes
- `convex/crons.ts` for cleanup jobs
