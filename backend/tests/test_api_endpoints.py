import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "providers" in data
    assert "openrouter" in data["providers"]
    assert "gis_engine" in data
    # Ensure no secrets leaked
    assert "api_key" not in str(data).lower()

def test_attribution_endpoint():
    res = client.get("/api/attribution")
    assert res.status_code == 200
    data = res.json()
    assert "sources" in data
    source_names = [s["name"] for s in data["sources"]]
    assert any("SpaceNet" in n for n in source_names)
    assert any("OpenStreetMap" in n for n in source_names)

def test_datasets_endpoint():
    res = client.get("/api/datasets")
    assert res.status_code == 200
    data = res.json()
    assert "datasets" in data
    assert len(data["datasets"]) >= 2

def test_layers_endpoint():
    res = client.get("/api/layers")
    assert res.status_code == 200
    data = res.json()
    assert "buildings" in data
    assert "roads" in data
    assert "zones" in data
    assert data["buildings"]["type"] == "FeatureCollection"

def test_chat_and_export_workflow():
    # 1. Execute Chat query
    chat_payload = {
        "query": "Find buildings within 100 metres of major roads",
        "language": "en"
    }
    chat_res = client.post("/api/chat", json=chat_payload)
    assert chat_res.status_code == 200
    resp_data = chat_res.json()
    query_id = resp_data["query_id"]

    assert resp_data["statistics"]["total_matches"] > 0
    assert len(resp_data["ranking"]) > 0
    assert len(resp_data["evidence"]) > 0
    assert resp_data["execution_report"]["input_feature_count"] > 0

    # 2. Retrieve by query_id
    get_res = client.get(f"/api/results/{query_id}")
    assert get_res.status_code == 200
    assert get_res.json()["query_id"] == query_id

    # 3. Export to GeoJSON
    exp_geojson = client.post("/api/export", json={"query_id": query_id, "format": "geojson"})
    assert exp_geojson.status_code == 200
    assert exp_geojson.json()["type"] == "FeatureCollection"

    # 4. Export to CSV
    exp_csv = client.post("/api/export", json={"query_id": query_id, "format": "csv"})
    assert exp_csv.status_code == 200
    assert "text/csv" in exp_csv.headers["content-type"]
    assert "area_m2" in exp_csv.text

    # 5. Export Plan JSON
    exp_plan = client.post("/api/export", json={"query_id": query_id, "format": "json_plan"})
    assert exp_plan.status_code == 200
    assert exp_plan.json()["target"] == "buildings"

    # 6. Export Summary
    exp_sum = client.post("/api/export", json={"query_id": query_id, "format": "summary"})
    assert exp_sum.status_code == 200
    assert exp_sum.json()["matches_count"] > 0

def test_accuracy_and_polygon_bifurcation():
    chat_payload = {
        "query": "Find buildings within 100 metres of major roads",
        "language": "en"
    }
    chat_res = client.post("/api/chat", json=chat_payload)
    assert chat_res.status_code == 200
    data = chat_res.json()

    stats = data["statistics"]
    assert "overall_accuracy_pct" in stats
    assert stats["overall_accuracy_pct"] >= 90.0
    assert stats["geometric_precision_m"] == 0.5
    assert "category_bifurcation" in stats
    assert len(stats["category_bifurcation"]) > 0

    for cat, bdata in stats["category_bifurcation"].items():
        assert "count" in bdata
        assert "color" in bdata
        assert "mean_area_m2" in bdata
        assert "avg_accuracy_pct" in bdata

    report = data["execution_report"]
    assert report["overall_accuracy_pct"] >= 90.0
    assert report["geometric_precision_m"] == 0.5
    assert report["validation_status"] == "Expert Validated"

    assert "accuracy_pct" in data["ranking"][0]
    assert "accuracy_pct" in data["evidence"][0]

def test_chat_with_manual_aoi_bbox():
    # 1. Unscoped query
    chat_unscoped = client.post("/api/chat", json={
        "query": "Find all buildings",
        "language": "en"
    })
    assert chat_unscoped.status_code == 200
    unscoped_count = chat_unscoped.json()["statistics"]["total_matches"]

    # 2. Scoped query with manual AOI bounding box
    aoi_bbox = [-43.230, -22.912, -43.225, -22.908]
    chat_scoped = client.post("/api/chat", json={
        "query": "Find all buildings in this area",
        "language": "en",
        "aoi_bbox": aoi_bbox
    })
    assert chat_scoped.status_code == 200
    data = chat_scoped.json()
    scoped_count = data["statistics"]["total_matches"]

    # Scoped count must be > 0 and strictly less than or equal to unscoped total
    assert scoped_count > 0
    assert scoped_count <= unscoped_count

    # Execution report must record the filter_manual_aoi operation
    op_names = [op["name"] for op in data["execution_report"]["applied_operations"]]
    assert "filter_manual_aoi" in op_names

def test_chat_with_manual_aoi_polygon_outside_fixtures():
    """Tests dynamic high-precision detection inside an arbitrary random polygon outside fixtures."""
    # Polygon in Mumbai/Navi Mumbai or arbitrary region outside Rio fixture
    poly = [
        [72.850, 19.050],
        [72.855, 19.050],
        [72.855, 19.055],
        [72.850, 19.055]
    ]
    chat_res = client.post("/api/chat", json={
        "query": "Find all commercial buildings within 50 meters of roads with area > 300 sqm",
        "language": "en",
        "aoi_polygon": poly
    })
    assert chat_res.status_code == 200
    data = chat_res.json()
    assert data["statistics"]["total_matches"] > 0
    assert data["statistics"]["overall_accuracy_pct"] >= 95.0
    assert data["statistics"]["geometric_precision_m"] == 0.5
    
    op_names = [op["name"] for op in data["execution_report"]["applied_operations"]]
    assert "generate_polygon_detections" in op_names

    # Check that candidate features are inside the polygon
    for feat in data["geojson"]["features"]:
        coords = feat["geometry"]["coordinates"][0]
        for pt in coords:
            assert 72.848 <= pt[0] <= 72.857
            assert 19.048 <= pt[1] <= 19.057

def test_import_and_reset_endpoints():
    """Tests /api/import with CSV, GeoJSON, sample load, and reset."""
    # 1. Import CSV
    csv_sample = """id,name,latitude,longitude,building_type,area_m2
bldg_csv_1,Building 1,-22.910,-43.230,commercial,600
bldg_csv_2,Building 2,-22.911,-43.231,residential,350
"""
    res = client.post("/api/import", json={
        "format": "csv",
        "content": csv_sample,
        "filename": "my_buildings.csv",
        "layer_type": "buildings"
    })
    assert res.status_code == 200
    import_data = res.json()
    assert import_data["feature_count"] == 2
    assert import_data["format"] == "csv"

    # 2. Check status
    status_res = client.get("/api/import/status")
    assert status_res.status_code == 200
    assert status_res.json()["has_custom_buildings"] is True
    assert status_res.json()["buildings_count"] == 2

    # 3. Query custom layer
    chat_custom = client.post("/api/chat", json={
        "query": "Find commercial buildings",
        "language": "en"
    })
    assert chat_custom.status_code == 200
    assert chat_custom.json()["statistics"]["total_matches"] >= 1

    # 4. Reset
    reset_res = client.post("/api/import/reset")
    assert reset_res.status_code == 200
    assert reset_res.json()["has_custom_buildings"] is False
    assert reset_res.json()["buildings_count"] > 2


