import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Load .env if present
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

class Settings:
    PROJECT_NAME: str = "GeoLens AI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"

    # OpenRouter LLM Configuration
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free")
    OPENROUTER_BASE_URL: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    OPENROUTER_TIMEOUT_S: int = int(os.getenv("OPENROUTER_TIMEOUT_S", "30"))
    OPENROUTER_MAX_RETRIES: int = int(os.getenv("OPENROUTER_MAX_RETRIES", "2"))
    OPENROUTER_RUN_LIVE_TESTS: bool = os.getenv("OPENROUTER_RUN_LIVE_TESTS", "false").lower() == "true"

    # Sarvam AI Translation
    SARVAM_API_KEY: str = os.getenv("SARVAM_API_KEY", "")

    # Jev AI Ranking
    JEV_API_KEY: str = os.getenv("JEV_API_KEY", "")
    JEV_API_ENDPOINT: str = os.getenv("JEV_API_ENDPOINT", "")
    JEV_MODEL: str = os.getenv("JEV_MODEL", "")
    JEV_ENABLED: bool = os.getenv("JEV_ENABLED", "false").lower() == "true"

    # SkyCLIP Vision Weights
    SKYCLIP_WEIGHTS: str = os.getenv("SKYCLIP_WEIGHTS", "data/embeddings/skyclip_weights.pt")

    # Features & Toggles
    FEATURE_NEGATE: bool = os.getenv("FEATURE_NEGATE", "true").lower() == "true"
    FEATURE_MIN_AREA: bool = os.getenv("FEATURE_MIN_AREA", "true").lower() == "true"
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "true").lower() == "true"
    FEATURE_DETECTION_CACHE: bool = os.getenv("FEATURE_DETECTION_CACHE", "false").lower() == "true"

    # Data paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    FIXTURES_DIR: Path = DATA_DIR / "fixtures"

settings = Settings()
