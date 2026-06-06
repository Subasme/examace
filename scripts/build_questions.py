"""
Convert source Excel files to JSON for ExamAce.
Expected layout: source/{English|Tamil}/{11th|12th}/{Physics|Chemistry|Biology}/*.xlsx

Excel columns: Question, A, B, C, D, Answer, Explanation
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source"
DATA = ROOT / "data"

ANSWER_MAP = {
    "A": 0, "B": 1, "C": 2, "D": 3,
    "1": 0, "2": 1, "3": 2, "4": 3,
}


def parse_chapter_id(filename: str) -> tuple[str, str]:
    """Chapter1_QA.xlsx -> ('chapter1', 'Chapter 1')"""
    match = re.search(r"chapter\s*(\d+)", filename, re.IGNORECASE)
    if not match:
        slug = re.sub(r"[^a-z0-9]+", "-", Path(filename).stem.lower()).strip("-")
        return slug, Path(filename).stem
    num = int(match.group(1))
    return f"chapter{num}", f"Chapter {num}"


def parse_answer(value) -> int:
    if pd.isna(value):
        raise ValueError("missing answer")
    text = str(value).strip().upper()
    if text in ANSWER_MAP:
        return ANSWER_MAP[text]
    raise ValueError(f"invalid answer: {value!r}")


def row_to_question(row, topic: str) -> dict:
    options = [str(row["A"]).strip(), str(row["B"]).strip(), str(row["C"]).strip(), str(row["D"]).strip()]
    explanation = row.get("Explanation", "")
    if pd.isna(explanation):
        explanation = ""
    return {
        "topic": topic,
        "question": str(row["Question"]).strip(),
        "options": options,
        "correct": parse_answer(row["Answer"]),
        "explanation": str(explanation).strip(),
    }


def read_excel(path: Path, topic: str) -> list[dict]:
    df = pd.read_excel(path)
    required = {"Question", "A", "B", "C", "D", "Answer"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"{path.name}: missing columns {sorted(missing)}")

    questions = []
    for _, row in df.iterrows():
        if pd.isna(row.get("Question")) or not str(row["Question"]).strip():
            continue
        try:
            questions.append(row_to_question(row, topic))
        except ValueError:
            continue
    return questions


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def build() -> dict:
    if DATA.exists():
        for child in DATA.rglob("*"):
            if child.is_file():
                child.unlink()
        for child in sorted(DATA.rglob("*"), reverse=True):
            if child.is_dir():
                child.rmdir()

    manifest: dict = {"languages": []}
    lang_nodes: dict[str, dict] = {}

    for lang_dir in sorted(SOURCE.iterdir()):
        if not lang_dir.is_dir():
            continue
        language = lang_dir.name
        lang_entry = {"id": language.lower(), "label": language, "standards": []}
        lang_nodes[language] = lang_entry

        for std_dir in sorted(lang_dir.iterdir()):
            if not std_dir.is_dir():
                continue
            standard = std_dir.name
            std_entry = {"id": standard, "label": f"{standard} Standard", "subjects": []}

            for subject_dir in sorted(std_dir.iterdir()):
                if not subject_dir.is_dir():
                    continue
                subject = subject_dir.name
                subject_entry = {"id": subject.lower(), "label": subject, "chapters": []}
                all_questions: list[dict] = []

                for xlsx in sorted(subject_dir.glob("*.xlsx")):
                    chapter_id, chapter_label = parse_chapter_id(xlsx.name)
                    questions = read_excel(xlsx, chapter_label)
                    rel = Path(language) / standard / subject / f"{chapter_id}.json"
                    out_path = DATA / rel
                    write_json(out_path, {
                        "meta": {
                            "language": language,
                            "standard": standard,
                            "subject": subject,
                            "chapter": chapter_label,
                            "chapterId": chapter_id,
                            "source": xlsx.name,
                            "count": len(questions),
                        },
                        "questions": questions,
                    })
                    subject_entry["chapters"].append({
                        "id": chapter_id,
                        "label": chapter_label,
                        "path": str(rel).replace("\\", "/"),
                        "count": len(questions),
                    })
                    all_questions.extend(questions)
                    print(f"  {rel} ({len(questions)} questions)")

                if subject_entry["chapters"]:
                    all_rel = Path(language) / standard / subject / "all-chapters.json"
                    write_json(DATA / all_rel, {
                        "meta": {
                            "language": language,
                            "standard": standard,
                            "subject": subject,
                            "chapter": "All Chapters",
                            "chapterId": "all",
                            "source": "combined",
                            "count": len(all_questions),
                        },
                        "questions": all_questions,
                    })
                    subject_entry["allChaptersPath"] = str(all_rel).replace("\\", "/")
                    subject_entry["totalQuestions"] = len(all_questions)
                    std_entry["subjects"].append(subject_entry)

            if std_entry["subjects"]:
                lang_entry["standards"].append(std_entry)

        if lang_entry["standards"]:
            manifest["languages"].append(lang_entry)

    write_json(DATA / "manifest.json", manifest)
    return manifest


def main() -> int:
    if not SOURCE.exists():
        print(f"Source folder not found: {SOURCE}", file=sys.stderr)
        return 1

    print(f"Building from {SOURCE}")
    manifest = build()
    langs = len(manifest["languages"])
    chapters = sum(
        len(subj["chapters"])
        for lang in manifest["languages"]
        for std in lang["standards"]
        for subj in std["subjects"]
    )
    print(f"Done: {langs} language(s), {chapters} chapter(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
