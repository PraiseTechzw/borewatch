# Zimbabwe hydrogeology reference layer

`client/public/datasets/zimbabwe-hydrogeology-reference.geojson` contains the 2,315 hydrogeological polygons from the IGRAC/SADC-GIP GeoPackage record [496](https://sadc-gip.org:4443/catalogue/#/document/496).

- Source title: *Georeferencing and digitizing the national hydrogeological map of Zimbabwe - GeoPackage file*.
- Original hydrogeological map: 1986; digitization package published 20 December 2022.
- License: CC BY-SA 4.0. Attribute IGRAC and SADC-GIP, and preserve this license for redistributed adaptations.
- The source GeoPackage uses a custom Transverse Mercator CRS with an unspecified datum. The polygons were transformed to WGS 84 for the app's longitude/latitude canvas using PROJ's ballpark datum operation and simplified at 750 m for browser rendering.
- This adapted layer is **visual reference context only**. Its approximate coordinate transformation and historical hydrogeology do not meet the app's verified-layer requirements. It is intentionally excluded from server-side screening and does not represent borehole locations or hazard determinations.
- Only the hydrogeological polygon table was included; the GeoPackage's original raster, grid, geology linework, and boundary tables were not imported.

## Borehole inventory imports

`borehole_database-1758978934.geojson` is the supplied national inventory (17,232 point features). It has 9,436 non-missing static water-level values and 9,740 yields from historical completion years 1938–2002. Its EC, TDS, fluoride and nitrate fields contain no measurements, and `geod_datum` is unknown. GIS has a direct **Import supplied borehole data** action, restricted to users with record creation and all-record access. Imports are batched, audited and deduplicated by national borehole ID. Records remain unverified until coordinate datum and provenance are checked; they cannot create a screening clearance. The same screen also accepts other GeoJSON FeatureCollections for review and import.

## Catchment reference data

`catchments-1761164005/catchments-1761164004.geojson` is available in GIS as a protected, toggleable reference overlay with seven catchment polygons. The [Zimbabwe Geoportal Main Catchments record](https://stagging.zimgeoportal.org.zw/datasets/main-catchments/) lists PDDL 1.0 and provides the GeoJSON download behind login. The GeoJSON declares CRS84, while its associated QGIS metadata reports EPSG:32735; confirm that discrepancy before measurement. It is excluded from screening rules and decisions.


## Additional data links

- Regional groundwater maps and borehole information: [SADC-GIP](https://sadc-gip.quartex.co.za/). Selected groundwater chemistry may be available by layer; coverage varies.
- Surface-water dam levels and catchment summaries: [ZINWA Dam Levels](https://zinwa.co.zw/dam-levels/). This is an external, changing dashboard and not a groundwater-quality feed.
- Current source metadata and local file availability are maintained in the BoreWatch Data sources page.
