#!/usr/bin/env python3
"""
FBM Research Helper (Python 1 level)

Reads your app's exports (CSV or JSON) and produces:
1) A console summary per behavior
2) A tidy behavior-level summary CSV
3) A date-level time series CSV
4) (Optional) a simple scatter plot if matplotlib is available

Usage:
  python tools/fbm_analysis.py --input exports/fbm_entries_user.csv
  python tools/fbm_analysis.py --input exports/fbm_package_user.json --summaries out/summary.csv --timeseries out/series.csv --plot out/scatter.png
"""

from __future__ import annotations
import argparse
import csv
import json
import math
import os
from collections import defaultdict
from datetime import datetime
from statistics import mean, median

# ---------- Data containers (simple dicts for Python-1 level) ----------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analyze FBM exports for research.")
    parser.add_argument("--input", required=True, help="Path to CSV or JSON export from the app.")
    parser.add_argument("--summaries", default="fbm_summary.csv", help="Output CSV with per-behavior summary.")
    parser.add_argument("--timeseries", default="fbm_timeseries.csv", help="Output CSV with per-date time series.")
    parser.add_argument("--plot", default="", help="Optional PNG path for a scatter plot (requires matplotlib).")
    parser.add_argument("--behavior", default="", help="Only analyze this behavior title (exact match).")
    parser.add_argument("--strip-notes", action="store_true", help="Do not include notes in outputs.")
    return parser.parse_args()


def is_success_zone(motivation: int, ability: int) -> bool:
    """FBM heuristic from the app: success region approx m >= 12 - a."""
    return motivation >= (12 - ability)


def load_export_file(input_path: str) -> dict:
    """Load CSV or JSON produced by the app. Return a dict with 'behaviors' and 'entries'."""
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input not found: {input_path}")

    _, ext = os.path.splitext(input_path.lower())

    if ext == ".json":
        with open(input_path, "r", encoding="utf-8") as f:
            pkg = json.load(f)
        # Expect keys from the app's JSON package
        behaviors = pkg.get("behaviors", [])
        entries = pkg.get("entries", [])
        # Normalize keys we use below
        for e in entries:
            # JSON package already has datetimeISO, dateISO, time
            e.setdefault("datetimeISO", e.get("datetimeISO") or e.get("datetime") or "")
            e.setdefault("dateISO", e.get("dateISO") or (e["datetimeISO"][:10] if e.get("datetimeISO") else ""))
            if "time" not in e and e.get("datetimeISO"):
                e["time"] = datetime.fromisoformat(e["datetimeISO"].replace("Z","")).strftime("%H:%M")
        return {"behaviors": behaviors, "entries": entries}

    # CSV path
    behaviors_map = {}  # we will fill minimal titles when present
    entries = []
    with open(input_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # CSV header from the app: user_id, behavior_id, behavior_title, date, time, datetime, motivation, ability, did, did_numeric, note, anchor, tiny
            entries.append({
                "behaviorId": row.get("behavior_id", ""),
                "dateISO": row.get("date", ""),
                "time": row.get("time", ""),
                "datetimeISO": row.get("datetime", ""),
                "motivation": int(row.get("motivation", "0") or 0),
                "ability": int(row.get("ability", "0") or 0),
                "did": (row.get("did", "no") or "no").lower(),
                "note": row.get("note", ""),
            })
            bid = row.get("behavior_id", "")
            btitle = row.get("behavior_title", "")
            if bid and btitle and bid not in behaviors_map:
                behaviors_map[bid] = {"id": bid, "title": btitle, "anchor": row.get("anchor", ""), "tiny": row.get("tiny", "")}

    behaviors = list(behaviors_map.values())
    return {"behaviors": behaviors, "entries": entries}


def build_behavior_lookup(behaviors: list[dict]) -> dict[str, dict]:
    """Map behaviorId -> behavior dict with title."""
    lookup = {}
    for b in behaviors:
        bid = b.get("id") or b.get("behaviorId") or b.get("behavior_id")
        if bid:
            lookup[bid] = {
                "id": bid,
                "title": b.get("title", ""),
                "anchor": b.get("anchor", ""),
                "tiny": b.get("tiny", "")
            }
    return lookup


def compute_streaks(did_flags_by_date: dict[str, bool]) -> tuple[int, int]:
    """Return (current_streak, longest_streak) for 'did==yes' over date order."""
    dates_sorted = sorted(did_flags_by_date.keys())
    longest = 0
    current = 0
    prev_date = None
    for d in dates_sorted:
        did = did_flags_by_date[d]
        # streak counts only if today is yes and dates are consecutive OR first yes
        if did:
            if prev_date:
                prev = datetime.fromisoformat(prev_date)
                cur = datetime.fromisoformat(d)
                delta = (cur - prev).days
                if delta == 1:
                    current += 1
                else:
                    current = 1
            else:
                current = 1
            longest = max(longest, current)
        else:
            current = 0
        prev_date = d
    # For "current streak", we recompute ending at the latest date:
    return current, longest


def analyze(entries: list[dict], behavior_lookup: dict[str, dict], behavior_title_filter: str = "") -> tuple[list[dict], list[dict]]:
    """
    Produce:
      - behavior_summaries: list of dicts (one per behavior)
      - date_timeseries: list of dicts (one per date per behavior)
    """
    # Filter entries by behavior title if requested
    if behavior_title_filter:
        allowed_ids = {bid for bid, b in behavior_lookup.items() if b["title"] == behavior_title_filter}
    else:
        allowed_ids = set(behavior_lookup.keys()) if behavior_lookup else {e.get("behaviorId","") for e in entries}

    # group by behavior and by date
    entries_by_behavior: dict[str, list[dict]] = defaultdict(list)
    daily_by_behavior: dict[str, dict[str, list[dict]]] = defaultdict(lambda: defaultdict(list))

    for e in entries:
        bid = e.get("behaviorId", "")
        if bid not in allowed_ids:
            continue
        # ensure ints
        motivation = int(e.get("motivation", 0) or 0)
        ability = int(e.get("ability", 0) or 0)
        did = str(e.get("did", "no")).lower()
        date_iso = e.get("dateISO") or (e.get("datetimeISO", "")[:10]) or ""
        time_txt = e.get("time", "")

        normalized = {
            "behaviorId": bid,
            "dateISO": date_iso,
            "time": time_txt,
            "datetimeISO": e.get("datetimeISO", ""),
            "motivation": motivation,
            "ability": ability,
            "did": did,
            "note": e.get("note", "")
        }
        entries_by_behavior[bid].append(normalized)
        daily_by_behavior[bid][date_iso].append(normalized)

    # Build per-date series rows
    date_timeseries: list[dict] = []
    for bid, by_date in daily_by_behavior.items():
        btitle = behavior_lookup.get(bid, {}).get("title", "")
        for date_iso, day_list in sorted(by_date.items()):
            if not date_iso:
                continue
            ms = [d["motivation"] for d in day_list]
            as_ = [d["ability"] for d in day_list]
            did_yes = sum(1 for d in day_list if d["did"] == "yes")
            in_zone_yes = sum(1 for d in day_list if d["did"] == "yes" and is_success_zone(d["motivation"], d["ability"]))
            row = {
                "behavior_id": bid,
                "behavior_title": btitle,
                "date": date_iso,
                "n_entries": len(day_list),
                "avg_m": round(mean(ms), 3),
                "avg_a": round(mean(as_), 3),
                "median_m": median(ms),
                "median_a": median(as_),
                "did_yes": did_yes,
                "did_in_zone_yes": in_zone_yes
            }
            date_timeseries.append(row)

    # Build per-behavior summary rows
    behavior_summaries: list[dict] = []
    for bid, e_list in entries_by_behavior.items():
        if not e_list:
            continue
        btitle = behavior_lookup.get(bid, {}).get("title", "")
        ms = [e["motivation"] for e in e_list]
        as_ = [e["ability"] for e in e_list]
        did_yes = sum(1 for e in e_list if e["did"] == "yes")
        in_zone_yes = sum(1 for e in e_list if e["did"] == "yes" and is_success_zone(e["motivation"], e["ability"]))
        did_flags_by_date = {e["dateISO"]: (e["did"] == "yes") for e in e_list if e["dateISO"]}

        cur_streak, longest_streak = compute_streaks(did_flags_by_date)
        first_date = min((e["dateISO"] for e in e_list if e["dateISO"]), default="")
        last_date = max((e["dateISO"] for e in e_list if e["dateISO"]), default="")

        total = len(e_list)
        summary = {
            "behavior_id": bid,
            "behavior_title": btitle,
            "start_date": first_date,
            "end_date": last_date,
            "n_entries": total,
            "success_rate_yes": round(did_yes / total, 4) if total else 0.0,
            "success_rate_yes_in_zone": round(in_zone_yes / total, 4) if total else 0.0,
            "avg_m": round(mean(ms), 3),
            "avg_a": round(mean(as_), 3),
            "median_m": median(ms),
            "median_a": median(as_),
            "streak_current": cur_streak,
            "streak_longest": longest_streak,
        }
        behavior_summaries.append(summary)

    return behavior_summaries, date_timeseries


def write_csv(path: str, rows: list[dict]) -> None:
    if not rows:
        # Create an empty file with a note header for reproducibility
        with open(path, "w", newline="", encoding="utf-8") as f:
            f.write("# empty\n")
        return
    fieldnames = list(rows[0].keys())
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def maybe_plot_scatter(path_png: str, entries: list[dict]) -> None:
    """Optional: draw simple scatter Ability vs Motivation with FBM line (matplotlib if available)."""
    if not path_png:
        return
    try:
        import matplotlib.pyplot as plt  # allowed if installed
    except Exception:
        print("[plot] matplotlib not available, skipping plot.")
        return

    xs = [e["ability"] for e in entries]
    ys = [e["motivation"] for e in entries]

    plt.figure()
    plt.scatter(xs, ys, s=30)  # default colors, one plot
    # FBM action boundary: m = 12 - a
    ax = plt.gca()
    ax.plot([0, 10], [12 - 0, 12 - 10])  # boundary
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_xlabel("Ability")
    ax.set_ylabel("Motivation")
    ax.set_title("FBM Scatter (Ability vs Motivation)")
    plt.tight_layout()
    plt.savefig(path_png, dpi=160)
    plt.close()
    print(f"[plot] wrote {path_png}")


def main():
    args = parse_args()
    data = load_export_file(args.input)
    behavior_lookup = build_behavior_lookup(data.get("behaviors", []))

    # Optionally strip notes (for privacy when doing research sharing)
    if args.strip_notes:
        for e in data["entries"]:
            e["note"] = ""

    # Optional behavior filter by exact title
    summaries, series = analyze(data["entries"], behavior_lookup, behavior_title_filter=args.behavior)

    # Console summary
    print("\n=== FBM Behavior Summary ===")
    if not summaries:
        print("No data to summarize.")
    for s in summaries:
        print(f"- {s['behavior_title']!r} | entries={s['n_entries']} | yes={s['success_rate_yes']:.2%} | "
              f"in-zone-yes={s['success_rate_yes_in_zone']:.2%} | "
              f"avg M={s['avg_m']:.2f} A={s['avg_a']:.2f} | "
              f"streak now={s['streak_current']} / max={s['streak_longest']}")

    # Write CSVs
    write_csv(args.summaries, summaries)
    write_csv(args.timeseries, series)
    print(f"[out] summaries -> {args.summaries}")
    print(f"[out] timeseries -> {args.timeseries}")

    # Optional plot uses all filtered entries
    maybe_plot_scatter(args.plot, data["entries"])


if __name__ == "__main__":
    main()
