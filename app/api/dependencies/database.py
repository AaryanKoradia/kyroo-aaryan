from collections.abc import Generator
from app.database.supabase_client import get_supabase


def get_db() -> Generator:
    """Yields Supabase client instead of SQLAlchemy session."""
    yield get_supabase()