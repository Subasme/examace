"""
Export questions from Supabase to Excel files for review.

Produces one .xlsx file per language × subject combination:
  exports/English_Chemistry.xlsx
  exports/English_Biology.xlsx
  exports/English_Physics.xlsx
  exports/Tamil_Chemistry.xlsx
  exports/Tamil_Biology.xlsx
  exports/Tamil_Physics.xlsx

Each file has columns:
  question_tag | chapter_id | chapter_label | topic |
  question | option_a | option_b | option_c | option_d | correct | explanation

Usage:
  python scripts/export_questions.py
  python scripts/export_questions.py --subjects Chemistry
  python scripts/export_questions.py --subjects Chemistry,Biology
  python scripts/export_questions.py --languages English
  python scripts/export_questions.py --format csv   (exports .csv instead of .xlsx)
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

ROOT    = Path(__file__).resolve().parents[1]
OUTDIR  = ROOT / "exports"
BATCH   = 1000
CORRECT_LABEL = {0: "A", 1: "B", 2: "C", 3: "D"}


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


def fetch_questions(sb, language: str, subject: str) -> list[dict]:
    rows = []
    offset = 0
    while True:
        res = (
            sb.table("questions")
            .select(
                "question_tag,chapter_id,chapter_label,topic,"
                "question,options,correct,explanation"
            )
            .eq("language", language)
            .eq("subject", subject)
            .order("question_tag")
            .range(offset, offset + BATCH - 1)
            .execute()
        )
        batch = res.data or []
        rows.extend(batch)
        if len(batch) < BATCH:
            break
        offset += BATCH
    return rows


def flatten(rows: list[dict]) -> list[dict]:
    flat = []
    for r in rows:
        opts = r.get("options") or []
        flat.append({
            "question_tag":  r.get("question_tag", ""),
            "chapter_id":    r.get("chapter_id", ""),
            "chapter_label": r.get("chapter_label", ""),
            "topic":         r.get("topic", ""),
            "question":      r.get("question", ""),
            "option_a":      opts[0] if len(opts) > 0 else "",
            "option_b":      opts[1] if len(opts) > 1 else "",
            "option_c":      opts[2] if len(opts) > 2 else "",
            "option_d":      opts[3] if len(opts) > 3 else "",
            "correct":       CORRECT_LABEL.get(r.get("correct", 0), "A"),
            "explanation":   r.get("explanation", ""),
        })
    return flat


def main() -> int:
    import pandas as pd

    args = sys.argv[1:]

    # --subjects flag
    subjects = ["Chemistry", "Biology", "Physics"]
    for arg in args:
        if arg.startswith("--subjects="):
            subjects = [s.strip() for s in arg.split("=", 1)[1].split(",")]
        elif arg == "--subjects" and args.index(arg) + 1 < len(args):
            subjects = [s.strip() for s in args[args.index(arg) + 1].split(",")]

    # --languages flag
    languages = ["English", "Tamil"]
    for arg in args:
        if arg.startswith("--languages="):
            languages = [s.strip() for s in arg.split("=", 1)[1].split(",")]
        elif arg == "--languages" and args.index(arg) + 1 < len(args):
            languages = [s.strip() for s in args[args.index(arg) + 1].split(",")]

    # --format flag (xlsx or csv)
    fmt = "xlsx"
    for arg in args:
        if arg.startswith("--format="):
            fmt = arg.split("=", 1)[1].strip().lower()
        elif arg == "--format" and args.index(arg) + 1 < len(args):
            fmt = args[args.index(arg) + 1].strip().lower()
    if fmt not in ("xlsx", "csv"):
        sys.exit("Error: --format must be xlsx or csv")

    sb = get_client()
    OUTDIR.mkdir(exist_ok=True)

    for language in languages:
        for subject in subjects:
            print(f"Fetching {language} / {subject}…", end=" ", flush=True)
            rows = fetch_questions(sb, language, subject)
            if not rows:
                print("0 rows — skipping")
                continue
            flat = flatten(rows)
            df = pd.DataFrame(flat)
            filename = f"{language}_{subject}.{fmt}"
            outpath = OUTDIR / filename
            if fmt == "xlsx":
                with pd.ExcelWriter(outpath, engine="openpyxl") as writer:
                    df.to_excel(writer, index=False, sheet_name=f"{language} {subject}")
                    # Auto-size columns
                    ws = writer.sheets[f"{language} {subject}"]
                    for col in ws.columns:
                        max_len = max(
                            (len(str(cell.value)) for cell in col if cell.value),
                            default=10,
                        )
                        ws.column_dimensions[col[0].column_letter].width = min(max_len + 2, 80)
            else:
                df.to_csv(outpath, index=False, encoding="utf-8-sig")
            print(f"{len(flat)} questions → {outpath.relative_to(ROOT)}")

    print(f"\nDone. Files saved to {OUTDIR.relative_to(ROOT)}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
