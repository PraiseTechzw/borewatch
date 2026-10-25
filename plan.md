# Implementation plan — Borehole Compliance & Groundwater Risk Monitoring

> **Current implementation direction:** This repository contains an authenticated server-backed application using Neon Managed Auth, PostgreSQL/Drizzle and private object storage. `README.md` and `TODO.md` describe implemented functionality and remaining evaluation/governance work.

## Product scope and status

The delivered application includes role-scoped borehole records and responsible-party details, application intake and review, private evidence, field inspections and follow-up actions, source/rule metadata, audit history and authorized CSV reporting. The map plots permitted record coordinates and authorized GeoJSON layers on a coordinate grid. The server calculates configured point-to-layer distances for active rules backed by verified source/layer metadata and records rule/data provenance; missing, stale or unverified inputs return `unable_to_assess`. No external basemap or official hazard source is bundled.

All workflow and role configuration is an editable starting point, not an authority-approved process. No real personal, authority or hazard data should be assumed. Do not imply that a screening alert proves contamination, compliance or legal status. Decisions remain human and permission-restricted. Application stage and borehole operational status are separate. Inspections retain submitted findings as history. Exports require an authorized purpose and are audited.

## Remaining delivery work

1. Select a pilot organization and area; validate legal requirements, roles, decision authority, workflow and privacy obligations.
2. Obtain authorized, fit-for-purpose spatial data and approved criteria with source, date, coverage, license and accuracy metadata.
3. Run documented functional, security/access-control, spatial and usability evaluations on authorized or clearly synthetic test data.
4. Define retention, correction, backup/restore, file scanning, HTTPS deployment, monitoring and support procedures with the responsible organization.
5. If required by the pilot, extend current local-only drafts into encrypted offline evidence capture and conflict-safe synchronization.

## Architecture

- `client/src/pages/Home.tsx`: authenticated workspace and principal workflows.
- `server/borewatchRouter.ts`: protected records, applications, inspections, follow-ups, screening state, reports and administration procedures.
- `server/permissions.ts`: database-backed permissions.
- `server/_core/trpc.ts`: authentication and permission middleware.
- `drizzle/schema.ts` and `drizzle/postgres/`: persistent domain schema and migrations.

Keep private records and evidence behind authenticated server APIs. GitHub Pages is for public information only, not the authenticated system.
