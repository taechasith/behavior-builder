# Behavior Builder (FBM)  
*Personalized Fogg Behavior Model Tracker & Research Export Tool*

---

## About This Project

**Behavior Builder (FBM)** is an open-source, privacy-first web app and Python research toolkit for supporting new habit formation through daily self-logging and visual feedback.  
It applies the **Fogg Behavior Model (FBM)**—a well-known framework in behavioral psychology—to help users and researchers understand the interplay of *motivation*, *ability*, and *prompting* in driving successful behavior change.

This project was created by **Taechasith Kangkhuntod** for the Python1 module at [Harbour.Space Institute of Technology @UTCC](https://utcc.harbour.space/), inspired by insights from the *Consumer Behavior* module (2025) and current research in **cyborg psychology**.

---

## Academic Background: Cyborg Psychology & Digital Behavior Change

### Why Cyborg Psychology?

*Cyborg psychology* examines the dynamic co-evolution of humans and digital systems—where apps, sensors, and AI become extensions of the self.  
In this project, the app acts as a “cybernetic mirror”:
- **Input-first, bias-guarded UX:** Users record daily *motivation* and *ability* before seeing past data, reducing cognitive bias (anchoring, Hawthorne effect), as advocated in modern behavioral science [1,2].
- **Personal feedback loop:** By visualizing *FBM* progress over time, the tool supports self-reflection and incremental habit shaping, echoing principles from digital nudging and cybernetic self-control theory [3,4].

### Research Rationale

- **Fogg Behavior Model** ([Fogg, 2009](https://www.behaviormodel.org/)): Shows that successful behavior requires *sufficient motivation*, *sufficient ability*, and a *prompt* at the right moment.
- **Quantitative habit tracking:** The app generates research-grade, exportable CSV/JSON logs for analyzing intervention effects, learning curves, and behavioral persistence.

---

## Features

- **Professional multi-user login** (local & private session)
- **Bias-reducing “focus mode”** hides history until today’s log is submitted
- **Dynamic FBM graph** (motivation vs. ability, time-annotated, with success zone)
- **Weekly and daily research exports** (tidy CSV/JSON)
- **Python data tool** for summary, time series, and optional plotting
- **All processing is local/private—no data leaves your device by default**

---

## Usage (for Research & Self-Tracking)

1. **Set up your behaviors** (e.g., "Read 1 page", "Stretch for 2 mins")
2. **Log your daily motivation/ability** before reviewing past trends
3. **Export your logs** via CSV/JSON (no account/server required)
4. **Run the included Python analysis script** to:
    - Compute per-behavior stats (success rates, streaks, trendlines)
    - Produce research-ready time series for statistical analysis or presentations
    - (Optionally) Generate scatter plots of your FBM data

Example:

```bash
python tools/fbm_analysis.py --input exports/fbm_entries_user.csv
