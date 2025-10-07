"""
Database connection utilities for Supabase
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def get_supabase() -> Client:
    """
    Create and return authenticated Supabase client.

    Returns:
        Supabase client instance

    Raises:
        ValueError: If environment variables are missing
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")

    if not url or not key:
        raise ValueError(
            "Missing Supabase credentials. "
            "Ensure SUPABASE_URL and SUPABASE_KEY are set in .env file"
        )

    return create_client(url, key)


def test_connection() -> bool:
    """
    Test Supabase connection.

    Returns:
        True if connection successful, False otherwise
    """
    try:
        client = get_supabase()
        # Try a simple query to verify connection
        result = client.table('jotform_signups').select('id').limit(1).execute()
        print("✅ Supabase connection successful")
        return True
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        return False


if __name__ == "__main__":
    # Test connection when run directly
    test_connection()
