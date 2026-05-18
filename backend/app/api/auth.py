from supabase import Client
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from backend.app.db.supabase_client import get_client

security = HTTPBearer()

async def get_current_user(token=Depends(security), sb: Client = Depends(get_client)):
    # verifies the supabase jwt token.
    # used as a fastapi dependency on all protected routes to ensure the user is logged in.
    try:
        # ask supabase to verify the token and return the user details
        user_response = sb.auth.get_user(token.credentials)
        return user_response.user
    except Exception as e:
        print(f"auth error: {e}")
        raise HTTPException(status_code=401, detail="invalid or expired token")
