from supabase import create_client, Client
import os

def get_supabase() -> Client:
    # grab our supabase project details from the environment variables
    # if they aren't there, we use placeholders so the app doesn't crash during local ui testing
    url = os.environ.get("SUPABASE_URL", "https://placeholder.supabase.co")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "placeholder_key")
    return create_client(url, key)

# single instance that we'll reuse across all our api requests
_client: Client = None

def get_client() -> Client:
    global _client
    if _client is None:
        _client = get_supabase()
    return _client
