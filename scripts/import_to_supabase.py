"""
Import ExamAce questions from built JSON files into Supabase.

Prerequisites:
  1. Run build_questions.py first to generate data/ files.
  2. Install: pip install -r scripts/requirements.txt
  3. Set environment variables (or use .env in project root):
       SUPABASE_URL=https://your-ref.supabase.co
       SUPABASE_SERVICE_KEY=your-service-role-key

Usage:
  python scripts/import_to_supabase.py
  python scripts/import_to_supabase.py --clear   # wipe tables first
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

BATCH = 200


def get_client():
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_KEY", "").strip()
    if not url or not key:
        sys.exit(
            "Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.\n"
            "See .env.example for reference."
        )
    try:
        from supabase import create_client
    except ImportError:
        sys.exit("Error: run `pip install supabase` first.")
    return create_client(url, key)


def upsert_chapters(sb, manifest: dict) -> None:
    rows: list[dict] = []
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


def insert_chapter_questions(sb, path: Path) -> int:
    data = json.loads(path.read_text(encoding="utf-8"))
    meta = data.get("meta", {})
    rows: list[dict] = []
    for q in data.get("questions", []):
        rows.append({
            "language":      meta.get("language", ""),
            "standard":      meta.get("standard", ""),
            "subject":       meta.get("subject", ""),
            "chapter_id":    meta.get("chapterId", ""),
            "chapter_label": meta.get("chapter", ""),
            "topic":         q.get("topic", meta.get("chapter", "")),
            "question":      q.get("question", ""),
            "options":       q.get("options", []),
            "correct":       q.get("correct", 0),
            "explanation":   q.get("explanation", ""),
        })
    for i in range(0, len(rows), BATCH):
        sb.table("questions").insert(rows[i:i + BATCH]).execute()
    return len(rows)


def main() -> int:
    clear = "--clear" in sys.argv
    sb = get_client()

    manifest_path = DATA / "manifest.json"
    if not manifest_path.exists():
        print(
            f"manifest.json not found at {manifest_path}.\n"
            "Run `python scripts/build_questions.py` first.",
            file=sys.stderr,
        )
        return 1

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    if clear:
        print("Clearing existing data…")
        sb.table("questions").delete().gt("created_at", "2000-01-01").execute()
        sb.table("chapters").delete().neq("chapter_id", "").execute()

    print("Upserting chapter catalog…")
    upsert_chapters(sb, manifest)

    print("Importing questions…")
    total = 0
    for lang in manifest.get("languages", []):
        for std in lang.get("standards", []):
            for subj in std.get("subjects", []):
                for ch in subj.get("chapters", []):
                    p = DATA / lang["label"] / std["id"] / subj["label"] / f"{ch['id']}.json"
                    if p.exists():
                        n = insert_chapter_questions(sb, p)
                        total += n
                        print(f"  {lang['label']}/{std['id']}/{subj['label']}/{ch['id']}: {n} questions")
                    else:
                        print(f"  WARNING: {p} not found — skipping")

    print(f"\nDone. {total} questions imported.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
