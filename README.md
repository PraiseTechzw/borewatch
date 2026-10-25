# BoreWatch — Zimbabwe Groundwater Records and Workflow System

BoreWatch is an authenticated, server-backed application for groundwater records, applications, configured workflow transitions, data-source governance and audit history in Zimbabwe. The application names ZINWA as the coordinating authority and stores the relevant local Sub-Catchment Council per workspace or record area as configuration.

## Production boundary

GitHub Pages is reserved for public information only. Authenticated records, applications, permissions, evidence and audit history are served by the project server and stored in its database. The authenticated application must not be deployed as a static GitHub Pages-only site.

The system does not manufacture regulatory decisions. Roles, workflow stages, screening values and source permissions are application configuration. Regulatory authority, data licensing, screening criteria and official decisions remain with the responsible authorized bodies.

## Implemented server-backed functionality

- Neon Managed Auth for email/password registration, login, session management and password changes.
- PostgreSQL/Drizzle persistence for:
  - Borehole records
  - Applications
  - Workflow transition history
  - Roles and permissions
  - User-role assignments
  - Workspace governance settings
  - Data-source metadata
  - Append-only audit events
- Server-side permission middleware and administrator controls.
- Neon Object Storage for private evidence uploads, with per-record access checks, short-lived download links and database-backed metadata/audit events.
- Server-side coordinate validation and record creation/update authorization.
- Server-side application creation and workflow transition validation against the configured workflow JSON.
- Configurable ZINWA/local Sub-Catchment Council settings and data-layer access metadata.
- No browser-session fallback for records or applications; the client reads and writes through the authenticated API.

The current release also includes assigned inspections with private evidence and immutable submitted findings, owned follow-up actions, role assignment/removal, source and screening-rule administration, verified GeoJSON layer import, versioned point-to-layer distance screening, workflow configuration, in-app notifications, local offline form drafts, and authorized audited CSV/print-to-PDF reports. The GIS view overlays permitted borehole coordinates and active spatial layers on a latitude/longitude grid; no external basemap is loaded. Missing, stale or unverified inputs produce “unable to assess.” Only active rules backed by verified source and layer metadata are calculated. A spatial match is a preliminary human-review flag, not proof of contamination or non-compliance. Offline form drafts are local only; server writes and file uploads require connectivity. Seeded roles, workflows and sources remain editable examples pending pilot-authority validation.

## Initial configuration

The migration seeds editable configuration records for:

- `Boreholes_Database` — restricted operational data source.
- `Main_Catchments` — authenticated catchment context.
- Regional hydrogeological map — authenticated reference-only layer; not a decision rule.
- Applicant, inspector, reviewing officer, delegated decision officer, data steward, system administrator and auditor roles.
- A configurable application workflow beginning at draft and ending at closed.

These are editable starting configuration records, not legal rules or approved source datasets. The workflow is marked pending authority validation; data-source entries explicitly remain unloaded until approved files and use terms are supplied.

## Run and deploy

Requirements: Node.js compatible with the pinned toolchain, pnpm 10.18.0, and the linked Neon project.

```bash
pnpm install --frozen-lockfile
```

Copy `.env.example` to `.env.local`, then run `neon env pull` to populate the linked branch's Postgres, Managed Auth, and private Object Storage variables. Set `OWNER_EMAIL` to the intended administrator email; that account receives the administrator role only when Neon Auth marks the email verified. Never commit `.env.local` or credentials.

The current repository migrations have been tested on a temporary Neon branch and applied to the configured production branch. For a new environment, apply migrations and start the server:

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
- `drizzle/postgres/` — PostgreSQL schema migrations and initial editable configuration.
- `neon.ts` — Managed Auth and private `assets` bucket infrastructure configuration.
- `client/public/manus-routes.json` — frontend route manifest.

## Data and governance controls

Precise coordinates, personal information, evidence and restricted source data require least-privilege access, correction history, retention rules, backup/restore procedures and approved data-sharing terms. The regional hydrogeological map is displayed as reference-only and cannot by itself establish contamination, safety, compliance or legal authorization. Any screening implementation must record its source, version, coverage, quality limitations and authorized maintainer, and must preserve human review.
