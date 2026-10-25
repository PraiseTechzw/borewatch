# BoreWatch delivery status

## Implemented in the current server-backed release

- [x] Neon Managed Auth registration, sign-in, sessions and password changes.
- [x] PostgreSQL persistence for boreholes, responsible parties, applications, documents/evidence, decisions, inspections, follow-up actions, hazard-layer metadata, screening rules/results, notifications and audit events.
- [x] Server-side role and record-scope checks for applications, private evidence, assigned inspections, follow-up owners, screening, reports and administration.
- [x] Borehole register with unique references, coordinate validation, technical fields, commissioning/decommissioning details and restricted contact data.
- [x] Application drafts with site/applicant fields, completeness checklist, categorized private evidence, information requests, applicant responses and authorized decisions.
- [x] Append-only decision correction history with reason and superseded-decision reference.
- [x] Inspection assignment, mobile-friendly checklist, coordinate confirmation, evidence, immutable findings and review workflow.
- [x] Owned follow-up actions, due dates, status updates and overdue in-app alerts.
- [x] Private GeoJSON hazard-layer import with CRS, source, version, date, accuracy, license and verification metadata.
- [x] Explainable point-to-layer distance screening, rule/version provenance, stale/missing data handling and human-review flags. Test layers require verified data-source metadata; no data or threshold is seeded as official.
- [x] Borehole and authorized layer map overlays on a coordinate grid, plus filters and screening history. No external basemap is loaded.
- [x] Authorized, audited CSV and print/save-as-PDF reports.
- [x] In-app notifications for application, inspection, follow-up and screening events, with read state.
- [x] Offline shell caching and device-local drafts for application and inspection forms. API writes/evidence upload still require a network connection; drafts are not background-synced.
- [x] Role and source/rule/layer administration, workflow configuration and read-only audit view.
- [x] Production schema migrations applied after successful migration on a one-day Neon validation branch.

## Remaining before the project can claim validated operational readiness

- [ ] Select and document the pilot organization/area; validate role names, workflow stages, application document requirements, delegated decisions and retention with the responsible authority.
- [ ] Obtain authorized, suitable hazard layers and approved screening criteria. Verify those inputs with a qualified authority/technical reviewer before activating operational rules.
- [ ] Run and report the full functional/access-control/spatial test matrix and representative-user usability evaluation against authorized or clearly labeled synthetic data.
- [ ] Define data correction, retention/deletion, backup/restore, file scanning, HTTPS deployment, monitoring, support and security procedures.
- [ ] If the pilot needs full field work offline, implement and test encrypted/local evidence capture and conflict-safe synchronization; the current build only preserves form drafts on the device.

The application is running locally and the production Neon migrations are applied. The system is a prototype, not an official regulatory service; screening is preliminary and does not certify contamination, water safety, compliance or legal authorization.
