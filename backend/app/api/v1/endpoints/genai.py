from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional

from backend.app.services.genai_service import GenAIService, ModelProvider
from backend.app.models.genai import (
    RoleSuggestionsResponse, 
    LearningRoadmapResponse, 
    CareerPivotResponse,
    RoleSuggestion,
    RoadmapMonth,
    RoadmapProject
)

router = APIRouter()

class RoleSuggestionRequest(BaseModel):
    api_key: str
    provider: str  # "groq"
    resume_text: str
    user_query: str

class RoadmapRequest(BaseModel):
    api_key: str
    provider: str
    current_role: str
    target_role: str
    missing_skills: List[str]

class PivotRequest(BaseModel):
    api_key: str
    provider: str
    current_role: str
    current_skills: List[str]

@router.post("/suggest-roles", response_model=RoleSuggestionsResponse)
async def suggest_roles(request: RoleSuggestionRequest):
    try:
        service = GenAIService(api_key=request.api_key, provider=ModelProvider(request.provider))
        return service.suggest_roles(request.resume_text, request.user_query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/roadmap", response_model=LearningRoadmapResponse)
async def generate_roadmap(request: RoadmapRequest):
    try:
        service = GenAIService(api_key=request.api_key, provider=ModelProvider(request.provider))
        return service.generate_roadmap(request.missing_skills, request.current_role, request.target_role)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pivot", response_model=CareerPivotResponse)
async def suggest_pivots(request: PivotRequest):
    try:
        service = GenAIService(api_key=request.api_key, provider=ModelProvider(request.provider))
        return service.suggest_pivot(request.current_skills, request.current_role)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
