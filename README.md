# BoreWatch — Borehole Compliance & Groundwater Risk Monitoring

A proposed digital-platform prototype for organizing borehole records, application workflows, field inspections and transparent preliminary groundwater-risk screening in a Zimbabwe pilot context.

> **Prototype notice:** This repository and its sample records are for demonstration and student-project development. They are not an official registry, legal authorization, water-quality certificate, or evidence that a borehole is safe or contaminated. Stakeholder, regulatory, data-sharing and privacy validation is required before operational use.

## Prototype features

The responsive dashboard demonstrates an overview, searchable borehole register, draft record creation with basic decimal-degree range checks, application worklist, indicative GIS-screening view, inspection worklist and session-only field form, follow-up actions, reports and an administration concept. Screening language is deliberately cautious: flags require human review, and missing or unverified layers are represented as **Unable to assess**. Application/permit status is kept separate from borehole operational status.

All names, locations, records, map features, counts and screening results are synthetic examples. New records and form interactions use browser-session state and are not persisted after reload. The current interface does not implement authentication, server-enforced roles, production database workflows, protected evidence storage, real notifications, official decisions, validated spatial rules, laboratory results or authoritative GIS layers. The scaffolded backend/database infrastructure is not wired to BoreWatch workflows.

## Run locally

Requirements: Node.js compatible with the pinned project toolchain and pnpm 10.18.0.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Run type checks and the production build:

```bash
pnpm check
pnpm build
```

The development server uses the configured port (3000 by default). Do not commit local environment files or credentials.

## Project structure

- `client/src/pages/Home.tsx` — demonstration workspace and session-only interactions.
- `client/src/index.css` — cartographic design system and responsive layouts.
- `client/public/manus-routes.json` — frontend route manifest.
- `drizzle/` and `server/` — scaffolded backend/database areas, not currently implementing BoreWatch business workflows.
- `plan.md` and `TODO.md` — approved implementation direction and outcome tracker.

## Data, screening and governance

The map is illustrative, not a geographic service. Coordinates are synthetic and unverified; the registration form checks numeric latitude/longitude ranges only and does not check coordinate reference systems, accuracy or jurisdiction boundaries. Screening cannot prove contamination, legal safety or compliance. A future configured rule should carry its source, effective/version dates, coverage, quality limitations and authorized maintainer, and qualified personnel must review its results.

Before any real pilot, confirm the responsible organization, legal basis and delegated authority; validate application and inspection transitions; approve spatial datasets and screening criteria; minimize and protect personal and precise site data; define retention, correction and export controls; and test role separation, audit history, backup and restoration. Use synthetic or authorized/anonymized data for development and screenshots.

## Issues and contributions

Use GitHub Issues for reproducible defects, implementation enhancements and stakeholder-validation questions. Do not include personal contact details, private site coordinates, credentials or sensitive documents in issue text or attachments. See the issue templates and `SECURITY.md` for reporting guidance.
