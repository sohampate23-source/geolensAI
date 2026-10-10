import pytest
from shapely.geometry import Point, Polygon, LineString
from backend.app.gis.crs_utils import (
    to_utm_geometry, to_wgs84_geometry,
    compute_planar_area_m2, compute_planar_distance_m,
    create_planar_buffer_wgs84
)
from backend.app.gis.engine import gis_engine
from backend.app.schemas import (
    QueryPlan, SpatialRelation, TargetType, ReferenceType
)

def test_crs_projection_roundtrip():
    # Rio de Janeiro coordinates
    lon, lat = -43.2300, -22.9120
    pt = Point(lon, lat)
    utm_pt = to_utm_geometry(pt)
    # UTM coordinates in zone 23S are typically ~680,000m E, ~7,460,000m N
    assert utm_pt.x > 500000
    assert utm_pt.y > 7000000

    # Back to WGS84
    wgs_pt = to_wgs84_geometry(utm_pt)
    assert pytest.approx(wgs_pt.x, rel=1e-5) == lon
    assert pytest.approx(wgs_pt.y, rel=1e-5) == lat

def test_accurate_planar_area_calculation():
    # Create 100m x 100m box in UTM
    # Area should be exactly 10,000 m2
    lon, lat = -43.2300, -22.9120
    center_utm = to_utm_geometry(Point(lon, lat))
    cx, cy = center_utm.x, center_utm.y
    box_utm = Polygon([(cx, cy), (cx + 100, cy), (cx + 100, cy + 100), (cx, cy + 100), (cx, cy)])
    box_wgs = to_wgs84_geometry(box_utm)

    computed_area = compute_planar_area_m2(box_wgs)
    assert pytest.approx(computed_area, rel=1e-3) == 10000.0

def test_planar_distance_calculation():
    # 50 metres apart in UTM
    lon, lat = -43.2300, -22.9120
    center_utm = to_utm_geometry(Point(lon, lat))
    cx, cy = center_utm.x, center_utm.y
    p1_utm = Point(cx, cy)
    p2_utm = Point(cx + 50, cy)

    p1_wgs = to_wgs84_geometry(p1_utm)
    p2_wgs = to_wgs84_geometry(p2_utm)

    dist = compute_planar_distance_m(p1_wgs, p2_wgs)
    assert pytest.approx(dist, rel=1e-3) == 50.0

def test_gis_engine_dwithin_filter():
    plan = QueryPlan(
        target=TargetType.BUILDINGS,
        relation=SpatialRelation.WITHIN,
        reference=ReferenceType.ROADS,
        distance_m=100.0
    )
    result_gdf, buffer_geojson, report = gis_engine.execute_query_plan(plan)
    assert len(result_gdf) > 0
    assert report.output_feature_count == len(result_gdf)
    assert all(result_gdf["distance_to_reference_m"] <= 100.0)
    assert buffer_geojson is not None
    assert buffer_geojson["type"] == "FeatureCollection"

def test_gis_engine_beyond_filter():
    plan = QueryPlan(
        target=TargetType.BUILDINGS,
        relation=SpatialRelation.BEYOND,
        reference=ReferenceType.ROADS,
        distance_m=150.0
    )
    result_gdf, buffer_geojson, report = gis_engine.execute_query_plan(plan)
    assert len(result_gdf) > 0
    assert all(result_gdf["distance_to_reference_m"] > 150.0)

def test_gis_engine_min_area_filter():
    plan = QueryPlan(
        target=TargetType.BUILDINGS,
        min_area_m2=800.0
    )
    result_gdf, _, report = gis_engine.execute_query_plan(plan)
    assert len(result_gdf) > 0
    assert all(result_gdf["computed_area_m2"] >= 800.0)

def test_gis_engine_exclusion_semantics():
    # Buildings near roads WITH exclusion of industrial zone
    plan_with_exclusion = QueryPlan(
        target=TargetType.BUILDINGS,
        relation=SpatialRelation.WITHIN,
        reference=ReferenceType.ROADS,
        distance_m=200.0,
        exclude_zone="industrial"
    )
    res_excluded, _, report_ex = gis_engine.execute_query_plan(plan_with_exclusion)

    plan_without_exclusion = QueryPlan(
        target=TargetType.BUILDINGS,
        relation=SpatialRelation.WITHIN,
        reference=ReferenceType.ROADS,
        distance_m=200.0,
        exclude_zone=None
    )
    res_all, _, report_all = gis_engine.execute_query_plan(plan_without_exclusion)

    # Exclusion should yield fewer or equal features, and none inside industrial zone
    assert len(res_excluded) < len(res_all)
    # Check that industrial building IDs (bldg_006, bldg_007, bldg_008) are not in res_excluded
    excluded_ids = set(res_excluded["id"])
    assert "spacenet_rio_bldg_006" not in excluded_ids
    assert "spacenet_rio_bldg_007" not in excluded_ids

def test_empty_results_handling():
    plan = QueryPlan(
        target=TargetType.BUILDINGS,
        min_area_m2=999999.0 # Impossible threshold
    )
    result_gdf, _, report = gis_engine.execute_query_plan(plan)
    assert len(result_gdf) == 0
    assert report.output_feature_count == 0
