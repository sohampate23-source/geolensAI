import re
from typing import Optional
from backend.app.schemas import QueryPlan, SpatialRelation, TargetType, ReferenceType
from backend.app.planners.base import BasePlanner

class FallbackPlanner(BasePlanner):
    """
    Deterministic rule-based query planner supporting common geospatial
    query patterns when LLM is unconfigured or unavailable.
    """
    def plan(self, query: str, previous_plan: Optional[QueryPlan] = None) -> QueryPlan:
        q = query.lower().strip()

        # Start with previous plan or defaults
        target = previous_plan.target if previous_plan else TargetType.BUILDINGS
        relation = previous_plan.relation if previous_plan else SpatialRelation.NONE
        reference = previous_plan.reference if previous_plan else ReferenceType.NONE
        distance_m = previous_plan.distance_m if previous_plan else None
        min_area_m2 = previous_plan.min_area_m2 if previous_plan else None
        max_area_m2 = previous_plan.max_area_m2 if previous_plan else None
        exclude_zone = previous_plan.exclude_zone if previous_plan else None
        rooftop_type = previous_plan.rooftop_type if previous_plan else None
        clustering = previous_plan.clustering if previous_plan else False

        # If fresh query without previous plan, start fresh
        if previous_plan is None:
            relation = SpatialRelation.NONE
            reference = ReferenceType.NONE
            distance_m = None
            min_area_m2 = None
            exclude_zone = None
            rooftop_type = None

        # 1. Target identification
        if any(b in q for b in ["building", "footprint", "house", "structure", "facility"]):
            target = TargetType.BUILDINGS
        elif "rooftop" in q or "roof" in q:
            target = TargetType.ROOFTOPS
            if "large" in q:
                min_area_m2 = 600.0
            if "flat" in q:
                rooftop_type = "flat"
        elif "cluster" in q:
            target = TargetType.CLUSTERS
            clustering = True
        elif any(r in q for r in ["road", "highway", "street"]) and not any(k in q for k in ["of road", "to road", "from road", "near road"]):
            target = TargetType.ROADS
        else:
            target = TargetType.BUILDINGS

        # 2. Reference entity
        if "major road" in q or "highway" in q:
            reference = ReferenceType.MAJOR_ROADS
        elif "road" in q:
            reference = ReferenceType.ROADS
        elif "drainage" in q or "channel" in q:
            reference = ReferenceType.DRAINAGE
        elif "industrial zone" in q and ("in" in q or "inside" in q) and "exclude" not in q:
            reference = ReferenceType.INDUSTRIAL_ZONE

        # 3. Spatial Relation & Distance
        # Check for distance extraction (e.g. "100 metres", "50m", "50 meters", "200 m")
        dist_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:m\b|metres?|meters?)', q)
        if dist_match:
            distance_m = float(dist_match.group(1))

        if any(term in q for term in ["more than", "greater than", "far from", "beyond", "farther than"]):
            relation = SpatialRelation.BEYOND
            if distance_m is None:
                distance_m = 50.0 # Default distance for "far from roads"
            if reference == ReferenceType.NONE:
                reference = ReferenceType.ROADS
        elif any(term in q for term in ["within", "near", "close to", "adjacent to", "along", "next to"]):
            relation = SpatialRelation.WITHIN
            if distance_m is None:
                distance_m = 100.0 # Default distance for "near roads"
            if reference == ReferenceType.NONE:
                reference = ReferenceType.ROADS
        elif any(term in q for term in ["intersect", "crossing", "overlap"]):
            relation = SpatialRelation.INTERSECTS

        # 4. Area constraints
        area_match = re.search(r'(?:at least|minimum|min|larger than|greater than|>=)\s*(\d+(?:\.\d+)?)\s*(?:sqm|m2|square\s*metres?|square\s*meters?)', q)
        if area_match:
            min_area_m2 = float(area_match.group(1))
        elif "large building" in q or "large rooftop" in q or "large footprint" in q:
            if min_area_m2 is None:
                min_area_m2 = 500.0

        max_area_match = re.search(r'(?:at most|maximum|max|smaller than|less than|<=)\s*(\d+(?:\.\d+)?)\s*(?:sqm|m2|square\s*metres?)', q)
        if max_area_match:
            max_area_m2 = float(max_area_match.group(1))

        # 5. Exclusion constraints
        if any(term in q for term in ["exclude", "excluding", "outside", "without", "not inside", "except"]):
            if "industrial" in q:
                exclude_zone = "industrial"
            elif "conservation" in q or "preservation" in q:
                exclude_zone = "conservation"
            else:
                exclude_zone = "industrial"

        return QueryPlan(
            target=target,
            relation=relation,
            reference=reference,
            distance_m=distance_m,
            min_area_m2=min_area_m2,
            max_area_m2=max_area_m2,
            exclude_zone=exclude_zone,
            rooftop_type=rooftop_type,
            clustering=clustering,
            original_query=query,
            planner_source="rule_fallback",
            model_name="deterministic_rules_v1"
        )

fallback_planner = FallbackPlanner()
