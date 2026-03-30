# ABG / VBG Interpreter

A systematic acid-base analysis tool with interactive differential diagnosis.

**Author:** Kuan-Yuan Chen, M.D.

## Features

- ABG and VBG interpretation with automatic VBG-to-ABG conversion
- Step-by-step acid-base analysis (pH, compensation, anion gap, delta ratio, osmolar gap)
- Interactive differential diagnosis with clinical clues and narrowing filters
- Oxygenation assessment (A-a gradient, PaO2/FiO2 ratio)
- Configurable advanced settings for alternative compensation formulas
- Shareable results via URL parameters or plain text
- **Built-in Telemetry:** Each interpretation automatically submits an anonymized JSONB payload (clinical inputs, calculated results, and granular differential diagnosis scores) to a Neon Serverless Postgres database via the `/api/submit` serverless function. The telemetry schema is entirely flexible — no database migrations are needed when the frontend evolves.

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
├── public/                   # Static frontend (served by Vercel)
│   ├── index.html            # UI structure, input groups, results
│   ├── style.css             # Dark theme, responsive layout
│   └── interpreter.js        # Clinical logic, DDx, scoring, telemetry
├── api/
│   └── submit.js             # Serverless function → Neon Postgres
├── vercel.json               # Rewrites, cache-control headers
├── package.json              # Dependencies (@neondatabase/serverless)
├── DOCUMENTATION.md          # Full technical documentation
└── README.md
```

## Deployment

This app is optimized for seamless deployment on **Vercel**:

1. **Import** your GitHub repository in the Vercel dashboard.
2. **Add the Neon integration** from the Vercel Marketplace (Settings → Integrations → Neon). This automatically populates the `DATABASE_URL` environment variable.
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

`vercel.json` sets `Cache-Control: public, max-age=0, must-revalidate` on all `.js` and `.css` files to prevent stale assets from being served by the CDN.

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

This tool is for educational purposes only. Clinical decisions should always be made by qualified healthcare professionals in the context of the individual patient.

## License

This work is licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

You are free to share and adapt this work, provided you give appropriate credit:

> Chen, K.-Y. (2026). ABG/VBG Interpreter. https://github.com/galencky/abg-interpreter

## Citation

If you use or reference this tool, please cite:

```
Chen, K.-Y. (2026). ABG/VBG Interpreter [Web application]. https://github.com/galencky/abg-interpreter
```
