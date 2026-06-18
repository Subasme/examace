"""
Import ExamAce questions from built JSON files into Supabase.

Prerequisites:
  1. Run build_questions.py first to generate data/ files.
  2. Install: pip install -r scripts/requirements.txt
  3. Set environment variables (or use .env in project root):
       SUPABASE_URL=https://your-ref.supabase.co
       SUPABASE_SERVICE_KEY=your-service-role-key

Usage:
  python scripts/import_to_supabase.py                          # upsert all
  python scripts/import_to_supabase.py --clear                  # wipe all tables first
  python scripts/import_to_supabase.py --subjects Chemistry     # upsert only Chemistry
  python scripts/import_to_supabase.py --subjects Chemistry,Biology
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

# Maps used when generating question_tag in Python (must match DB chapters table)
_LANG_CODE = {"English": "EN", "Tamil": "TA"}
_SUBJ_CODE = {"Physics": "PHY", "Chemistry": "CHE", "Biology": "BIO"}


def make_question_tag(language: str, standard: str, subject: str, chapter_id: str, index: int) -> str:
    """Return a deterministic, globally-unique tag like EN12PHYCH01Q0042."""
    lang = _LANG_CODE.get(language, language[:2].upper())
    std  = "".join(c for c in standard if c.isdigit())   # "12th" → "12"
    subj = _SUBJ_CODE.get(subject, subject[:3].upper())
    ch   = int("".join(c for c in chapter_id if c.isdigit()))  # "chapter1" → 1
    return f"{lang}{std}{subj}CH{ch:02d}Q{index:04d}"


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


def upsert_chapters(sb, manifest: dict, target_subjects: set | None = None) -> None:
    rows: list[dict] = []
    for lang in manifest.get("languages", []):
        for std in lang.get("standards", []):
            for subj in std.get("subjects", []):
                if target_subjects and subj["label"] not in target_subjects:
                    continue
                for ch in subj.get("chapters", []):
                    rows.append({
                        "language":       lang["label"],
                        "standard":       std["id"],
                        "subject":        subj["label"],
                        "chapter_id":     ch["id"],
                        "chapter_label":  ch["label"],
                        "question_count": ch.get("count", 0),
                    })
    for i in range(0, len(rows), BATCH):
        sb.table("chapters").upsert(
            rows[i:i + BATCH],
            on_conflict="language,standard,subject,chapter_id"
        ).execute()
    print(f"  Upserted {len(rows)} chapter catalog rows.")


def upsert_chapter_questions(sb, path: Path) -> int:
    """Upsert questions using question_tag as the conflict key.

    Because question_tag is stable across re-imports, existing rows are
    updated in place (same UUID), so question_responses / wrong_answer_tracker
    FK references are never broken.
    """
    data = json.loads(path.read_text(encoding="utf-8"))
    meta = data.get("meta", {})
    rows: list[dict] = []
    for idx, q in enumerate(data.get("questions", []), start=1):
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
            "question_tag":  make_question_tag(
                meta.get("language", ""),
                meta.get("standard", ""),
                meta.get("subject", ""),
                meta.get("chapterId", ""),
                idx,
            ),
        })
    for i in range(0, len(rows), BATCH):
        sb.table("questions").upsert(
            rows[i:i + BATCH],
            on_conflict="question_tag",
        ).execute()
    return len(rows)


def main() -> int:
    args = sys.argv[1:]
    clear = "--clear" in args

    # Parse --subjects flag: --subjects Chemistry  or  --subjects Chemistry,Biology
    target_subjects: set | None = None
    for arg in args:
        if arg.startswith("--subjects="):
            target_subjects = {s.strip() for s in arg.split("=", 1)[1].split(",")}
        elif arg == "--subjects" and args.index(arg) + 1 < len(args):
            target_subjects = {s.strip() for s in args[args.index(arg) + 1].split(",")}

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
        print("Clearing ALL existing data…")
        # Delete FK-referencing tables first to avoid constraint violations
        try:
            sb.table("question_responses").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        except Exception as e:
            if "42501" in str(e) or "permission denied" in str(e).lower():
                print("  WARNING: service_role lacks permission on question_responses — skipping.")
                print("  Run in Supabase SQL editor: GRANT SELECT, DELETE ON public.question_responses TO service_role;")
            else:
                raise
        try:
            sb.table("wrong_answer_tracker").delete().neq("user_id", "00000000-0000-0000-0000-000000000000").execute()
        except Exception as e:
            if "42501" in str(e) or "permission denied" in str(e).lower():
                print("  WARNING: service_role lacks permission on wrong_answer_tracker — skipping.")
            else:
                raise
        sb.table("questions").delete().gt("created_at", "2000-01-01").execute()
        sb.table("chapters").delete().neq("chapter_id", "").execute()
    elif target_subjects:
        # With question_tag as a unique key, re-importing a subject UPSERTs
        # questions in place (same UUID) — no deletion required, so existing
        # question_responses/wrong_answer_tracker rows remain valid.
        print(f"Upserting questions for subjects: {', '.join(sorted(target_subjects))}…")

    print("Upserting chapter catalog…")
    upsert_chapters(sb, manifest, target_subjects)

    print("Importing questions…")
    total = 0
    for lang in manifest.get("languages", []):
        for std in lang.get("standards", []):
            for subj in std.get("subjects", []):
                if target_subjects and subj["label"] not in target_subjects:
                    continue
                for ch in subj.get("chapters", []):
                    p = DATA / lang["label"] / std["id"] / subj["label"] / f"{ch['id']}.json"
                    if p.exists():
                        n = upsert_chapter_questions(sb, p)
                        total += n
                        print(f"  {lang['label']}/{std['id']}/{subj['label']}/{ch['id']}: {n} questions")
                    else:
                        print(f"  WARNING: {p} not found — skipping")

    print(f"\nDone. {total} questions imported.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
