# BoreWatch — Zimbabwe Groundwater Records and Workflow System

BoreWatch is an authenticated, server-backed application for groundwater records, applications, configured workflow transitions, data-source governance and audit history in Zimbabwe. The application names ZINWA as the coordinating authority and stores the relevant local Sub-Catchment Council per workspace or record area as configuration.

## Production boundary

GitHub Pages is reserved for public information only. Authenticated records, applications, permissions, evidence and audit history are served by the project server and stored in its database. The authenticated application must not be deployed as a static GitHub Pages-only site.

The system does not manufacture regulatory decisions. Roles, workflow stages, screening values and source permissions are application configuration. Regulatory authority, data licensing, screening criteria and official decisions remain with the responsible authorized bodies.

## Implemented server-backed functionality

- Local email/password registration and login with bcrypt password hashing.
- Database-backed sessions with hashed session tokens, expiry, HTTP-only cookies and logout.
- MySQL/Drizzle persistence for:
  - Borehole records
  - Applications
  - Workflow transition history
  - Roles and permissions
  - User-role assignments
  - Workspace governance settings
  - Data-source metadata
  - Append-only audit events
- Server-side permission middleware and administrator controls.
- Server-side coordinate validation and record creation/update authorization.
- Server-side application creation and workflow transition validation against the configured workflow JSON.
- Configurable ZINWA/local Sub-Catchment Council settings and data-layer access metadata.
- No browser-session fallback for records or applications; the client reads and writes through the authenticated API.

## Initial configuration

The migration seeds editable configuration records for:

- `Boreholes_Database` — restricted operational data source.
- `Main_Catchments` — authenticated catchment context.
- Regional hydrogeological map — authenticated reference-only layer; not a decision rule.
- Applicant, inspector, reviewing officer, delegated decision officer, data steward, system administrator and auditor roles.
- A configurable application workflow beginning at draft and ending at closed.

These are starting configuration records, not legal rules. Update them through the protected administration API after confirming the responsible organization and data-use permissions.

## Run and deploy

Requirements: Node.js compatible with the pinned toolchain, pnpm 10.18.0, and a MySQL-compatible database.

```bash
pnpm install --frozen-lockfile
```

Copy `.env.example` to `.env` and set `DATABASE_URL` to your MySQL-compatible database connection string. Set `OWNER_EMAIL` if an account should receive the initial platform administrator role. `PORT` defaults to `3000`; `FORGE_API_URL` and `FORGE_API_KEY` are only needed if the Forge file-storage integration is enabled. Do not commit `.env` or credentials.

Then apply the migrations and start the server:

```bash
pnpm db:migrate
pnpm dev
```

Validate before deployment:

```bash
pnpm check
pnpm test
pnpm build
```

## Project structure

- `client/src/pages/Home.tsx` — authenticated server-driven workspace.
- `server/borewatchRouter.ts` — protected workspace, record, application, transition, administration and audit procedures.
- `server/permissions.ts` — database-backed permission resolution.
- `server/_core/trpc.ts` — authentication, administrator and permission middleware.
- `drizzle/schema.ts` — persistent domain schema.
- `drizzle/0001_famous_major_mapleleaf.sql` — domain tables and initial editable configuration.
- `client/public/manus-routes.json` — frontend route manifest.

## Data and governance controls

Precise coordinates, personal information, evidence and restricted source data require least-privilege access, correction history, retention rules, backup/restore procedures and approved data-sharing terms. The regional hydrogeological map is displayed as reference-only and cannot by itself establish contamination, safety, compliance or legal authorization. Any screening implementation must record its source, version, coverage, quality limitations and authorized maintainer, and must preserve human review.
