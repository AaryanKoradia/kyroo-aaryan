import os
import sys

os.environ.setdefault("SUPABASE_URL", "https://fake.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "fake-key")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
