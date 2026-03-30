# ABG / VBG Interpreter

A systematic acid-base analysis tool with interactive differential diagnosis, built for clinicians and medical education.

**Live App:** [abg-interpreter.vercel.app](https://abg-interpreter.vercel.app)
**Author:** Kuan-Yuan Chen, M.D.

## Features

- **ABG & VBG Interpretation** — Automatic VBG→ABG conversion (pH +0.035, PCO₂ −5.7 mmHg)
- **5-Step Acid-Base Analysis** — pH assessment → Primary disorder → Compensation → Anion gap → Delta ratio/Delta-delta
- **63 Differential Diagnoses** — Categorized across HAGMA, NAGMA, Metabolic Alkalosis, Respiratory Acidosis, and Respiratory Alkalosis
- **Interactive DDx Narrowing** — Clinical context checkboxes (sepsis, renal disease, ingestion, etc.) dynamically score and sort differentials
- **Oxygenation Assessment** — A-a gradient, P/F ratio with ARDS Berlin classification
- **Osmolar Gap** — Calculated when Na, glucose, BUN, and measured osmolality are provided
- **Configurable Advanced Settings** — Chronic respiratory acidosis compensation (3.5 vs 4.0), delta ratio threshold (0.8 vs 1.0), A-a gradient formula
- **Unit Flexibility** — Lactate (mg/dL ↔ mmol/L), Glucose (mg/dL ↔ mmol/L) with real-time conversion
- **Shareable Results** — Copy link (URL parameters) or copy as plain text for EMR documentation
- **Henderson-Hasselbalch Consistency Check** — Warns when pH/PCO₂/HCO₃ values don't add up
- **Telemetry** — Anonymized JSONB payloads → Neon Serverless Postgres. Captures raw inputs, preserving VBG data as-entered
- **Feedback & Bug Reporting** — Footer buttons for user feedback (to be linked to Google Sheets/Forms)

## Tech Stack

| Layer | Technology |
|-------|-----------| 
| Frontend | Vanilla HTML / CSS / JS (no framework) |
| Backend | Vercel Serverless Function (Node.js ESM) |
| Database | Neon Serverless Postgres (JSONB) |
| Hosting | Vercel |
| SDK | `@neondatabase/serverless` |

## Project Structure

```
abg-interpreter/
├── public/                      # Static frontend (served by Vercel)
│   ├── index.html               # UI structure, input groups, results panel
│   ├── style.css                # Dark theme, responsive layout, footer buttons 
│   └── interpreter.js           # Clinical logic engine (fully commented)
│       ├── Section 1: Global state & settings
│       ├── Section 2: Unit conversion helpers
│       ├── Section 3: UI interaction handlers
│       ├── Section 4: Value getters with VBG→ABG conversion
│       ├── Section 5: Validation & plausibility checks 
│       ├── Section 6: Core calculation functions
│       ├── Section 7: Differential Diagnosis database (63 entries)
│       ├── Section 8: Main interpret() engine (Steps 1–5)
│       ├── Section 9: DDx rendering & scoring engine
│       └── Section 10: Share/Copy, Toast, URL loading
├── api/
│   └── submit.js                # Serverless function → Neon Postgres
├── vercel.json                  # Rewrites, cache-control headers
├── package.json                 # Dependencies (@neondatabase/serverless)
├── DOCUMENTATION.md             # Full technical documentation
└── README.md
```

## Deployment

This app is designed for seamless deployment on **Vercel**:

1. **Import** your GitHub repository in the Vercel dashboard.
2. **Add the Neon integration** from Vercel Marketplace (Settings → Integrations → Neon). This auto-populates the `DATABASE_URL` env var.
3. **Create the table** — run this SQL once in the Neon SQL Editor:
   ```sql
   CREATE TABLE IF NOT EXISTS submissions (
     id SERIAL PRIMARY KEY,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     country VARCHAR(10),
     region VARCHAR(10),
     payload JSONB
   );
   ```
4. **Deploy** — Vercel auto-deploys on every `git push`.

### Environment Variables

| Variable | Source | Purpose |
|----------|--------|---------|
| `DATABASE_URL` | Neon integration (auto) | Primary connection string |
| `POSTGRES_URL` | Fallback (legacy) | Used if `DATABASE_URL` is absent |

### Cache Control

`vercel.json` sets `Cache-Control: public, max-age=0, must-revalidate` on all `.js` and `.css` files to prevent stale CDN assets.

## Testing

The app has been validated against 12 clinical scenarios:

| Category | Cases Tested |
|----------|-------------|
| **Core** | Normal ABG, DKA (HAGMA+NAGMA), COPD (chronic resp acidosis), Metabolic alkalosis, Triple mixed disorder (salicylate pattern) |
| **Edge Cases** | VBG mode, Extreme acidosis (pH 6.9), Required-fields-only, Respiratory alkalosis, Osmolar gap, Henderson-Hasselbalch mismatch, Empty field validation |

All cases passed with correct diagnoses, compensation patterns, and differential activation.

## References

- [LITFL — Acid-Base](https://litfl.com/acid-base/)
- [LITFL — ABG Interpretation](https://litfl.com/arterial-blood-gas-abg/)
- [LITFL — Metabolic Acidosis](https://litfl.com/metabolic-acidosis/)
- [LITFL — Metabolic Alkalosis](https://litfl.com/metabolic-alkalosis/)
- [LITFL — Respiratory Acidosis](https://litfl.com/respiratory-acidosis/)
- [LITFL — Respiratory Alkalosis](https://litfl.com/respiratory-alkalosis/)
- [LITFL — Anion Gap](https://litfl.com/anion-gap/)
- [LITFL — Delta Ratio](https://litfl.com/delta-ratio/)
- [LITFL — VBG vs ABG](https://litfl.com/vbg-versus-abg/)
- [StatPearls — Arterial Blood Gas](https://www.ncbi.nlm.nih.gov/books/NBK482430/)
- [StatPearls — Anion Gap](https://www.ncbi.nlm.nih.gov/books/NBK539753/)
- [StatPearls — A-a Gradient](https://www.ncbi.nlm.nih.gov/books/NBK545153/)

## Disclaimer

This tool is for **educational purposes only**. Clinical decisions should always be made by qualified healthcare professionals in the context of the individual patient.

## License

This work is licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

You are free to share and adapt this work, provided you give appropriate credit:

> Chen, K.-Y. (2026). ABG/VBG Interpreter. https://github.com/galencky/abg-interpreter

## Citation

If you use or reference this tool, please cite:

```
Chen, K.-Y. (2026). ABG/VBG Interpreter [Web application]. https://github.com/galencky/abg-interpreter
```
