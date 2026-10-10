from abc import ABC, abstractmethod
from typing import Optional
from backend.app.schemas import QueryPlan

class BasePlanner(ABC):
    @abstractmethod
    def plan(self, query: str, previous_plan: Optional[QueryPlan] = None) -> QueryPlan:
        """Parse natural language query into a validated QueryPlan."""
        pass
