#!/usr/bin/env python3
"""
Test connections to all APIs (Supabase, Jotform, Givebutter)
"""
import os
import sys
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Add jotform API path
jotform_path = os.path.join(os.path.dirname(__file__), '..', '..', 'Jotform_API', 'jotform-api-python')
sys.path.insert(0, jotform_path)

load_dotenv()
console = Console()


def test_supabase():
    """Test Supabase connection"""
    try:
        from scripts.db import get_supabase
        client = get_supabase()
        # Simple query to verify connection
        client.table('jotform_signups').select('id').limit(1).execute()
        return True, "Connected successfully"
    except Exception as e:
        return False, str(e)


def test_jotform():
    """Test Jotform API connection"""
    try:
        from jotform import JotformAPIClient

        api_key = os.getenv("JOTFORM_API_KEY")
        if not api_key:
            return False, "JOTFORM_API_KEY not set in .env"

        client = JotformAPIClient(api_key)
        user = client.get_user()

        return True, f"Connected as: {user.get('username', 'Unknown')}"
    except Exception as e:
        return False, str(e)


def test_givebutter():
    """Test Givebutter API connection"""
    try:
        import requests

        api_key = os.getenv("GIVEBUTTER_API_KEY")
        if not api_key:
            return False, "GIVEBUTTER_API_KEY not set in .env"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        response = requests.get(
            "https://api.givebutter.com/v1/campaigns",
            headers=headers,
            params={"per_page": 1}
        )

        if response.status_code == 200:
            data = response.json()
            campaign_count = data.get('meta', {}).get('total', 0)
            return True, f"Connected - {campaign_count} campaigns accessible"
        else:
            return False, f"HTTP {response.status_code}: {response.text}"

    except Exception as e:
        return False, str(e)


def main():
    """Run all connection tests"""
    console.print("\n[bold]Testing API Connections...[/bold]\n")

    # Create results table
    table = Table(title="Connection Test Results")
    table.add_column("Service", style="cyan")
    table.add_column("Status", style="white")
    table.add_column("Details", style="yellow")

    # Test each service
    tests = [
        ("Supabase", test_supabase),
        ("Jotform", test_jotform),
        ("Givebutter", test_givebutter)
    ]

    all_passed = True

    for service_name, test_func in tests:
        success, message = test_func()
        status = "✅ Pass" if success else "❌ Fail"
        table.add_row(service_name, status, message)

        if not success:
            all_passed = False

    console.print(table)
    console.print()

    if all_passed:
        console.print("[bold green]✅ All connections successful![/bold green]")
        console.print("[dim]You're ready to start syncing data.[/dim]\n")
    else:
        console.print("[bold red]❌ Some connections failed[/bold red]")
        console.print("[dim]Check your .env file and API credentials.[/dim]\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
