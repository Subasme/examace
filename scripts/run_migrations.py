"""
Run Supabase schema migrations via the Management API.

Requires:
  SUPABASE_URL=https://your-ref.supabase.co
  SUPABASE_SERVICE_KEY=eyJ...  (service_role JWT)
  SUPABASE_ACCESS_TOKEN=sbp_...  (optional — personal access token for DDL)

If SUPABASE_ACCESS_TOKEN is not set, falls back to printing instructions.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import urllib.request
import urllib.error
import json

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "supabase" / "migrations"

def run_sql_via_management_api(ref: str, token: str, sql: str) -> bool:
    url = f"https://api.supabase.com/v1/projects/{ref}/database/query"
    payload = json.dumps({"query": sql}).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"  OK ({resp.status})")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  Error {e.code}: {body[:200]}")
        return False


def main() -> int:
    supabase_url = os.environ.get("SUPABASE_URL", "").strip()
    access_token = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()

    if not supabase_url:
        print("Error: SUPABASE_URL not set", file=sys.stderr)
        return 1

    ref = supabase_url.replace("https://", "").split(".")[0]

    if not access_token:
        print(
            "\nSUPABASE_ACCESS_TOKEN not set — skipping DDL migrations.\n"
            "If tables do not exist yet, please run these SQL files manually\n"
            "in your Supabase SQL Editor:\n"
            f"  1. supabase/migrations/001_initial_schema.sql\n"
            f"  2. supabase/migrations/002_rls_policies.sql\n"
        )
        return 0

    for path in sorted(MIGRATIONS.glob("*.sql")):
        print(f"Running {path.name}…")
        if not run_sql_via_management_api(ref, access_token, path.read_text(encoding="utf-8")):
            return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
