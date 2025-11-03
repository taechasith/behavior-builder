"""
analyze_fbm.py  —  Python-1 friendly analyzer for FBM exported CSV

Usage:
    python analyze_fbm.py fbm_entries_yourname_YYYY-MM-DD.csv

What it does (Python-1 topics only: file I/O, lists/dicts, loops, functions):
- Reads the tidy CSV you export from the Dashboard.
- Computes overall counts, success rate, average motivation/ability.
- Computes the same for the last 7 days (rolling window by date).
- Produces per-behavior summary (rows) and writes:
    - fbm_behavior_summary.csv
    - fbm_summary.json
"""

import sys, csv, json
from datetime import datetime, timedelta
from statistics import mean

def parse_date(s: str) -> datetime:
    # s like "2025-03-07"
    return datetime.strptime(s, "%Y-%m-%d")

def load_rows(path: str):
    with open(path, "r", encoding="utf-8") as f:
        r = csv.DictReader(f)
        rows = []
        for row in r:
            try:
                rows.append({
                    "user_id": row.get("user_id",""),
                    "behavior_id": row.get("behavior_id",""),
                    "behavior_title": row.get("behavior_title",""),
                    "date": row["date"],
                    "time": row.get("time",""),
                    "datetime": row.get("datetime",""),
                    "motivation": int(row["motivation"]),
                    "ability": int(row["ability"]),
                    "did": row["did"].strip().lower(),
                    "note": row.get("note",""),
                    "anchor": row.get("anchor",""),
                    "tiny": row.get("tiny","")
                })
            except Exception as e:
                # skip malformed lines
                continue
        return rows

def success_rate(rows):
    if not rows: return 0.0
    yes = sum(1 for r in rows if r["did"] == "yes")
    return yes / len(rows)

def by_behavior(rows):
    groups = {}
    for r in rows:
        key = (r["behavior_id"], r["behavior_title"])
        groups.setdefault(key, []).append(r)
    return groups

def write_behavior_summary(groups, out_csv):
    header = ["behavior_id","behavior_title","n","success_rate","avg_motivation","avg_ability"]
    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        for (bid, title), rows in groups.items():
            n = len(rows)
            sr = success_rate(rows)
            avg_m = mean([r["motivation"] for r in rows]) if rows else 0.0
            avg_a = mean([r["ability"] for r in rows]) if rows else 0.0
            w.writerow([bid, title, n, f"{sr:.3f}", f"{avg_m:.2f}", f"{avg_a:.2f}"])

def main():
    if len(sys.argv) < 2:
        print("Usage: python analyze_fbm.py exported.csv")
        sys.exit(1)

    path = sys.argv[1]
    rows = load_rows(path)
    if not rows:
        print("No rows found. Ensure you exported the tidy CSV from the app.")
        sys.exit(1)

    # overall
    rows_sorted = sorted(rows, key=lambda r: (r["date"], r["time"]))
    overall_sr = success_rate(rows_sorted)
    avg_m = mean([r["motivation"] for r in rows_sorted])
    avg_a = mean([r["ability"] for r in rows_sorted])

    # last 7 days
    last_date = parse_date(rows_sorted[-1]["date"])
    cutoff = last_date - timedelta(days=6)  # inclusive 7 days window
    last7 = [r for r in rows_sorted if parse_date(r["date"]) >= cutoff]
    last7_sr = success_rate(last7)
    last7_m = mean([r["motivation"] for r in last7]) if last7 else 0.0
    last7_a = mean([r["ability"] for r in last7]) if last7 else 0.0

    # per behavior
    groups = by_behavior(rows_sorted)
    write_behavior_summary(groups, "fbm_behavior_summary.csv")

    # small JSON summary
    summary = {
        "n": len(rows_sorted),
        "overall": {
            "success_rate": round(overall_sr, 3),
            "avg_motivation": round(avg_m, 2),
            "avg_ability": round(avg_a, 2)
        },
        "last_7_days": {
            "n": len(last7),
            "success_rate": round(last7_sr, 3),
            "avg_motivation": round(last7_m, 2),
            "avg_ability": round(last7_a, 2)
        }
    }
    with open("fbm_summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    # console print for graders
    print("=== FBM Summary ===")
    print(f"Total entries: {summary['n']}")
    print(f"Overall success rate: {summary['overall']['success_rate']}")
    print(f"Overall avg M/A: {summary['overall']['avg_motivation']} / {summary['overall']['avg_ability']}")
    print(f"Last 7 days (n={summary['last_7_days']['n']}): SR={summary['last_7_days']['success_rate']}, "
          f"M/A={summary['last_7_days']['avg_motivation']} / {summary['last_7_days']['avg_ability']}")
    print("Wrote: fbm_behavior_summary.csv, fbm_summary.json")

if __name__ == "__main__":
  main()
