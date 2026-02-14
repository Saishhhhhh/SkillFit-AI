from typing import List, Optional
from pydantic import BaseModel, Field

class RoleSuggestion(BaseModel):
    title: str = Field(description="The job title for the suggested role")
    reason: str = Field(description="Why this role fits the user's background")
    skills: List[str] = Field(description="Key skills required for this role")

class RoleSuggestionsResponse(BaseModel):
    roles: List[RoleSuggestion]

class RoadmapMonth(BaseModel):
    month: int = Field(description="Month number (1, 2, or 3)")
    focus_topic: str = Field(description="Main theme for the month")
    skills_to_learn: List[str] = Field(description="Specific technical skills to master")
    resources: List[str] = Field(description="Suggested learning resources (courses, docs)")
    project_idea: str = Field(description="Small project to practice these skills")

class RoadmapProject(BaseModel):
    title: str = Field(description="Name of the portfolio project")
    description: str = Field(description="Detailed description of the project")
    tech_stack: List[str] = Field(description="Technologies used in the project")
    recruiter_hook: str = Field(description="What makes this project stand out to recruiters")

class LearningRoadmapResponse(BaseModel):
    monthly_plan: List[RoadmapMonth]
    portfolio_projects: List[RoadmapProject]

class PivotOption(BaseModel):
    role: str = Field(description="Target adjacent role")
    overlap_percentage: int = Field(description="Estimated skill overlap percentage")
    bridge_skills: List[str] = Field(description="Top 2-3 skills needed to transition")
    salary_potential: str = Field(description="Estimated salary range or comparison")

class CareerPivotResponse(BaseModel):
    pivots: List[PivotOption]
