from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from backend.app.services.vector_service import calculate_match_score

router = APIRouter()

class VectorScoreRequest(BaseModel):
    user_global_vector: List[float] = Field(..., description="User's global embedding vector")
    user_skill_vector: List[float] = Field(..., description="User's skill embedding vector")
    job_global_vector: List[float] = Field(..., description="Job's global embedding vector")
    job_skill_vector: List[float] = Field(..., description="Job's skill embedding vector")
    skill_weight: float = Field(0.6, description="Weight for skill similarity (default 0.6)")
    global_weight: float = Field(0.4, description="Weight for global similarity (default 0.4)")

@router.post("/calculate-score", tags=["Vector Operations"], summary="Calculate Match Score")
async def calculate_score(request: VectorScoreRequest):

    # Calculate the match score between a user and a job based on their vectors.

    try:
        user_vectors = {
            "global_vector": request.user_global_vector,
            "skill_vector": request.user_skill_vector
        }
        
        job_data = {
            "jd_global_vector": request.job_global_vector,
            "jd_skill_vector": request.job_skill_vector
        }
        
        score = calculate_match_score(
            user_vectors, 
            job_data, 
            skill_weight=request.skill_weight, 
            global_weight=request.global_weight
        )
        
        return {
            "match_percentage": score,
            "configuration": {
                "skill_weight": request.skill_weight,
                "global_weight": request.global_weight
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
