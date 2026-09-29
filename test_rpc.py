import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
supabase = create_client(url, key)

try:
    dummy_vec = [0.0] * 2048
    res = supabase.rpc("match_artifacts_image", {"query_embedding": dummy_vec, "match_threshold": 0.5, "match_count": 1}).execute()
    print("RPC Success:", res.data)
except Exception as e:
    print("RPC Failed:", e)
