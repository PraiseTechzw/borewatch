# Implementation plan — Borehole Compliance & Groundwater Risk Monitoring

## Product scope

Build a responsive, role-aware interface prototype for a Zimbabwe-focused borehole registry and groundwater-risk workflow. The product will demonstrate the brief’s primary journeys: dashboard triage; borehole search and record creation/detail; application intake, tracking and review; an indicative GIS screening view; assigned inspections and field findings; follow-up actions; reports; and rule/data and access administration. Navigation will expose these areas as a coherent staff workspace. Interactive filters, tabs, drawers/forms, status changes and report affordances should make the prototype usable in a walkthrough, rather than a static mockup.

Use synthetic demonstration records throughout and visibly label them. The interface is a proposed design, not an authority-approved or legally operative system. Do not imply that a screening alert proves contamination or legal non-compliance. Screening will be described as preliminary and explainable, with the rule/source and uncertainty visible; missing or stale data must be represented as “Unable to assess,” never “no risk.” Decisions remain human and restricted by role in the design. Permit/application state must remain distinct from operational borehole state. Show audit history as traceable, read-only history. No real personal information, authoritative hazard layers, legally effective decisions, real notifications, or real exports are to be fabricated.

For this first build, the product is a front-end demonstration backed by local in-memory React state and synthetic fixture data; create/edit actions and filters work during the session but are not persisted across reloads and do not constitute server-enforced authorization. Although managed server/database resources are available, do not imply they have been wired to production-quality workflows or secure storage. Keep future integration points legible in the project structure. This bounded implementation is appropriate to the supplied student-project blueprint and can be expanded after stakeholder, regulatory and data-source validation.

## Implementation approach and structure

- Keep the supplied React/Vite/TypeScript starter and its configured development server; use React state for demo interactions and the existing icon package. Avoid unnecessary dependencies and any external geographic data assumptions.
- `client/src/App.tsx`: top-level workspace shell, navigation and selected-view routing/state.
- `client/src/pages/Home.tsx`: dashboard and the primary prototype views, split into readable, focused components/modules under `client/src/components/` or `client/src/features/` as useful.
- `client/src/data/demoData.ts`: explicit synthetic records, status labels, activity, screening explanations and source metadata.
- `client/src/index.css`: responsive visual system and app-specific layout, with keyboard focus, reduced-motion support, semantic contrast and mobile behavior.
- `public/manus-routes.json`: static page-route manifest consistent with actual routes. If the prototype remains a single dashboard route, list only `/` (the built-in not-found route only if it is a real user-facing route).
- `plan.md` and `TODO.md`: approved design/build approach and outcome-level acceptance criteria/status.

The app will be served through the initialized `pnpm dev` server on the configured port 3000. TypeScript diagnostics are already registered for this project. Keep all browser-facing assets and navigation relative. Do not add authentication/session behavior until a real approved role and authorization model is implemented; communicate the prototype limitation in the UI.

## Proposed visual direction

Three uncommon style candidates (probabilities from the distribution’s tails):
- Field-station cartography — **0.07**.
- Civic records office / archival ledger — **0.05**.
- Mineral survey instrument panel — **0.03**.

**Selected: Field-station cartography.**

- **Design Movement:** Contemporary field cartography with the calm precision of a well-used survey atlas and the legibility of a modern civic operations console.
- **Core Principles:** Information-first hierarchy; crisp cartographic marks; warm, restrained surfaces; uncertainty always explicit.
- **Color Philosophy:** Deep river-teal anchors the brand; parchment and pale stone backgrounds feel grounded and readable; muted green, amber and rust are reserved for operational statuses and alerts, not decorative alarm.
- **Layout Paradigm:** A narrow, persistent navigation rail beside a broad, scrollable work surface; operational queues and spatial context share asymmetrical horizontal bands rather than equal dashboard tiles.
- **Signature Elements:** Fine contour-line/map-grid traces; location-pin markers with distinct rings; small source/recency tags paired with screening statements.
- **Interaction Philosophy:** Keep actions close to records, make current scope/filter state visible, confirm consequential actions, and distinguish editable controls from read-only history.
- **Animation:** Subtle 140–200 ms opacity/position transitions for menus and drawers, with no animated hazards or map motion; honor `prefers-reduced-motion` and avoid motion as the sole status cue.
- **Typography System:** A sturdy modern sans (system/Inter-like) for controls and data; a restrained editorial serif only for major page titles if locally available. Use tabular numerals for counts and coordinates, with compact but comfortable table text.
- **Brand Essence:** A traceable field-to-register workspace for authorized borehole oversight; **grounded, careful, transparent**.
- **Brand Voice:** Headlines are direct and operational; controls use plain language and avoid certainty beyond evidence. Examples: “See what needs a closer look.” “Screening is preliminary; review the source before acting.”
- **Wordmark & Logo:** A custom drawn well-ring/contour mark: a centered borehole dot within two broken survey rings, paired with a compact uppercase wordmark.
- **Signature Brand Color:** Survey teal, `#176B63`.

## Delivery workflow

After plan approval, create `TODO.md` with outcome-based criteria sourced from the brief, implement the dashboard and workflows in the agreed bounded prototype scope, run the existing TypeScript check and build, inspect/fix actionable diagnostics, start the development server and verify it is listening and that `/manus-routes.json` returns the declared JSON. Then review the implementation against the core brief, update TODO with evidence-backed status, and save a checkpoint to the canonical project repository. Do not publish unless separately requested; auto-publish is currently off.