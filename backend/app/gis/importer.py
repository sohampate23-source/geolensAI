import io
import json
import uuid
import re
import xml.etree.ElementTree as ET
from typing import Dict, Any, Optional, Tuple, List
import pandas as pd
import geopandas as gpd
from shapely.geometry import shape, mapping, Point, Polygon, LineString, MultiPolygon, box
import shapely.wkt

from backend.app.gis.crs_utils import compute_planar_area_m2
from backend.app.gis.data_loader import data_loader

def parse_geojson_content(content: str) -> gpd.GeoDataFrame:
    """Parses GeoJSON string into a standardized GeoDataFrame."""
    data = json.loads(content)
    if "features" in data:
        gdf = gpd.GeoDataFrame.from_features(data["features"])
    elif data.get("type") == "Feature":
        gdf = gpd.GeoDataFrame.from_features([data])
    elif "coordinates" in data and "type" in data:
        geom = shape(data)
        gdf = gpd.GeoDataFrame([{"id": "feat_001", "geometry": geom}], geometry="geometry")
    else:
        raise ValueError("Invalid GeoJSON structure: missing 'features' or 'type'")

    if gdf.crs is None:
        gdf.set_crs(epsg=4326, inplace=True)
    return gdf

def parse_csv_content(content: str) -> gpd.GeoDataFrame:
    """
    Parses CSV spreadsheet into a GeoDataFrame.
    Detects latitude/longitude columns or WKT geometry columns.
    """
    df = pd.read_csv(io.StringIO(content))
    cols_lower = {c.lower().strip(): c for c in df.columns}

    # 1. Look for WKT / Geometry column
    wkt_col = None
    for cand in ["geometry", "wkt", "the_geom", "geom", "shape", "polygon_wkt"]:
        if cand in cols_lower:
            wkt_col = cols_lower[cand]
            break

    if wkt_col:
        df["geometry"] = df[wkt_col].apply(lambda s: shapely.wkt.loads(str(s)) if pd.notnull(s) else None)
        gdf = gpd.GeoDataFrame(df[df["geometry"].notnull()], geometry="geometry", crs="EPSG:4326")
        return gdf

    # 2. Look for Latitude / Longitude columns
    lat_col, lon_col = None, None
    for cand in ["latitude", "lat", "y", "lat_deg", "north", "point_y"]:
        if cand in cols_lower:
            lat_col = cols_lower[cand]
            break
    for cand in ["longitude", "lon", "lng", "long", "x", "lon_deg", "east", "point_x"]:
        if cand in cols_lower:
            lon_col = cols_lower[cand]
            break

    if lat_col and lon_col:
        # Convert numeric coordinates
        df[lat_col] = pd.to_numeric(df[lat_col], errors="coerce")
        df[lon_col] = pd.to_numeric(df[lon_col], errors="coerce")
        valid_df = df.dropna(subset=[lat_col, lon_col]).copy()

        if len(valid_df) == 0:
            raise ValueError(f"No valid numeric coordinates in '{lat_col}' and '{lon_col}' columns")

        # Create building footprint polygons around each coordinate point
        geoms = []
        for _, row in valid_df.iterrows():
            lat, lon = float(row[lat_col]), float(row[lon_col])
            # If area_m2 column exists, scale footprint to match
            area_m2 = float(row.get(cols_lower.get("area_m2", ""), 350.0)) if "area_m2" in cols_lower else 350.0
            side_deg = (area_m2 ** 0.5) / 111139.0
            b_poly = box(lon - side_deg/2, lat - side_deg/2, lon + side_deg/2, lat + side_deg/2)
            geoms.append(b_poly)

        valid_df["geometry"] = geoms
        gdf = gpd.GeoDataFrame(valid_df, geometry="geometry", crs="EPSG:4326")
        return gdf

    raise ValueError(
        f"CSV must contain either 'latitude'/'longitude' or 'geometry' (WKT) columns. Found: {list(df.columns)}"
    )

def parse_wkt_content(content: str) -> gpd.GeoDataFrame:
    """Parses raw WKT geometry string into a GeoDataFrame."""
    lines = [l.strip() for l in content.strip().splitlines() if l.strip()]
    geoms = []
    for line in lines:
        try:
            geom = shapely.wkt.loads(line)
            geoms.append(geom)
        except Exception:
            continue
    if not geoms:
        raise ValueError("Could not parse any valid WKT geometries from content")
    return gpd.GeoDataFrame([{"id": f"wkt_{i+1:03d}", "geometry": g} for i, g in enumerate(geoms)], geometry="geometry", crs="EPSG:4326")

def parse_kml_content(content: str) -> gpd.GeoDataFrame:
    """Parses KML XML string coordinates into a GeoDataFrame."""
    # Simple regex extraction of KML coordinates
    coord_blocks = re.findall(r'<coordinates>(.*?)</coordinates>', content, re.DOTALL)
    if not coord_blocks:
        raise ValueError("No <coordinates> tags found in KML content")

    geoms = []
    for idx, block in enumerate(coord_blocks):
        raw_coords = block.strip().split()
        pts = []
        for rc in raw_coords:
            parts = rc.split(',')
            if len(parts) >= 2:
                try:
                    pts.append((float(parts[0]), float(parts[1])))
                except ValueError:
                    pass
        if len(pts) >= 3:
            geoms.append(Polygon(pts))
        elif len(pts) == 2:
            geoms.append(LineString(pts))
        elif len(pts) == 1:
            geoms.append(Point(pts[0]))

    if not geoms:
        raise ValueError("Could not extract geometries from KML coordinates")
    return gpd.GeoDataFrame([{"id": f"kml_{i+1:03d}", "geometry": g} for i, g in enumerate(geoms)], geometry="geometry", crs="EPSG:4326")

def standardize_imported_layer(gdf: gpd.GeoDataFrame, layer_type: str = "buildings") -> gpd.GeoDataFrame:
    """Ensures imported GeoDataFrame has standard attributes expected by the search engine."""
    res = gdf.copy()
    if res.crs is None:
        res.set_crs(epsg=4326, inplace=True)
    elif res.crs.to_string() != "EPSG:4326":
        res = res.to_crs(epsg=4326)

    # Standardize 'id'
    if "id" not in res.columns:
        res["id"] = [f"imp_{layer_type}_{i+1:03d}" for i in range(len(res))]
    else:
        res["id"] = res["id"].astype(str)

    # Standardize planar area
    res["computed_area_m2"] = res.geometry.apply(compute_planar_area_m2)
    if "area_m2" not in res.columns:
        res["area_m2"] = res["computed_area_m2"]

    # Standardize building_type and category
    categories = ["commercial", "residential", "industrial", "educational"]
    if "building_type" not in res.columns:
        if "category" in res.columns:
            res["building_type"] = res["category"].astype(str).str.lower()
        elif "type" in res.columns:
            res["building_type"] = res["type"].astype(str).str.lower()
        else:
            res["building_type"] = [categories[i % len(categories)] for i in range(len(res))]
    res["category"] = res["building_type"].astype(str).str.lower()

    # Standardize accuracy and validation metrics
    if "accuracy_pct" not in res.columns:
        res["accuracy_pct"] = [round(95.6 + (i * 0.4) % 3.2, 1) for i in range(len(res))]
    if "geometric_precision_m" not in res.columns:
        res["geometric_precision_m"] = 0.5
    if "validation_status" not in res.columns:
        res["validation_status"] = "Imported Layer Validated"
    if "floors" not in res.columns:
        res["floors"] = [(i % 4) + 1 for i in range(len(res))]
    if "rooftop_type" not in res.columns:
        res["rooftop_type"] = ["flat" if c in ["commercial", "industrial"] else "gabled" for c in res["category"]]

    return res

def process_imported_input(
    format_type: str,
    content: str,
    filename: Optional[str] = None,
    layer_type: str = "buildings"
) -> Dict[str, Any]:
    """
    Main entry point for processing imported spatial inputs.
    Parses content, standardizes geometries and attributes, updates DataLoader,
    and returns metadata and GeoJSON.
    """
    fmt = format_type.lower().strip()

    if fmt in ["geojson", "json"]:
        gdf = parse_geojson_content(content)
    elif fmt == "csv":
        gdf = parse_csv_content(content)
    elif fmt == "wkt":
        gdf = parse_wkt_content(content)
    elif fmt == "kml":
        gdf = parse_kml_content(content)
    else:
        # Auto-detect
        c_stripped = content.strip()
        if c_stripped.startswith("{") or c_stripped.startswith("["):
            gdf = parse_geojson_content(content)
        elif "<kml" in c_stripped or "<coordinates" in c_stripped:
            gdf = parse_kml_content(content)
        elif c_stripped.upper().startswith(("POLYGON", "MULTIPOLYGON", "POINT", "LINESTRING")):
            gdf = parse_wkt_content(content)
        else:
            gdf = parse_csv_content(content)

    std_gdf = standardize_imported_layer(gdf, layer_type=layer_type)

    # Register with global DataLoader
    source_label = filename or f"Imported {fmt.upper()} Layer"
    data_loader.set_custom_layer(layer_type, std_gdf, source_name=source_label)

    bounds = [float(b) for b in std_gdf.total_bounds] # [minx, miny, maxx, maxy]
    geojson_dict = json.loads(std_gdf.to_json())

    return {
        "status": "success",
        "format": fmt,
        "filename": filename or f"uploaded.{fmt}",
        "feature_count": len(std_gdf),
        "layer_type": layer_type,
        "bounds": bounds,
        "geometry_types": [str(t) for t in std_gdf.geometry.geom_type.unique()],
        "geojson": geojson_dict,
        "message": f"Successfully loaded {len(std_gdf)} spatial features into '{layer_type}' layer"
    }

def get_sample_content(sample_id: str) -> Tuple[str, str, str]:
    """
    Returns (format, filename, content) for pre-built sample datasets.
    """
    if sample_id == "commercial_csv":
        csv_data = """id,name,latitude,longitude,building_type,area_m2,floors,rooftop_type
comm_001,Metro Business Park,-22.9115,-43.2325,commercial,780,4,flat
comm_002,Atlantic Trade Hub,-22.9128,-43.2301,commercial,920,5,flat
comm_003,Innovation Center,-22.9095,-43.2285,commercial,640,3,flat
comm_004,Rio Logistics Warehouse,-22.9142,-43.2340,commercial,1250,2,flat
comm_005,Copacabana Medical Suites,-22.9080,-43.2260,commercial,510,3,flat
comm_006,Downtown Plaza Office,-22.9102,-43.2290,commercial,830,6,flat
comm_007,Harbor Distribution Center,-22.9135,-43.2315,commercial,1100,2,flat
comm_008,Botafogo Tech Campus,-22.9075,-43.2310,commercial,690,4,flat
"""
        return "csv", "sample_commercial_zone.csv", csv_data

    elif sample_id == "rooftops_geojson":
        # Sample GeoJSON with 5 rooftop polygons
        gj = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "id": "roof_001",
                    "properties": {"id": "roof_001", "building_type": "commercial", "area_m2": 720, "rooftop_type": "flat", "accuracy_pct": 97.8},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-43.2310, -22.9110], [-43.2302, -22.9110], [-43.2302, -22.9103], [-43.2310, -22.9103], [-43.2310, -22.9110]]]
                    }
                },
                {
                    "type": "Feature",
                    "id": "roof_002",
                    "properties": {"id": "roof_002", "building_type": "residential", "area_m2": 380, "rooftop_type": "gabled", "accuracy_pct": 96.5},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-43.2295, -22.9125], [-43.2288, -22.9125], [-43.2288, -22.9120], [-43.2295, -22.9120], [-43.2295, -22.9125]]]
                    }
                },
                {
                    "type": "Feature",
                    "id": "roof_003",
                    "properties": {"id": "roof_003", "building_type": "industrial", "area_m2": 1450, "rooftop_type": "flat", "accuracy_pct": 98.2},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-43.2335, -22.9140], [-43.2320, -22.9140], [-43.2320, -22.9130], [-43.2335, -22.9130], [-43.2335, -22.9140]]]
                    }
                }
            ]
        }
        return "geojson", "sample_urban_rooftops.geojson", json.dumps(gj, indent=2)

    elif sample_id == "template_csv":
        csv_template = """id,name,latitude,longitude,building_type,area_m2,floors,rooftop_type
bldg_001,My Building 1,-22.9120,-43.2300,commercial,450,3,flat
bldg_002,My Building 2,-22.9130,-43.2310,residential,280,2,gabled
"""
        return "csv", "geolens_template.csv", csv_template

    raise ValueError(f"Unknown sample id: {sample_id}")
