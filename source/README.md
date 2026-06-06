# Question source files

Place Excel files here using this folder layout:

```
source/
  English/
    11th/
      Physics/
        Chapter1_QA.xlsx
    12th/
      Physics/
        Chapter1_QA.xlsx
  Tamil/
    11th/
      Physics/
        Chapter1_QA_Tamil.xlsx
    12th/
      Physics/
        Chapter1_QA_Tamil.xlsx
```

## Excel format

| Question | A | B | C | D | Answer | Explanation |
|----------|---|---|---|---|--------|-------------|

- **Answer**: `A`, `B`, `C`, or `D`
- Row 1 must be the header row

## Build

```bash
pip install -r scripts/requirements.txt
python scripts/build_questions.py
```

This writes JSON files to `data/` and updates `data/manifest.json`.
