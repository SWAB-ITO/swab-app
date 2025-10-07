#!/usr/bin/env python3
"""
Explore Jotform API to understand data structure.
This helps us map form fields to database columns before building sync logic.
"""
import os
import sys
import json
from dotenv import load_dotenv
from rich.console import Console
from rich.json import JSON
from rich.panel import Panel
from rich.table import Table

# Add jotform API path
jotform_path = os.path.join(os.path.dirname(__file__), '..', '..', 'Jotform_API', 'jotform-api-python')
sys.path.insert(0, jotform_path)

from jotform import JotformAPIClient

load_dotenv()
console = Console()


def explore_form(form_id: str, form_name: str, limit: int = 3):
    """
    Explore a Jotform form's structure and sample submissions.

    Args:
        form_id: The Jotform form ID
        form_name: Display name for the form
        limit: Number of sample submissions to fetch
    """
    console.print(f"\n[bold cyan]📋 Exploring: {form_name}[/bold cyan]")
    console.print(f"[dim]Form ID: {form_id}[/dim]\n")

    api_key = os.getenv("JOTFORM_API_KEY")
    if not api_key:
        console.print("[red]❌ JOTFORM_API_KEY not set in .env[/red]")
        return

    try:
        client = JotformAPIClient(api_key)

        # Get form info
        console.print("[yellow]Fetching form info...[/yellow]")
        form_info = client.get_form(form_id)
        console.print(f"  Form title: {form_info.get('title')}")
        console.print(f"  Created: {form_info.get('created_at')}")
        console.print(f"  Total submissions: {form_info.get('count')}\n")

        # Get form questions to understand field structure
        console.print("[yellow]Fetching form questions...[/yellow]")
        questions = client.get_form_questions(form_id)

        # Create table of questions
        q_table = Table(title="Form Fields")
        q_table.add_column("Field ID", style="cyan")
        q_table.add_column("Name", style="green")
        q_table.add_column("Type", style="yellow")
        q_table.add_column("Text", style="white")

        for qid, question in questions.items():
            q_table.add_row(
                qid,
                question.get('name', 'N/A'),
                question.get('type', 'N/A'),
                question.get('text', 'N/A')[:50]  # Truncate long text
            )

        console.print(q_table)
        console.print()

        # Get sample submissions
        console.print(f"[yellow]Fetching {limit} sample submissions...[/yellow]")
        submissions = client.get_form_submissions(form_id, offset=0, limit=limit)

        if not submissions:
            console.print("[red]No submissions found[/red]\n")
            return

        # Display each submission
        for i, submission in enumerate(submissions, 1):
            console.print(f"\n[bold]Sample Submission {i}:[/bold]")
            console.print(f"  Submission ID: {submission.get('id')}")
            console.print(f"  Submitted at: {submission.get('created_at')}")

            # Extract key answers
            answers = submission.get('answers', {})
            extracted = {}

            for field_id, answer_data in answers.items():
                field_name = answer_data.get('name', f'field_{field_id}')
                answer = answer_data.get('answer', '')

                # Handle different answer types
                if isinstance(answer, dict):
                    # Multi-part fields (name, address, etc.)
                    extracted[field_name] = answer
                else:
                    # Simple text fields
                    extracted[field_name] = answer

            # Display as formatted JSON
            console.print(Panel(
                JSON(json.dumps(extracted, indent=2)),
                title="Extracted Answers",
                border_style="blue"
            ))

        console.print()

    except Exception as e:
        console.print(f"[red]❌ Error: {e}[/red]")


def main():
    """Explore both Jotform forms"""
    console.print("\n[bold]🔍 Jotform API Explorer[/bold]")
    console.print("[dim]This will help us understand the data structure before building sync logic[/dim]")

    signup_form_id = os.getenv("JOTFORM_SIGNUP_FORM_ID", "250685983663169")
    setup_form_id = os.getenv("JOTFORM_SETUP_FORM_ID", "250754977634066")

    # Explore signup form
    explore_form(signup_form_id, "Mentor Signup Form", limit=2)

    # Explore setup form
    explore_form(setup_form_id, "Givebutter Setup Form", limit=2)

    console.print("\n[bold green]✅ Exploration complete![/bold green]")
    console.print("[dim]Review the output above to understand field names and data structures.[/dim]")
    console.print("[dim]This will inform how we map fields to the database schema.[/dim]\n")


if __name__ == "__main__":
    main()
