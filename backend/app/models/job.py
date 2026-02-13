from pydantic import BaseModel, Field
from typing import List, Optional

class SerpApiConfig(BaseModel):
    api_key: str = Field(..., description="Your SerpAPI Key for Google Jobs search")
    num_jobs: int = Field(10, description="Number of jobs to fetch from Google Jobs (default: 10)")

class UserProfile(BaseModel):
    """User profile data sent after skill confirmation, used for scoring."""
    raw_text: str = Field(..., description="Raw resume text extracted during upload")
    confirmed_skills: List[str] = Field(..., description="Skills confirmed/edited by user")

class UserVectors(BaseModel):
    """Pre-computed user vectors from /embed endpoint."""
    global_vector: List[float] = Field(..., description="384-dim vector from resume text")
    skill_vector: List[float] = Field(..., description="384-dim vector from confirmed skills")

class SearchRequest(BaseModel):
    query: str = Field(..., description="Job title or keywords (e.g., 'Python Developer')")
    location: str = Field(..., description="Location to search in (e.g., 'Remote', 'Bangalore')")
    portals: List[str] = Field(..., description="List of portals: ['linkedin', 'indeed', 'glassdoor', 'naukri', 'google']")
    serp_api_config: Optional[SerpApiConfig] = Field(None, description="Configuration for Google Jobs (SerpAPI)")
    user_vectors: Optional[UserVectors] = Field(None, description="Pre-computed user vectors from /embed endpoint")

class Job(BaseModel):
    title: str
    company: str
    location: str
    description: str
    url: str
    portal: str
