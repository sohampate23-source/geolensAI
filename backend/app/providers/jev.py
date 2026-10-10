import logging
from typing import List, Optional, Dict, Any, Tuple
import pandas as pd
from backend.app.schemas import RankedCandidate
from backend.app.ranking.scorer import local_scorer
from backend.app.config import settings

logger = logging.getLogger(__name__)

class JevAIAdapter:
    """
    Adapter for Jev AI candidate ranking.
    Maintains strict provider separation per Section 12:
    Only activates when verified endpoint, model, and API key are configured and verified.
    Always falls back gracefully to local deterministic scorer.
    """
    def __init__(self):
        self.api_key = settings.JEV_API_KEY
        self.endpoint = settings.JEV_API_ENDPOINT
        self.model = settings.JEV_MODEL
        self.enabled = settings.JEV_ENABLED

    def is_configured_and_enabled(self) -> bool:
        return bool(self.enabled and self.api_key and self.endpoint)

    def rank_candidates(
        self,
        features_df: pd.DataFrame,
        custom_weights: Optional[Dict[str, float]] = None
    ) -> Tuple[List[RankedCandidate], str, str]:
        """
        Returns (ranked_candidates, provider_name, status_message)
        """
        if not self.is_configured_and_enabled():
            # Truthful local scoring fallback
            ranked = local_scorer.score_candidates(features_df, custom_weights)
            return ranked, "local_deterministic_scorer", "Local deterministic scorer active (Jev AI unconfigured or disabled)"

        # If live Jev AI configuration was provided, call verified contract:
        try:
            # Here we would call the verified Jev API endpoint.
            # As documented in spec, if official endpoint contract is pending, fallback locally.
            ranked = local_scorer.score_candidates(features_df, custom_weights)
            return ranked, "local_deterministic_scorer", "Jev endpoint awaiting verified contract verification; used local scorer"
        except Exception as e:
            logger.warning(f"Jev AI invocation failed: {e}")
            ranked = local_scorer.score_candidates(features_df, custom_weights)
            return ranked, "local_deterministic_scorer", f"Jev error: {e}; used local scorer"

jev_adapter = JevAIAdapter()
