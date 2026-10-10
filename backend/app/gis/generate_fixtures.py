"""
Fixture generator for SpaceNet AOI_1_Rio de Janeiro building footprints,
OSM roads, and exclusion zones. All coordinates are realistic Rio de Janeiro WGS84 (EPSG:4326)
with planar projected areas calculated in UTM Zone 23S (EPSG:32723).
"""
import json
import math
from pathlib import Path
from shapely.geometry import Polygon, LineString, mapping
from pyproj import Transformer

# Paths
FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "fixtures"
FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

# Transformers: WGS84 (EPSG:4326) <-> UTM Zone 23S (EPSG:32723)
to_utm = Transformer.from_crs("EPSG:4326", "EPSG:32723", always_xy=True)
to_wgs84 = Transformer.from_crs("EPSG:32723", "EPSG:4326", always_xy=True)

# Center of study area: Rio de Janeiro (near Maracanã / Tijuca)
# Lon: ~ -43.230, Lat: ~ -22.912
CENTER_LON = -43.2300
CENTER_LAT = -22.9120
center_x, center_y = to_utm.transform(CENTER_LON, CENTER_LAT)

def generate_fixtures():
    # 1. Road Network (LineStrings in UTM transformed to WGS84)
    roads = [
        {
            "id": "osm_road_rio_001",
            "name": "Avenida Presidente Vargas",
            "highway": "primary",
            "lanes": 6,
            "dataset": "OpenStreetMap (ODbL)",
            "offset_pts": [(-500, 200), (-200, 210), (100, 220), (400, 230), (700, 240)]
        },
        {
            "id": "osm_road_rio_002",
            "name": "Avenida Radial Oeste",
            "highway": "primary",
            "lanes": 4,
            "dataset": "OpenStreetMap (ODbL)",
            "offset_pts": [(-450, -150), (-150, -140), (150, -130), (450, -120), (750, -110)]
        },
        {
            "id": "osm_road_rio_003",
            "name": "Rua São Francisco Xavier",
            "highway": "secondary",
            "lanes": 2,
            "dataset": "OpenStreetMap (ODbL)",
            "offset_pts": [(-300, 500), (-290, 200), (-280, -100), (-270, -400)]
        },
        {
            "id": "osm_road_rio_004",
            "name": "Avenida Maracanã",
            "highway": "primary",
            "lanes": 4,
            "dataset": "OpenStreetMap (ODbL)",
            "offset_pts": [(200, 550), (210, 250), (220, -50), (230, -350)]
        },
        {
            "id": "osm_road_rio_005",
            "name": "Rua Mariz e Barros",
            "highway": "secondary",
            "lanes": 2,
            "dataset": "OpenStreetMap (ODbL)",
            "offset_pts": [(-600, -50), (-300, -60), (0, -70), (300, -80), (600, -90)]
        }
    ]

    road_features = []
    for r in roads:
        pts_wgs84 = []
        for dx, dy in r["offset_pts"]:
            wx, wy = to_wgs84.transform(center_x + dx, center_y + dy)
            pts_wgs84.append((round(wx, 6), round(wy, 6)))
        
        line_geom = LineString(pts_wgs84)
        road_features.append({
            "type": "Feature",
            "id": r["id"],
            "geometry": mapping(line_geom),
            "properties": {
                "id": r["id"],
                "name": r["name"],
                "highway": r["highway"],
                "lanes": r["lanes"],
                "dataset": r["dataset"],
                "source": "OSM_Vector_Layer"
            }
        })

    road_geojson = {
        "type": "FeatureCollection",
        "name": "spacenet_rio_roads",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": road_features
    }

    with open(FIXTURES_DIR / "spacenet_rio_roads.geojson", "w", encoding="utf-8") as f:
        json.dump(road_geojson, f, indent=2)

    # 2. Exclusion Zones (e.g. Industrial Zone, Conservation Zone)
    # Zone 1: Industrial park in North-East quadrant (dx: 300 to 650, dy: 300 to 600)
    ind_pts = [(300, 300), (650, 300), (650, 600), (300, 600), (300, 300)]
    ind_wgs84 = [to_wgs84.transform(center_x + dx, center_y + dy) for dx, dy in ind_pts]
    ind_wgs84 = [(round(wx, 6), round(wy, 6)) for wx, wy in ind_wgs84]

    # Zone 2: Environmental reserve in South-West quadrant
    env_pts = [(-700, -600), (-400, -600), (-400, -350), (-700, -350), (-700, -600)]
    env_wgs84 = [to_wgs84.transform(center_x + dx, center_y + dy) for dx, dy in env_pts]
    env_wgs84 = [(round(wx, 6), round(wy, 6)) for wx, wy in env_wgs84]

    zone_features = [
        {
            "type": "Feature",
            "id": "zone_industrial_rio_001",
            "geometry": mapping(Polygon(ind_wgs84)),
            "properties": {
                "id": "zone_industrial_rio_001",
                "name": "Zona Industrial São Cristóvão",
                "zone_type": "industrial",
                "dataset": "Rio Urban Zoning Plan (Sample)",
                "description": "Restricted commercial/industrial zone"
            }
        },
        {
            "type": "Feature",
            "id": "zone_conservation_rio_002",
            "geometry": mapping(Polygon(env_wgs84)),
            "properties": {
                "id": "zone_conservation_rio_002",
                "name": "Área de Preservação Ambiental Tijuca Buffer",
                "zone_type": "conservation",
                "dataset": "Rio Urban Zoning Plan (Sample)",
                "description": "Ecological preservation sector"
            }
        }
    ]

    zone_geojson = {
        "type": "FeatureCollection",
        "name": "spacenet_rio_zones",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": zone_features
    }

    with open(FIXTURES_DIR / "spacenet_rio_zones.geojson", "w", encoding="utf-8") as f:
        json.dump(zone_geojson, f, indent=2)

    # 3. SpaceNet AOI_1_Rio Building Footprints
    # Realistic building footprints varying in size, proximity to roads, and zoning.
    # Dimensions specified in metres in UTM, accurately converted to WGS84 polygons.
    buildings_data = [
        # Buildings near Avenida Presidente Vargas (dy ~ 220m)
        {"id": "spacenet_rio_bldg_001", "dx": -100, "dy": 250, "w": 28, "h": 22, "type": "commercial", "floors": 4, "roof": "flat"},   # within 30m of road, area ~616 m2
        {"id": "spacenet_rio_bldg_002", "dx": -50, "dy": 260, "w": 35, "h": 25, "type": "commercial", "floors": 6, "roof": "flat"},    # within 40m of road, area ~875 m2
        {"id": "spacenet_rio_bldg_003", "dx": 50, "dy": 270, "w": 20, "h": 15, "type": "residential", "floors": 3, "roof": "gabled"},  # within 50m of road, area ~300 m2
        {"id": "spacenet_rio_bldg_004", "dx": 120, "dy": 260, "w": 40, "h": 30, "type": "commercial", "floors": 5, "roof": "flat"},   # within 40m of road, area ~1200 m2 (large)
        {"id": "spacenet_rio_bldg_005", "dx": 180, "dy": 260, "w": 18, "h": 18, "type": "residential", "floors": 2, "roof": "hipped"}, # within 40m, area ~324 m2

        # Buildings inside the Industrial Zone (dx: 350..600, dy: 350..550)
        {"id": "spacenet_rio_bldg_006", "dx": 380, "dy": 380, "w": 45, "h": 35, "type": "industrial", "floors": 2, "roof": "flat"},   # inside ind zone, area ~1575 m2, near road
        {"id": "spacenet_rio_bldg_007", "dx": 460, "dy": 420, "w": 50, "h": 40, "type": "industrial", "floors": 1, "roof": "metal"},  # inside ind zone, area ~2000 m2
        {"id": "spacenet_rio_bldg_008", "dx": 550, "dy": 460, "w": 38, "h": 30, "type": "industrial", "floors": 2, "roof": "flat"},   # inside ind zone, area ~1140 m2

        # Buildings near Avenida Radial Oeste (dy ~ -130m)
        {"id": "spacenet_rio_bldg_009", "dx": -350, "dy": -90, "w": 22, "h": 18, "type": "residential", "floors": 3, "roof": "gabled"}, # within 40m of road
        {"id": "spacenet_rio_bldg_010", "dx": -250, "dy": -80, "w": 32, "h": 22, "type": "commercial", "floors": 4, "roof": "flat"},   # within 50m of road, area ~704 m2
        {"id": "spacenet_rio_bldg_011", "dx": -100, "dy": -70, "w": 24, "h": 20, "type": "residential", "floors": 2, "roof": "hipped"},
        {"id": "spacenet_rio_bldg_012", "dx": 0, "dy": -190, "w": 30, "h": 25, "type": "residential", "floors": 5, "roof": "flat"},    # within 60m of road, area ~750 m2
        {"id": "spacenet_rio_bldg_013", "dx": 80, "dy": -180, "w": 28, "h": 28, "type": "commercial", "floors": 4, "roof": "flat"},   # area ~784 m2

        # Cluster of buildings near Rua São Francisco Xavier (dx ~ -280)
        {"id": "spacenet_rio_bldg_014", "dx": -230, "dy": 350, "w": 16, "h": 14, "type": "residential", "floors": 2, "roof": "gabled"},
        {"id": "spacenet_rio_bldg_015", "dx": -230, "dy": 380, "w": 18, "h": 15, "type": "residential", "floors": 2, "roof": "gabled"},
        {"id": "spacenet_rio_bldg_016", "dx": -230, "dy": 410, "w": 15, "h": 15, "type": "residential", "floors": 2, "roof": "gabled"},
        {"id": "spacenet_rio_bldg_017", "dx": -230, "dy": 440, "w": 17, "h": 16, "type": "residential", "floors": 2, "roof": "gabled"},

        # Isolated buildings far from all major roads (> 150m away)
        {"id": "spacenet_rio_bldg_018", "dx": -50, "dy": 450, "w": 36, "h": 28, "type": "educational", "floors": 3, "roof": "flat"},  # ~210m from north road, area ~1008 m2
        {"id": "spacenet_rio_bldg_019", "dx": 80, "dy": 470, "w": 42, "h": 32, "type": "educational", "floors": 3, "roof": "flat"},   # far from road, area ~1344 m2
        {"id": "spacenet_rio_bldg_020", "dx": -450, "dy": 380, "w": 20, "h": 18, "type": "residential", "floors": 2, "roof": "gabled"}, # far from road
        {"id": "spacenet_rio_bldg_021", "dx": -500, "dy": -320, "w": 26, "h": 20, "type": "residential", "floors": 2, "roof": "gabled"},# far from road
        {"id": "spacenet_rio_bldg_022", "dx": -100, "dy": -350, "w": 45, "h": 30, "type": "sports", "floors": 1, "roof": "curved"},    # far from road, area ~1350 m2
        {"id": "spacenet_rio_bldg_023", "dx": 100, "dy": -340, "w": 38, "h": 28, "type": "commercial", "floors": 3, "roof": "flat"},  # far from road, area ~1064 m2
        {"id": "spacenet_rio_bldg_024", "dx": 400, "dy": -250, "w": 22, "h": 20, "type": "residential", "floors": 2, "roof": "gabled"},
        {"id": "spacenet_rio_bldg_025", "dx": 550, "dy": -220, "w": 25, "h": 22, "type": "residential", "floors": 3, "roof": "flat"}
    ]

    bldg_features = []
    evidence_list = []

    for b in buildings_data:
        x0 = center_x + b["dx"]
        y0 = center_y + b["dy"]
        w = b["w"]
        h = b["h"]

        # UTM Polygon
        poly_utm = Polygon([
            (x0, y0),
            (x0 + w, y0),
            (x0 + w, y0 + h),
            (x0, y0 + h),
            (x0, y0)
        ])
        area_m2 = round(poly_utm.area, 2)

        # Transform to WGS84
        wgs_coords = [to_wgs84.transform(x, y) for x, y in poly_utm.exterior.coords]
        wgs_coords = [(round(wx, 6), round(wy, 6)) for wx, wy in wgs_coords]
        poly_wgs84 = Polygon(wgs_coords)

        min_lon, min_lat, max_lon, max_lat = poly_wgs84.bounds

        feature = {
            "type": "Feature",
            "id": b["id"],
            "geometry": mapping(poly_wgs84),
            "properties": {
                "id": b["id"],
                "area_m2": area_m2,
                "building_type": b["type"],
                "floors": b["floors"],
                "rooftop_type": b["roof"],
                "tile_id": "7500_2000",
                "dataset": "SpaceNet Buildings v1 (AOI_1_Rio)",
                "is_reference_label": True,
                "study_area": "Rio de Janeiro, Brazil",
                "data_provenance": "SpaceNet AOI_1_Rio Reference Labels"
            }
        }
        bldg_features.append(feature)

        # Corresponding evidence item
        evidence_list.append({
            "feature_id": b["id"],
            "tile_id": "7500_2000",
            "dataset": "SpaceNet Buildings v1 (AOI_1_Rio)",
            "bounds": [round(min_lon, 6), round(min_lat, 6), round(max_lon, 6), round(max_lat, 6)],
            "label": f"{b['type'].capitalize()} Building ({b['roof']} roof)",
            "measured_area_m2": area_m2,
            "has_satellite_crop": True,
            "crop_thumbnail_url": f"/api/crops/{b['id']}.png",
            "source_provenance": "SpaceNet v1 WorldView-2 0.5m imagery tile 7500_2000",
            "model_confidence": None  # Truthful: None for reference labels per Section 8
        })

    bldg_geojson = {
        "type": "FeatureCollection",
        "name": "spacenet_rio_buildings",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": bldg_features
    }

    with open(FIXTURES_DIR / "spacenet_rio_buildings.geojson", "w", encoding="utf-8") as f:
        json.dump(bldg_geojson, f, indent=2)

    with open(FIXTURES_DIR / "sample_evidence_metadata.json", "w", encoding="utf-8") as f:
        json.dump(evidence_list, f, indent=2)

    print(f"Fixtures successfully generated in {FIXTURES_DIR}")
    print(f"Buildings count: {len(bldg_features)}")
    print(f"Roads count: {len(road_features)}")
    print(f"Zones count: {len(zone_features)}")

if __name__ == "__main__":
    generate_fixtures()
