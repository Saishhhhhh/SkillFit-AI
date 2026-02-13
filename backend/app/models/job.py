from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class SerpApiConfig(BaseModel):
    api_key: str = Field(..., description="Your SerpAPI Key for Google Jobs search")
    num_jobs: int = Field(10, description="Number of jobs to fetch from Google Jobs (default: 10)")

class SearchRequest(BaseModel):
    query: str = Field(..., description="Job title or keywords (e.g., 'Python Developer')")
    location: str = Field(..., description="Location to search in (e.g., 'Remote', 'San Francisco')")
    portals: List[str] = Field(..., description="List of portals to scrape: ['linkedin', 'indeed', 'glassdoor', 'naukri', 'google']")
    serp_api_config: Optional[SerpApiConfig] = Field(None, description="Configuration for Google Jobs (SerpAPI)")

class Job(BaseModel):
    title: str
    company: str
    location: str
    description: str
    url: str
    portal: str
