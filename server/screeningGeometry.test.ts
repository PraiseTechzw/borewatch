import { describe, expect, it } from "vitest";
import { geoJsonDistanceMeters, parseGeoJson } from "./screeningGeometry";

describe("screening GeoJSON validation and distance", () => {
  it("accepts WGS84 GeoJSON features and feature collections", () => {
    expect(parseGeoJson(JSON.stringify({ type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Point", coordinates: [31.05, -17.82] }, properties: {} }] }))).toMatchObject({ type: "FeatureCollection" });
  });

  it("rejects coordinates outside WGS84 longitude and latitude bounds", () => {
    expect(() => parseGeoJson(JSON.stringify({ type: "Point", coordinates: [201, -17] }))).toThrow(/valid WGS84/);
  });

  it("calculates point distance in metres", () => {
    const geometry = parseGeoJson(JSON.stringify({ type: "Point", coordinates: [1, 0] }));
    expect(geoJsonDistanceMeters([0, 0], geometry)).toBeCloseTo(111195, -1);
  });

  it("measures point-to-line distance and returns zero inside a polygon", () => {
    const line = parseGeoJson(JSON.stringify({ type: "LineString", coordinates: [[0, 0], [1, 0]] }));
    expect(geoJsonDistanceMeters([0.5, 0.001], line)).toBeGreaterThan(100);
    expect(geoJsonDistanceMeters([0.5, 0.001], line)).toBeLessThan(120);
    const polygon = parseGeoJson(JSON.stringify({ type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] }));
    expect(geoJsonDistanceMeters([0.5, 0.5], polygon)).toBe(0);
  });
});
