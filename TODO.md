# BoreWatch delivery status

## Implemented in the current server-backed release

- [x] Neon Managed Auth registration, sign-in, sessions and password changes.
- [x] PostgreSQL persistence for borehole records, responsible parties, applications, workflow history, inspections, follow-up actions, screening metadata/results, source metadata and audit events.
- [x] Server-side permission checks for record scope, private evidence, application actions, inspection assignment/submission/review, follow-up ownership, administration and reports.
- [x] Borehole register with coordinate validation, technical details, operational lifecycle fields and restricted responsible-party contacts.
- [x] Application drafts, completeness checklist, categorized private evidence, applicant response, review transitions and reasoned decisions.
- [x] Responsive assigned-inspection workflow with coordinate confirmation, checklist, observations, findings, recommendations, evidence and immutable submitted findings.
- [x] Follow-up assignments with owners, due dates and tracked status.
- [x] Coordinate-grid visualization, record filters, source/rule provenance display, and honest `unable_to_assess` results when verified inputs are absent.
- [x] Authorized reports with filters and audited CSV export.
- [x] Role management, source/rule metadata and workflow configuration, plus read-only audit history.
- [x] Responsive layouts and accessible keyboard interactions for principal record and map workflows.

## Remaining before evaluation or operational adoption

- [ ] Obtain permitted, suitable geospatial layers and implement/validate spatial intersection or distance calculations against test cases. The current map is a coordinate grid, not a GIS basemap or spatial analysis engine.
- [ ] Validate role names, workflow stages, decision powers and screening criteria with the selected authority and pilot stakeholders. No current configuration is an official rule or legal decision.
- [ ] Define and implement notifications if required; current queues and overdue indicators are in-app views, not notification delivery.
- [ ] Confirm personal-data handling, retention/deletion, data correction, backup/restore and deployment/security procedures with the responsible organization.
- [ ] Run functional, access-control, spatial and usability evaluation with a documented authorized or synthetic test dataset.
- [ ] Configure and verify the target Neon project and administrator account before deployment. Generated migrations have not been applied to a live database.

Do not present the system as an official regulatory service or use it to make permit, contamination, safety or compliance determinations until the relevant authority, data and operational controls have been validated.
