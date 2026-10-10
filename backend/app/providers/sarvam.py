import logging
from typing import Tuple, Optional
import httpx
from backend.app.config import settings

logger = logging.getLogger(__name__)

class SarvamTranslationAdapter:
    """
    Adapter for Sarvam AI Indian-Language Translation.
    Supports English (en), Hindi (hi), and Marathi (mr).
    Converts queries into English for the spatial planner while preserving geographic terminology.
    """
    def __init__(self):
        self.api_key = settings.SARVAM_API_KEY
        self.endpoint = "https://api.sarvam.ai/translate"
        # Language code mappings for Sarvam
        self.lang_map = {
            "en": "en-IN",
            "hi": "hi-IN",
            "mr": "mr-IN"
        }

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def translate_query(self, query: str, source_lang: str) -> Tuple[str, bool, Optional[str]]:
        """
        Translates query from source_lang to English if needed.
        Returns: (translated_query, is_live_translation, error_or_notice)
        """
        if source_lang == "en" or not source_lang:
            return query, False, None

        if not self.is_configured():
            # Honest fallback when Sarvam API key is not provided
            # For demo purposes with Hindi/Marathi phrases, provide truthful linguistic dictionary fallback
            simple_translations = {
                # Hindi
                "सड़क के पास इमारतें खोजें": "Find buildings near roads",
                "सड़क से 100 मीटर के भीतर इमारतें": "buildings within 100 metres of roads",
                "कम से कम 500 वर्ग मीटर की इमारतें": "buildings at least 500 square metres",
                "बड़ी छत वाली इमारतें": "buildings with large rooftops",
                "सड़क से 50 मीटर से अधिक दूर इमारतें": "buildings more than 50 metres from road",
                # Marathi
                "रस्त्यांजवळील इमारती शोधा": "Find buildings near roads",
                "रस्त्यापासून 100 मीटरच्या अंतरावरील इमारती": "buildings within 100 metres of roads",
                "किमान 500 चौरस मीटरच्या इमारती": "buildings at least 500 square metres",
                "मोठ्या छताच्या इमारती": "buildings with large rooftops",
            }

            cleaned = query.strip()
            if cleaned in simple_translations:
                return simple_translations[cleaned], False, "Sarvam unconfigured: deterministic language lookup used"

            return query, False, "Sarvam AI unconfigured: passing query through as-is"

        try:
            source_code = self.lang_map.get(source_lang, "hi-IN")
            headers = {
                "api-subscription-key": self.api_key,
                "Content-Type": "application/json"
            }
            payload = {
                "input": query,
                "source_language_code": source_code,
                "target_language_code": "en-IN",
                "speaker_gender": "Female",
                "mode": "formal",
                "model": "mayura:v1"
            }

            with httpx.Client(timeout=10.0) as client:
                resp = client.post(self.endpoint, headers=headers, json=payload)

            if resp.status_code == 200:
                data = resp.json()
                translated = data.get("translated_text", query)
                return translated, True, None
            else:
                logger.warning(f"Sarvam translation failed with {resp.status_code}: {resp.text}")
                return query, False, f"Sarvam error HTTP {resp.status_code}"
        except Exception as e:
            logger.warning(f"Sarvam translation error: {e}")
            return query, False, f"Sarvam connection error: {str(e)}"

sarvam_adapter = SarvamTranslationAdapter()
