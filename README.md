# Behavior Builder (FBM):  
Web-Based Tool for Quantitative Research in Cyborg Bahavior Formation

**Taechasith Kangkhuntod**  
Python1 Module, Harbour.Space Institute of Technology @UTCC, 2025  
[behavior-builder.vercel.app](https://behavior-builder.vercel.app/)

---

## Abstract

**Background:**  
Behavior change research increasingly leverages digital tools, but many self-tracking solutions risk bias, lack research-grade exports, or insufficiently account for the user’s cognitive coupling with technology—issues central to emerging fields such as cyborg psychology.

**Objective:**  
We present **Behavior Builder (FBM)**, an open-source, privacy-preserving web application and Python toolkit that enables users and researchers to log and analyze habit formation in line with the Fogg Behavior Model (FBM). The tool was developed as a final project for Python1 at Harbour.Space Institute of Technology @UTCC, inspired by the Consumer Behavior curriculum.

**Methods:**  
The system implements the FBM as a daily interactive graph, recording user-rated *motivation* and *ability* for target behaviors. A focus-first, bias-minimized interface is deployed: historical data are concealed until after each daily check-in, reducing anchoring and Hawthorne effects. Exports are structured for quantitative research (CSV/JSON). An accompanying Python script provides batch summary statistics and visualizations. The design foregrounds the cyborg psychology paradigm, treating the digital interface as an active participant in behavioral change.

**Results:**  
Behavior Builder was piloted publicly at [behavior-builder.vercel.app](https://behavior-builder.vercel.app/). The platform supports multi-user sessions, bias-aware input, and flexible data export for longitudinal analysis. The included research script automatically computes per-behavior success rates, current/longest streaks, and trendlines, enabling rapid hypothesis generation for behavioral intervention studies. All data remain client-side by default, ensuring privacy.

**Conclusions:**  
This tool enables rigorous, reproducible research into digital habit formation, while actively incorporating cybernetic feedback and cognitive extension principles from cyborg psychology. It is freely available for researchers, educators, and practitioners interested in the dynamics of motivation, ability, and digital nudging.

---

## Introduction

Digital interventions for behavior change are ubiquitous, yet the interplay between humans and digital self-tracking technologies is understudied—especially from the standpoint of *cyborg psychology*, which treats the technology itself as a component of cognitive and motivational processes [1,2]. The Fogg Behavior Model (FBM) posits that successful behavior arises when motivation, ability, and an effective prompt converge [3]. However, user-facing tools often introduce bias or do not facilitate transparent data analysis.

This project aims to bridge that gap, providing a system that is:

- Research-friendly and privacy-first
- Explicitly designed to minimize digital self-tracking bias
- Accessible for both end-users and behavioral scientists

---

## Methods

### System Design

Behavior Builder (FBM) consists of two main components:

1. **Web Application**  
    - *Multi-user local login*: Users can create accounts or use guest sessions, with all data stored client-side.
    - *Focus-first UX*: Daily logs of motivation (0–10) and ability (0–10) for selected behaviors are entered before any prior data is revealed, to limit anchoring and self-fulfilling bias [4].
    - *FBM Graph*: Visualizes progress on a motivation–ability plane with action boundaries, enabling both self-reflection and quantitative research.
    - *Bias-reduction features*: History and graphs are blinded until new data is entered each day.
    - *Export*: All data (including timestamps, notes, behavior metadata) can be exported as tidy CSV or JSON for external analysis.

2. **Python Research Toolkit**  
    - Reads exported CSV/JSON
    - Outputs per-behavior and per-date summaries (success rates, streaks, averages)
    - Optionally generates scatter plots (if `matplotlib` is available)
    - Fully compatible with standard Python-1 skills

### Public Deployment

A live demo is available at:  
[https://behavior-builder.vercel.app/](https://behavior-builder.vercel.app/)

### Data Privacy

No data leaves the user’s device by default. All processing, storage, and analysis occur locally unless the user opts to export data.

---

## Results

Behavior Builder was piloted with self-experimentation and in undergraduate classroom settings. The following outcomes were observed:

- **User Experience:**  
    - Users reported increased awareness of the *fluctuations* in their motivation and ability, consistent with FBM theory.
    - The focus-first design minimized bias: users could not “game” their entries based on past trends.
- **Research Utility:**  
    - Exported data enabled rapid computation of success rates, habit streaks, and the impact of interventions (e.g., nudges or prompts).
    - The provided Python tool generated publication-ready summaries in seconds.

**Example Outputs:**

- *Per-behavior success rate*: Percentage of days where behavior was successfully performed, and success within the FBM action zone.
- *Longest streak*: Maximum consecutive days of success.
- *Time series*: Daily trends in motivation and ability.

---

## Discussion

**Cyborg Psychology Implications:**  
By foregrounding the device’s role in cognitive and motivational processes, Behavior Builder demonstrates a practical application of cyborg psychology [1,2]. The system’s bias-guarding UX, privacy-first philosophy, and exportability make it suitable for intervention research, n-of-1 studies, and digital wellness projects.

**Limitations:**  
- Self-reporting always carries potential for bias, though blinding past data can reduce this.
- The tool does not (yet) automate reminders or integrate with external data sources.

**Future Directions:**  
- Integration with passive sensors or AI-driven feedback loops
- Customizable nudges based on real-time analytics
- Comparative studies with and without bias-blinding enabled

---

## Conclusion

Behavior Builder (FBM) is an open, scientifically principled tool for digital behavior change research. Its design embodies the co-evolution of human and machine (“cyborg”) perspectives, and provides practical, exportable analytics for behavioral scientists, educators, and self-improvers.

---

## References

1. Heersmink, R. (2017). *Distributed Cognition and Digital Self-Control Tools: A Cognitive-Integration Approach*. Philosophy & Technology, 30(2), 251–269.
2. Lyngs, U. et al. (2020). *“I Visited My Habit Garden Everyday”: The Behavior Change Potential of a Virtual Garden for Improving Adherence to Digital Self-Control Tools*. CHI ’20.
3. Fogg, B.J. (2009). *A Behavior Model for Persuasive Design*. In: Persuasive '09.
4. Dolan, P. et al. (2012). *Mindspace: Influencing behaviour through public policy*. Institute for Government.

---

## Acknowledgements

Developed by **Taechasith Kangkhuntod**  
For Python1 Module (2025)  
Inspired by the Consumer Behavior module (2025)  
Harbour.Space Institute of Technology @UTCC 

---

## Open Access

**Try it:** [https://behavior-builder.vercel.app/](https://behavior-builder.vercel.app/)  
**Source code:** [https://github.com/taechasith/behavior-builder](https://github.com/taechasith/behavior-builder)

---

*For academic use, please cite this paper or the app’s URL.*
