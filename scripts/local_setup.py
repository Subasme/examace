"""
One-shot local setup: runs migrations + imports all questions into Supabase.

Run this from YOUR OWN MACHINE (not a server):
  pip install supabase
  python scripts/local_setup.py

It will prompt for your Supabase URL and service_role key if not set.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
MIGRATIONS = ROOT / "supabase" / "migrations"

BATCH = 200


def ask(prompt: str, env_var: str) -> str:
    val = os.environ.get(env_var, "").strip()
    if val:
        return val
    val = input(f"{prompt}: ").strip()
    if not val:
        sys.exit(f"Error: {env_var} is required.")
    return val


def esc(s: str) -> str:
    return str(s).replace("'", "''")


def run_sql(sb, sql: str) -> None:
    """Execute raw SQL via Supabase REST using postgres_changes or rpc."""
    # Use urllib since we may not have extra deps
    import urllib.request, urllib.error
    url = sb.supabase_url + "/rest/v1/rpc/exec_sql"
    payload = json.dumps({"sql": sql}).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "apikey": sb.supabase_key,
            "Authorization": f"Bearer {sb.supabase_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        if "does not exist" in body and "exec_sql" in body:
            raise RuntimeError(
                "exec_sql RPC not found — please run migration SQL manually in the SQL editor."
            )
        raise RuntimeError(f"HTTP {e.code}: {body[:300]}")


def upsert_chapters(sb, manifest: dict) -> None:
    rows = []
    for lang in manifest.get("languages", []):
        for std in lang.get("standards", []):
            for subj in std.get("subjects", []):
                for ch in subj.get("chapters", []):
                    rows.append({
                        "language":      lang["label"],
                        "standard":      std["id"],
                        "subject":       subj["label"],
                        "chapter_id":    ch["id"],
                        "chapter_label": ch["label"],
                        "question_count": ch.get("count", 0),
                    })
    for i in range(0, len(rows), BATCH):
        sb.table("chapters").upsert(
            rows[i:i + BATCH],
            on_conflict="language,standard,subject,chapter_id"
        ).execute()
    print(f"  Upserted {len(rows)} chapter catalog rows.")


def insert_questions(sb, manifest: dict) -> int:
    total = 0
    for lang in manifest.get("languages", []):
        for std in lang.get("standards", []):
            for subj in std.get("subjects", []):
                for ch in subj.get("chapters", []):
                    p = DATA / lang["label"] / std["id"] / subj["label"] / f"{ch['id']}.json"
                    if not p.exists():
                        print(f"  WARNING: {p.name} not found — skipping")
                        continue
                    data = json.loads(p.read_text(encoding="utf-8"))
                    meta = data.get("meta", {})
                    rows = []
                    for q in data.get("questions", []):
                        rows.append({
                            "language":      meta.get("language", ""),
                            "standard":      meta.get("standard", ""),
                            "subject":       meta.get("subject", ""),
                            "chapter_id":    meta.get("chapterId", ""),
                            "chapter_label": meta.get("chapter", ""),
                            "topic":         q.get("topic", ""),
                            "question":      q.get("question", ""),
                            "options":       q.get("options", []),
                            "correct":       q.get("correct", 0),
                            "explanation":   q.get("explanation", ""),
                        })
                    for i in range(0, len(rows), BATCH):
                        sb.table("questions").insert(rows[i:i + BATCH]).execute()
                    total += len(rows)
                    print(f"  {lang['label']}/{ch['id']}: {len(rows)} questions")
    return total


def main() -> int:
    try:
        from supabase import create_client
    except ImportError:
        print("Install the supabase library first:  pip install supabase")
        return 1

    url = ask("Supabase URL (https://xxx.supabase.co)", "SUPABASE_URL")
    key = ask("Service role key (eyJ... or sb_secret_...)", "SUPABASE_SERVICE_KEY")

    sb = create_client(url, key)

    manifest_path = DATA / "manifest.json"
    if not manifest_path.exists():
        print(f"manifest.json not found at {manifest_path}.\nRun build_questions.py first.")
        return 1
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    print("\n1. Running migrations…")
    for mf in sorted(MIGRATIONS.glob("*.sql")):
        sql = mf.read_text(encoding="utf-8")
        print(f"   {mf.name}…", end=" ")
        try:
            run_sql(sb, sql)
            print("OK")
        except RuntimeError as e:
            print(f"SKIPPED ({e})")
            print(f"   → Please run {mf.name} manually in the Supabase SQL Editor.")

    print("\n2. Clearing existing questions…")
    try:
        sb.table("questions").delete().gt("created_at", "2000-01-01").execute()
        sb.table("chapters").delete().neq("chapter_id", "").execute()
    except Exception as e:
        print(f"   Could not clear (tables may not exist yet): {e}")

    print("\n3. Upserting chapter catalog…")
    upsert_chapters(sb, manifest)

    print("\n4. Importing questions…")
    total = insert_questions(sb, manifest)

    print(f"\nDone! {total} questions imported.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
