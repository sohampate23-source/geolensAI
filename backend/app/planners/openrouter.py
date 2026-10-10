import json
import logging
from typing import Optional, Dict, Any
import httpx

from backend.app.schemas import QueryPlan, SpatialRelation, TargetType, ReferenceType
from backend.app.planners.base import BasePlanner
from backend.app.planners.fallback import fallback_planner
from backend.app.config import settings

logger = logging.getLogger(__name__)

OPENROUTER_PLANNER_SYSTEM_PROMPT = """You are the Natural-Language Geospatial Query Planner for GeoLens AI.
Your job is to translate user geographic requests into a structured, validated QueryPlan JSON object.

Allowed Schema fields:
- "target": "buildings" | "roads" | "rooftops" | "clusters"
- "relation": "within" | "intersects" | "beyond" | "contains" | "none"
- "reference": "major roads" | "roads" | "drainage channels" | "industrial zone" | "none"
- "distance_m": float or null (in metres)
- "min_area_m2": float or null (in square metres)
- "max_area_m2": float or null (in square metres)
- "exclude_zone": string or null (e.g. "industrial zone" or "conservation zone")
- "rooftop_type": string or null (e.g. "flat", "gabled", "hipped")
- "clustering": boolean (true/false)

Rules:
1. ONLY return a single valid JSON object. No explanation, no markdown fence, no other text.
2. The LLM MUST NOT perform geographic calculation or invent data.
3. If user says "within 100 metres of major roads", relation="within", reference="major roads", distance_m=100.
4. If user says "more than 50 metres from a road", relation="beyond", reference="roads", distance_m=50.
5. If user says "at least 500 square metres", min_area_m2=500.
6. If user says "exclude industrial zone", exclude_zone="industrial zone".
7. If follow-up context is provided, update existing constraints appropriately.
"""

class OpenRouterPlanner(BasePlanner):
    @property
    def api_key(self) -> str:
        return settings.OPENROUTER_API_KEY

    @property
    def model(self) -> str:
        return settings.OPENROUTER_MODEL

    @property
    def base_url(self) -> str:
        return settings.OPENROUTER_BASE_URL.rstrip('/')

    @property
    def timeout_s(self) -> int:
        return settings.OPENROUTER_TIMEOUT_S

    @property
    def max_retries(self) -> int:
        return settings.OPENROUTER_MAX_RETRIES

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def plan(self, query: str, previous_plan: Optional[QueryPlan] = None) -> QueryPlan:
        # Check if configured
        if not self.is_configured():
            logger.info("OpenRouter API key not configured. Using deterministic fallback planner.")
            return fallback_planner.plan(query, previous_plan)

        # Build prompt messages
        messages = [
            {"role": "system", "content": OPENROUTER_PLANNER_SYSTEM_PROMPT}
        ]

        if previous_plan:
            messages.append({
                "role": "user",
                "content": f"Previous Plan: {previous_plan.model_dump_json()}\nFollow-up query: {query}"
            })
        else:
            messages.append({
                "role": "user",
                "content": f"Query: {query}"
            })

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://geolens.ai",
            "X-Title": "GeoLens AI"
        }

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.0,
            "response_format": {"type": "json_object"}
        }

        retries = 0
        while retries <= self.max_retries:
            try:
                with httpx.Client(timeout=self.timeout_s) as client:
                    resp = client.post(
                        f"{self.base_url}/chat/completions",
                        headers=headers,
                        json=payload
                    )

                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    parsed = json.loads(content)

                    # Validate with Pydantic
                    plan_obj = QueryPlan(
                        target=parsed.get("target", TargetType.BUILDINGS),
                        relation=parsed.get("relation", SpatialRelation.NONE),
                        reference=parsed.get("reference", ReferenceType.NONE),
                        distance_m=parsed.get("distance_m"),
                        min_area_m2=parsed.get("min_area_m2"),
                        max_area_m2=parsed.get("max_area_m2"),
                        exclude_zone=parsed.get("exclude_zone"),
                        rooftop_type=parsed.get("rooftop_type"),
                        clustering=parsed.get("clustering", False),
                        original_query=query,
                        planner_source="openrouter",
                        model_name=self.model
                    )
                    return plan_obj
                else:
                    logger.warning(f"OpenRouter returned status {resp.status_code}: {resp.text}")
                    retries += 1
            except Exception as e:
                logger.warning(f"OpenRouter attempt {retries + 1} failed: {e}")
                retries += 1

        logger.info("OpenRouter planner failed or timed out. Falling back to deterministic planner.")
        fb_plan = fallback_planner.plan(query, previous_plan)
        fb_plan.planner_source = "rule_fallback (openrouter_unreachable)"
        return fb_plan

openrouter_planner = OpenRouterPlanner()
