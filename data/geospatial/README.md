# Zimbabwe hydrogeology reference layer

`client/public/datasets/zimbabwe-hydrogeology-reference.geojson` contains the 2,315 hydrogeological polygons from the IGRAC/SADC-GIP GeoPackage record [496](https://sadc-gip.org:4443/catalogue/#/document/496).

- Source title: *Georeferencing and digitizing the national hydrogeological map of Zimbabwe - GeoPackage file*.
- Original hydrogeological map: 1986; digitization package published 20 December 2022.
- License: CC BY-SA 4.0. Attribute IGRAC and SADC-GIP, and preserve this license for redistributed adaptations.
- The source GeoPackage uses a custom Transverse Mercator CRS with an unspecified datum. The polygons were transformed to WGS 84 for the app's longitude/latitude canvas using PROJ's ballpark datum operation and simplified at 750 m for browser rendering.
- This adapted layer is **visual reference context only**. Its approximate coordinate transformation and historical hydrogeology do not meet the app's verified-layer requirements. It is intentionally excluded from server-side screening and does not represent borehole locations or hazard determinations.
- Only the hydrogeological polygon table was included; the GeoPackage's original raster, grid, geology linework, and boundary tables were not imported.

## Borehole inventory imports

The GIS screen accepts a GeoJSON FeatureCollection of Zimbabwe `Point` features with `country: "Zimbabwe"`, a national borehole ID (`natl_bhid`, `national_bhid`, or `sadc_bhid`), and WGS84 longitude/latitude properties (`long_wgs84`, `lat_wgs84`) or Point coordinates. The import flow previews valid and excluded counts before saving. It is restricted to users with record creation and all-record access. Imported rows retain the original feature properties in the protected database, are marked unverified, and are deduplicated by national borehole ID. The source file's datum is recorded as unknown; these imports do not create a screening clearance.
