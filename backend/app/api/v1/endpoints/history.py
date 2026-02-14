
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

from backend.app.db.crud import get_all_profiles, get_search_history, get_profile

router = APIRouter()

@router.get("/profiles", summary="Get all user profiles")
async def list_profiles():
    """List all previously uploaded profiles (resumes)."""
    return get_all_profiles()

@router.get("/profiles/{profile_id}/searches", summary="Get searches for a profile")
async def list_profile_searches(profile_id: str):
    """List all job searches performed for a specific profile."""
    # Check if profile exists
    profile = get_profile(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    searches = get_search_history(limit=100, profile_id=profile_id)
    return searches

from backend.app.db.crud import delete_profile, delete_search

@router.delete("/profiles/{profile_id}")
async def remove_profile(profile_id: str):
    """Delete a profile and all its history permanently."""
    delete_profile(profile_id)
    return {"status": "success", "message": "Profile deleted"}

@router.delete("/searches/{search_id}")
async def remove_search(search_id: str):
    """Delete a specific search record permanently."""
    delete_search(search_id)
    return {"status": "success", "message": "Search deleted"}
