#!/usr/bin/env python3
"""
Explore Givebutter API to understand data structure.
This helps us understand response formats before building sync logic.
"""
import os
import json
from dotenv import load_dotenv
from rich.console import Console
from rich.json import JSON
from rich.panel import Panel
from rich.table import Table
import requests

load_dotenv()
console = Console()


def explore_campaign(campaign_id: str):
    """
    Explore a Givebutter campaign.

    Args:
        campaign_id: The Givebutter campaign ID
    """
    console.print(f"\n[bold cyan]📊 Exploring Campaign: {campaign_id}[/bold cyan]\n")

    api_key = os.getenv("GIVEBUTTER_API_KEY")
    if not api_key:
        console.print("[red]❌ GIVEBUTTER_API_KEY not set in .env[/red]")
        return

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    try:
        # Get campaign info
        console.print("[yellow]Fetching campaign details...[/yellow]")
        response = requests.get(
            f"https://api.givebutter.com/v1/campaigns/{campaign_id}",
            headers=headers
        )

        if response.status_code == 200:
            campaign = response.json()['data']
            console.print(f"  Title: {campaign.get('title')}")
            console.print(f"  Type: {campaign.get('type')}")
            console.print(f"  Goal: ${campaign.get('goal', 0):,.2f}")
            console.print(f"  Raised: ${campaign.get('raised', 0):,.2f}")
            console.print(f"  Donors: {campaign.get('donors')}")
            console.print()
        else:
            console.print(f"[red]❌ Error fetching campaign: {response.status_code}[/red]")
            console.print(f"[dim]{response.text}[/dim]\n")
            return

        # Get campaign members
        console.print("[yellow]Fetching campaign members (first page - 20 max)...[/yellow]")
        response = requests.get(
            f"https://api.givebutter.com/v1/campaigns/{campaign_id}/members",
            headers=headers,
            params={"per_page": 20}
        )

        if response.status_code == 200:
            data = response.json()
            members = data['data']
            meta = data['meta']

            console.print(f"  Total members: {meta.get('total')}")
            console.print(f"  Page {meta.get('current_page')} of {meta.get('last_page')}")
            console.print()

            if members:
                # Show first few members in table
                member_table = Table(title="Sample Campaign Members")
                member_table.add_column("ID", style="cyan")
                member_table.add_column("Name", style="green")
                member_table.add_column("Email", style="yellow")
                member_table.add_column("Goal", style="white")
                member_table.add_column("Raised", style="white")
                member_table.add_column("Donors", style="white")

                for member in members[:5]:
                    member_table.add_row(
                        str(member.get('id')),
                        f"{member.get('first_name', '')} {member.get('last_name', '')}",
                        member.get('email', 'N/A'),
                        f"${member.get('goal', 0):,.0f}",
                        f"${member.get('raised', 0):,.0f}",
                        str(member.get('donors', 0))
                    )

                console.print(member_table)
                console.print()

                # Show full structure of first member
                console.print("[bold]Full Structure of First Member:[/bold]")
                console.print(Panel(
                    JSON(json.dumps(members[0], indent=2)),
                    title="Member Object Structure",
                    border_style="blue"
                ))
                console.print()
            else:
                console.print("[yellow]No members found[/yellow]\n")

        else:
            console.print(f"[red]❌ Error fetching members: {response.status_code}[/red]")
            console.print(f"[dim]{response.text}[/dim]\n")

        # Get campaign teams
        console.print("[yellow]Fetching campaign teams...[/yellow]")
        response = requests.get(
            f"https://api.givebutter.com/v1/campaigns/{campaign_id}/teams",
            headers=headers
        )

        if response.status_code == 200:
            data = response.json()
            teams = data['data']

            if teams:
                team_table = Table(title="Campaign Teams")
                team_table.add_column("ID", style="cyan")
                team_table.add_column("Name", style="green")
                team_table.add_column("Members", style="yellow")
                team_table.add_column("Raised", style="white")

                for team in teams:
                    team_table.add_row(
                        str(team.get('id')),
                        team.get('name', 'N/A'),
                        str(team.get('members', 0)),
                        f"${team.get('raised', 0):,.0f}"
                    )

                console.print(team_table)
                console.print()
            else:
                console.print("[yellow]No teams found[/yellow]\n")

        else:
            console.print(f"[red]❌ Error fetching teams: {response.status_code}[/red]")

    except Exception as e:
        console.print(f"[red]❌ Error: {e}[/red]")


def explore_contacts(limit: int = 5):
    """
    Explore Givebutter contacts to understand structure.

    Args:
        limit: Number of sample contacts to fetch
    """
    console.print(f"\n[bold cyan]👥 Exploring Contacts (first {limit})[/bold cyan]\n")

    api_key = os.getenv("GIVEBUTTER_API_KEY")
    if not api_key:
        console.print("[red]❌ GIVEBUTTER_API_KEY not set in .env[/red]")
        return

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    try:
        console.print("[yellow]Fetching contacts (this may take a moment)...[/yellow]")
        response = requests.get(
            "https://api.givebutter.com/v1/contacts",
            headers=headers,
            params={"per_page": limit}
        )

        if response.status_code == 200:
            data = response.json()
            contacts = data['data']
            meta = data['meta']

            console.print(f"  Total contacts: {meta.get('total')}")
            console.print(f"  Showing {len(contacts)} of {meta.get('total')}")
            console.print()

            if contacts:
                # Show first contact's full structure
                console.print("[bold]Full Structure of First Contact:[/bold]")
                console.print(Panel(
                    JSON(json.dumps(contacts[0], indent=2)),
                    title="Contact Object Structure",
                    border_style="blue"
                ))
                console.print()

                # Note about custom fields
                console.print("[bold yellow]📝 Note about Custom Fields:[/bold yellow]")
                console.print("[dim]Custom fields can be used to store:[/dim]")
                console.print("[dim]  - text_instructions (for text messaging)[/dim]")
                console.print("[dim]  - status_category (mentor status)[/dim]")
                console.print("[dim]  - Any other computed data from our database[/dim]\n")
            else:
                console.print("[yellow]No contacts found[/yellow]\n")

        else:
            console.print(f"[red]❌ Error fetching contacts: {response.status_code}[/red]")
            console.print(f"[dim]{response.text}[/dim]\n")

    except Exception as e:
        console.print(f"[red]❌ Error: {e}[/red]")


def main():
    """Explore Givebutter API"""
    console.print("\n[bold]🔍 Givebutter API Explorer[/bold]")
    console.print("[dim]This will help us understand the data structure before building sync logic[/dim]")

    campaign_id = os.getenv("GIVEBUTTER_CAMPAIGN_ID", "CQVG3W")

    # Explore campaign and members
    explore_campaign(campaign_id)

    # Explore contacts
    explore_contacts(limit=3)

    console.print("\n[bold green]✅ Exploration complete![/bold green]")
    console.print("[dim]Review the output above to understand field names and data structures.[/dim]")
    console.print("[dim]Pay special attention to custom_fields - we'll use these for syncing status back.[/dim]\n")


if __name__ == "__main__":
    main()
