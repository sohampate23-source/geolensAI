import pytest
import pandas as pd
from backend.app.planners.fallback import fallback_planner
from backend.app.planners.openrouter import openrouter_planner
from backend.app.ranking.scorer import local_scorer
from backend.app.schemas import (
    QueryPlan, SpatialRelation, TargetType, ReferenceType
)

def test_fallback_planner_basic_proximity():
    q = "Find buildings within 100 metres of major roads"
    plan = fallback_planner.plan(q)
    assert plan.target == TargetType.BUILDINGS
    assert plan.relation == SpatialRelation.WITHIN
    assert plan.reference == ReferenceType.MAJOR_ROADS
    assert plan.distance_m == 100.0

def test_fallback_planner_min_area():
    q = "Locate buildings that are at least 500 square metres"
    plan = fallback_planner.plan(q)
    assert plan.target == TargetType.BUILDINGS
    assert plan.min_area_m2 == 500.0

def test_fallback_planner_beyond_relation():
    q = "Show me all buildings in this area that are more than 50 metres from a road"
    plan = fallback_planner.plan(q)
    assert plan.target == TargetType.BUILDINGS
    assert plan.relation == SpatialRelation.BEYOND
    assert plan.distance_m == 50.0

def test_fallback_planner_exclusion():
    q = "Show buildings near roads but exclude those inside the industrial zone"
    plan = fallback_planner.plan(q)
    assert plan.target == TargetType.BUILDINGS
    assert plan.relation == SpatialRelation.WITHIN
    assert plan.exclude_zone == "industrial"

def test_fallback_planner_followup_update():
    initial_plan = fallback_planner.plan("buildings within 100 metres of roads")
    # Follow-up: refine with area threshold
    refined_plan = fallback_planner.plan("only those at least 600 m2", previous_plan=initial_plan)
    assert refined_plan.relation == SpatialRelation.WITHIN
    assert refined_plan.distance_m == 100.0
    assert refined_plan.min_area_m2 == 600.0

def test_local_scorer_ranking_and_breakdown():
    # Sample dataframe with candidate features
    df = pd.DataFrame([
        {"id": "b1", "area_m2": 400.0, "distance_to_reference_m": 20.0, "building_type": "residential"},
        {"id": "b2", "area_m2": 1200.0, "distance_to_reference_m": 15.0, "building_type": "commercial"},
        {"id": "b3", "area_m2": 250.0, "distance_to_reference_m": 90.0, "building_type": "residential"}
    ])

    ranked = local_scorer.score_candidates(df)
    assert len(ranked) == 3
    # b2 has largest area and close to road, should be rank 1
    assert ranked[0].feature_id == "b2"
    assert ranked[0].rank == 1
    assert ranked[0].human_review_notice == "Ranked candidates — for human review."

    # Check criteria breakdowns
    breakdown = ranked[0].criteria_breakdown
    assert len(breakdown) >= 2
    criterion_names = [b.criterion for b in breakdown]
    assert "Surface Area" in criterion_names
    assert "Road Proximity" in criterion_names

def test_openrouter_live_query_plan():
    from backend.app.config import settings
    if not settings.OPENROUTER_RUN_LIVE_TESTS or not openrouter_planner.is_configured():
        pytest.skip("Live OpenRouter tests not enabled or key not configured")

    plan = openrouter_planner.plan("Find buildings within 100 metres of major roads")
    assert plan.target == TargetType.BUILDINGS
    assert plan.relation == SpatialRelation.WITHIN
    assert plan.reference in [ReferenceType.MAJOR_ROADS, ReferenceType.ROADS]
    assert plan.distance_m == 100.0
    assert plan.planner_source == "openrouter"

