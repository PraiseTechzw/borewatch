# BoreWatch Zimbabwe geospatial data starter pack

These are empty import templates, not operational datasets. No borehole locations or hazard extents have been fabricated. Do not activate an empty layer or treat it as evidence that hazards are absent.

## Coordinate format

- GeoJSON coordinates use **longitude, latitude** order in decimal degrees (WGS 84 / CRS84, equivalent to EPSG:4326 for this use).
- Borehole capture CSV columns are **latitude, longitude** to make the field form readable. Convert to GeoJSON `[longitude, latitude]` when exporting.
- Record how each point was captured, its accuracy, date, source record identifier, and verification status. Keep exact coordinates restricted where required by consent or policy.
- The importer accepts GeoJSON geometry/Feature/FeatureCollection. Borehole CSV import is not currently implemented; use the template to collect/clean data, then create or update records through BoreWatch.

## Files

- `boreholes-template.geojson`: empty FeatureCollection to receive authorized point features. Suggested properties: `site_id`, `site_name`, `district`, `purpose`, `coordinate_accuracy_m`, `coordinate_captured_on`, `coordinate_source`, `source_record_id`, `verification_status`.
- `borehole-coordinate-template.csv`: field-ready coordinate capture columns.
- `groundwater-risk-template.geojson`: empty FeatureCollection for a reviewed hazard/vulnerability layer. It is intentionally not seeded with inferred risk polygons.
- `sources.md`: researched source register, access/licensing notes, and operational use limits.

## Importing a hazard layer

Import only after a data owner or qualified authority confirms the source, license/permission, version, date, coverage, CRS, accuracy and meaning of the classes. Keep the layer inactive until a technical reviewer approves it. Configure screening rules separately and treat matches as review flags, never as proof of contamination, safety, compliance or legal status.
