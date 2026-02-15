import logging
import json
from enum import Enum
from typing import List, Dict, Optional, Any
from langchain_groq import ChatGroq

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from backend.app.models.genai import (
    RoleSuggestionsResponse, 
    LearningRoadmapResponse, 
    CareerPivotResponse,
    RoleSuggestion,
    RoadmapMonth,
    RoadmapProject,
    PivotOption,
    ComparisonResponse,
    MatchPatch
)

logger = logging.getLogger(__name__)

class ModelProvider(str, Enum):
    GROQ = "groq"

class GenAIService:
    def __init__(self, api_key: str, provider: ModelProvider):
        self.api_key = api_key
        self.provider = provider
        self.llm = self._init_llm()

    def _init_llm(self):
        try:
            if self.provider == ModelProvider.GROQ:
                return ChatGroq(
                    temperature=0.7,
                    model_name="llama-3.3-70b-versatile",
                    api_key=self.api_key
                )
            else:
                raise ValueError(f"Unsupported provider: {self.provider}")
        except Exception as e:
            logger.error(f"Failed to initialize LLM: {str(e)}")
            raise e

    def suggest_roles(self, resume_text: str, user_query: str) -> RoleSuggestionsResponse:
        parser = PydanticOutputParser(pydantic_object=RoleSuggestionsResponse)
        
        prompt = PromptTemplate(
            template="""
            You are an expert Career Coach AI. Based on the user's resume and their interest description, suggest 3 highly relevant job roles.
            
            RESUME SUMMARY:
            {resume_summary}
            
            USER INTEREST:
            {user_query}
            
            Your goal is to find roles that bridge their current skills with their new interests.
            Provide output strictly in JSON format matching the following structure:
            {format_instructions}
            """,
            input_variables=["resume_summary", "user_query"],
            partial_variables={"format_instructions": parser.get_format_instructions()},
        )
        
        # Truncate resume to avoid token limits if necessary, though 70b handles large context well
        resume_summary = resume_text[:3000] 
        
        try:
            response = self.llm.invoke(prompt.format(resume_summary=resume_summary, user_query=user_query))
            # Handle potential metadata in response object
            content = response.content if hasattr(response, 'content') else str(response)
            return parser.parse(content)
        except Exception as e:
            logger.error(f"Role suggestion failed: {e}")
            # Fallback (optional)
            return RoleSuggestionsResponse(roles=[
                RoleSuggestion(title="Error", reason="Failed to generate roles", skills=[])
            ])

    def generate_roadmap(self, missing_skills: List[str], current_role: str, target_role: str) -> LearningRoadmapResponse:
        parser = PydanticOutputParser(pydantic_object=LearningRoadmapResponse)
        
        prompt = PromptTemplate(
            template="""
            Act as a Senior Technical Mentor. Create a 3-month accelerated learning plan for a {current_role} transitioning to {target_role}.
            
            CRITICAL MISSING SKILLS TO LEARN:
            {missing_skills}
            
            Plan Requirements:
            1. Break down learning into Month 1, 2, and 3.
            2. Focus heavily on bridging the skill gap.
            3. Suggest 2 "Portfolio Killer" projects that use these specific missing skills.
            4. For each project, specify a "Recruiter Hook" (why it gets them hired).
            
            {format_instructions}
            """,
            input_variables=["missing_skills", "current_role", "target_role"],
            partial_variables={"format_instructions": parser.get_format_instructions()},
        )
        
        try:
            response = self.llm.invoke(prompt.format(
                missing_skills=", ".join(missing_skills),
                current_role=current_role,
                target_role=target_role
            ))
            content = response.content if hasattr(response, 'content') else str(response)
            return parser.parse(content)
        except Exception as e:
            logger.error(f"Roadmap generation failed: {e}")
            return LearningRoadmapResponse(monthly_plan=[], portfolio_projects=[])

    def suggest_pivot(self, current_skills: List[str], current_role: str) -> CareerPivotResponse:
        parser = PydanticOutputParser(pydantic_object=CareerPivotResponse)
        
        prompt = PromptTemplate(
            template="""
            You are a Career Strategist. The user is a {current_role} looking for a "Safety Net" or alternative career paths.
            
            CURRENT SKILLS:
            {current_skills}
            
            Task:
            1. Identify 3 adjacent roles that have at least 70% skill overlap with their current profile.
            2. For each role, list the top 2-3 "Bridge Skills" they would need to learn to switch.
            3. Estimate salary potential compared to current market.
            
            {format_instructions}
            """,
            input_variables=["current_skills", "current_role"],
            partial_variables={"format_instructions": parser.get_format_instructions()},
        )
        
        try:
            response = self.llm.invoke(prompt.format(
                current_skills=", ".join(current_skills),
                current_role=current_role
            ))
            content = response.content if hasattr(response, 'content') else str(response)
            return parser.parse(content)
        except Exception as e:
            logger.error(f"Pivot suggestion failed: {e}")
            return CareerPivotResponse(pivots=[])

    def analyze_match_gap(self, resume_text: str, jd_text: str) -> ComparisonResponse:
        parser = PydanticOutputParser(pydantic_object=ComparisonResponse)
        
        prompt = PromptTemplate(
            template="""
            Act as a brutal Hiring Manager and a Top-tier Resume Expert.
            You are analyzing a specific Resume against a specific Job Description.
            
            RESUME:
            {resume_text}
            
            JOB DESCRIPTION:
            {jd_text}
            
            Tasks:
            1. Why It Fits: Provide a concise, high-impact reasoning for why this candidate is a strong match.
            2. Why It Doesn't Fit: Be brutally honest about the gaps—missing technologies, lack of industry-specific context, or seniority misalignment.
            3. Resume Patches: Provide 3-5 specific bullet points that the user should literally copy-paste or adapt into their resume to better align with THIS specific JD.
            4. Confidence Score: A percentage representing how likely this person is to get an interview based strictly on their current resume content.
            
            {format_instructions}
            """,
            input_variables=["resume_text", "jd_text"],
            partial_variables={"format_instructions": parser.get_format_instructions()},
        )
        
        try:
            response = self.llm.invoke(prompt.format(
                resume_text=resume_text[:4000],
                jd_text=jd_text[:4000]
            ))
            content = response.content if hasattr(response, 'content') else str(response)
            return parser.parse(content)
        except Exception as e:
            logger.error(f"Deep-dive analysis failed: {e}")
            return ComparisonResponse(
                why_it_fits="N/A",
                why_it_doesnt_fit="Error analyzing match.",
                resume_patches=[],
                confidence_score=0
            )


