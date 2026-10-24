# TODO — Borehole Compliance & Groundwater Risk Monitoring

## 1. Operational dashboard and navigation
- [ ] Provide a role-aware workspace shell and dashboard showing relevant totals, pending tasks, recent activity and an alert queue; make navigation open the related work areas.
- [x] Use plain-language labels and explanations; ensure mobile-responsive navigation and layouts.
- [x] Clearly identify all records as synthetic demonstration data and the product as a proposed prototype requiring stakeholder and regulatory validation.

## 2. Borehole register and record lifecycle
- [x] Provide a searchable/filterable register showing unique reference, location, status and a map affordance; support opening a record and creating a demo record.
- [ ] Show record identity, coordinates, responsible-party/demo details, purpose, technical details, application/inspection history and operational status separately from application/permit status.
- [x] Validate required demonstration fields and coordinate input; show clear inline feedback while retaining entered values. Decimal-degree inputs are checked against generic latitude/longitude bounds only; coordinate reference system and site accuracy are not validated.

## 3. Application workflow and decisions
- [ ] Show application types, completeness, supporting-document checklist, status tracking, review details, screening explanations, comments and history.
- [ ] Represent example transitions including Draft, Submitted, Under Review, More Information Required, Approved, Rejected and Withdrawn; final decisions are human actions only and must not imply legal authorization in this prototype.
- [ ] Keep application/permit status separate from borehole operational status; consequential demo decisions require confirmation and retain a traceable history in the session.

## 4. GIS and explainable preliminary screening
- [ ] Provide a map-oriented view with selectable synthetic borehole markers, legend, filters and visible layer/source/recency metadata.
- [x] Explain each configured screening alert, its rule and available source; state prominently that distance screening cannot prove contamination or legal safety and requires human review.
- [x] Represent absent or stale spatial data as “Unable to assess” rather than “No risk”; label unverified or demonstration layers.

## 5. Inspection and follow-up workflows
- [ ] Provide an inspector worklist with assignments, due dates, location, priority and status; support a mobile-friendly inspection form with coordinate confirmation, checklist, observations, findings and recommendations.
- [ ] Show submitted findings as historical evidence that must not be silently overwritten; support follow-up actions with owner, due date and status.
- [ ] Allow session-only demo interactions for relevant assignment/status actions; do not claim evidence upload, notifications or offline synchronization unless implemented.

## 6. Reporting and administration
- [ ] Provide report controls for date range, area/status filters, totals, export affordances and report notes; explain the synthetic-data boundary.
- [ ] Provide an administration view for users/roles and spatial-rule/data-source metadata including source, date, coverage, rule version, authority and active status.
- [x] Keep ordinary-user audit/history read-only; distinguish technical administration from regulatory decision authority.

## 7. Safety, privacy and prototype boundaries
- [x] Use no real personal data or unverified authoritative layers; minimize displayed contact data.
- [x] Do not claim automatic permit issuance, contamination detection, legal compliance, official adoption or persistent secure storage.
- [x] Explain prototype session-only behavior and the need to validate workflows, delegated powers, data permissions, setback criteria and privacy obligations with the responsible Zimbabwean authority.

## 8. Responsive design, accessibility and delivery
- [x] Apply the approved field-station cartography direction, with Survey teal, readable hierarchy, source/recency tags and subtle contour motifs.
- [x] Support keyboard access, visible focus, semantic buttons/inputs, adequate contrast, and reduced-motion preferences.
- [x] Maintain `client/public/manus-routes.json` synchronized with page routes; run TypeScript and production build checks; verify the dev server and route manifest.
- [x] Save the completed implementation as a checkpoint on the canonical project repository; do not publish without a separate request.
