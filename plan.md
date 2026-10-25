# Implementation plan — Borehole Compliance & Groundwater Risk Monitoring

> **Current implementation direction:** This repository contains an authenticated server-backed application using Neon Managed Auth, PostgreSQL/Drizzle and private object storage. `README.md` and `TODO.md` describe implemented functionality and remaining evaluation/governance work.

## Product scope and status

The delivered application includes role-scoped borehole records and responsible-party details, application intake and review, private evidence, field inspections and follow-up actions, source/rule metadata, audit history and authorized CSV reporting. The map currently plots permitted record coordinates on a geographic grid and records `unable_to_assess` when no verified layer and approved rule are configured. It does not perform geographic hazard calculations.

All workflow and role configuration is an editable starting point, not an authority-approved process. No real personal, authority or hazard data should be assumed. Do not imply that a screening alert proves contamination, compliance or legal status. Decisions remain human and permission-restricted. Application stage and borehole operational status are separate. Inspections retain submitted findings as history. Exports require an authorized purpose and are audited.

## Remaining delivery work

1. Select a pilot organization and area; validate legal requirements, roles, decision authority, workflow and privacy obligations.
2. Obtain authorized, fit-for-purpose spatial data with source, date, coverage, license and accuracy metadata.
3. Implement spatial queries and versioned screening calculations only for validated criteria; verify known test cases and return unable-to-assess for missing, stale or unsuitable data.
4. Run documented functional, security/access-control, spatial and usability evaluations on authorized or clearly synthetic test data.
5. Define retention, correction, backup/restore, notification and deployment procedures with the responsible organization.
6. Configure and verify a target Neon project before applying migrations or deploying.

## Architecture

- `client/src/pages/Home.tsx`: authenticated workspace and principal workflows.
- `server/borewatchRouter.ts`: protected records, applications, inspections, follow-ups, screening state, reports and administration procedures.
- `server/permissions.ts`: database-backed permissions.
- `server/_core/trpc.ts`: authentication and permission middleware.
- `drizzle/schema.ts` and `drizzle/postgres/`: persistent domain schema and migrations.

Keep private records and evidence behind authenticated server APIs. GitHub Pages is for public information only, not the authenticated system.
