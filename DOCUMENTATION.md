# ABG / VBG Interpreter — Technical Documentation

## Overview

A static web app (HTML/CSS/JS, no backend) for systematic arterial and venous blood gas interpretation with interactive differential diagnosis. All clinical logic runs client-side in `interpreter.js`.

**Files:**
- `index.html` (~260 lines) — UI structure, input groups, results container
- `style.css` (~1090 lines) — Dark theme, responsive layout, component styles
- `interpreter.js` (~1140 lines) — All clinical logic, DDx database, scoring, rendering

---

## Architecture

```
User Input → getValues() → validate() → interpret() → Render Results
                ↓                            ↓
          VBG conversion              6-step algorithm
          Unit conversion              ↓
                                  DDx activation → renderDDx() → renderDDxItems()
                                                                      ↓
                                                              scoreDDx() per item
                                                                      ↓
                                                              Sort & display
```

---

## Input Processing

### File: `interpreter.js` lines 116–164

#### `getValues()`
Reads all form inputs and converts to internal units:

| Input | Display Unit | Internal Unit | Conversion |
|-------|-------------|---------------|------------|
| pH | — | — | Direct |
| PaCO2 | mmHg | mmHg | Direct |
| HCO3⁻ | mmol/L | mmol/L | Direct |
| Na⁺ | mmol/L | mmol/L | Direct |
| Cl⁻ | mmol/L | mmol/L | Direct |
| Albumin | g/dL | g/L | × 10 |
| Lactate | mg/dL or mmol/L | mmol/L | `getLactateMMOL()`: if mg/dL → ÷ 9.01 |
| Glucose | mg/dL or mmol/L | mg/dL | `getGlucoseMGDL()`: if mmol/L → × 18.02 |
| BUN | mg/dL | mg/dL | Direct |
| Measured Osm | mOsm/kg | mOsm/kg | Direct |
| PaO2 | mmHg | mmHg | Direct |
| FiO2 | fraction | fraction | Direct |
| Age | years | years | Direct |
| Acuity | select | string | `'unknown'`, `'acute'`, `'chronic'` |

#### VBG Conversion (lines 140–162)
When `sampleType === 'vbg'`, values are converted to arterial equivalents:
- **pH** = venous pH + 0.035
- **PCO2** = venous PCO2 − 5.7 mmHg
- **HCO3⁻** = unchanged (clinically interchangeable)
- **PO2** = set to NaN (VBG PO2 not valid for oxygenation)

**Source:** [LITFL — VBG vs ABG](https://litfl.com/vbg-versus-abg/) (Kelly 2001 meta-analysis)

#### Unit Toggle System (lines 15–74)
`unitState` tracks current display unit for lactate and glucose. The `setUnit(field, unit)` function:
1. Updates the slider UI (`data-pos` attribute)
2. Auto-converts any entered value between units
3. Updates the displayed normal range

Conversion factors:
- **Lactate:** 1 mmol/L = 9.01 mg/dL (MW lactic acid = 90.08)
- **Glucose:** 1 mmol/L = 18.02 mg/dL (MW glucose = 180.16)

### Validation (lines 182–190)
Required: pH, PCO2, HCO3⁻. All other inputs are optional.

### Plausibility Warnings (lines 192–208)
Shown as non-blocking orange box above results:
- pH < 6.8 or > 7.8 → extreme warning
- PCO2 < 10 or > 120 → extreme warning
- HCO3⁻ < 3 or > 50 → extreme warning
- **Henderson-Hasselbalch check:** calculated pH = 6.1 + log₁₀(HCO3 / (0.03 × PCO2)). If |calculated − entered| > 0.15 → transcription warning

---

## Interpretation Algorithm

### File: `interpreter.js`, `interpret()` function (line ~250)

### Step 1: pH Assessment (lines 296–306)

```
pH < 7.35 → Acidemia
pH > 7.45 → Alkalemia
7.35 ≤ pH ≤ 7.45 → Normal pH
```

**Source:** [StatPearls](https://www.ncbi.nlm.nih.gov/books/NBK482430/), [LITFL](https://litfl.com/acid-base/)

### Step 2: Primary Disorder Identification (lines 308–357)

**If pH < 7.35 (Acidemia):**
- PCO2 > 45 → Respiratory Acidosis
- HCO3⁻ < 22 → Metabolic Acidosis
- Both can be true (mixed)
- Neither → fallback: PCO2 > 40 = RespAcid, else MetAcid

**If pH > 7.45 (Alkalemia):**
- PCO2 < 35 → Respiratory Alkalosis
- HCO3⁻ > 26 → Metabolic Alkalosis
- Same mixed/fallback logic

**If pH normal (7.35–7.45):**
- PCO2 > 45 AND HCO3⁻ > 26 → "Compensated Respiratory Acidosis or Metabolic Alkalosis" (ambiguous — cannot distinguish from ABG alone)
- PCO2 < 35 AND HCO3⁻ < 22 → "Compensated Respiratory Alkalosis or Metabolic Acidosis" (ambiguous)
- Single abnormality → named compensated disorder
- All normal → `isNormalABG = true`, no disorder

**Key design decision:** Ambiguous compensated cases use a single combined label with " or " (not two separate entries) and skip compensation formula checks to avoid circular logic. Both DDx categories are shown so the user can decide based on clinical context.

### Step 3: Compensation Assessment (lines 380–530)

Compensation is skipped for ambiguous compensated cases (`isAmbiguousCompensated`).

#### Metabolic Acidosis → Winter's Formula
```
Expected PCO2 = 1.5 × HCO3⁻ + 8 mmHg
Strict range: ± 2 mmHg
Borderline zone: ± 2 beyond strict range (total ± 4)
```

| Actual PCO2 | Interpretation |
|---|---|
| Within strict range | Appropriate Compensation |
| Within borderline zone | Borderline — likely appropriate |
| Below borderline | Concurrent Respiratory Alkalosis |
| Above borderline | Concurrent Respiratory Acidosis |

**Source:** [LITFL — Metabolic Acidosis](https://litfl.com/metabolic-acidosis/)

#### Metabolic Alkalosis Compensation
```
Expected PCO2 = 0.7 × HCO3⁻ + 20 mmHg
Strict range: ± 5 mmHg
Borderline zone: ± 3 beyond strict (total ± 8)
```

**Source:** [Brandis/anaesthesiamcq](https://www.anaesthesiamcq.com)

#### Respiratory Acidosis — Acute vs Chronic
```
Acute expected HCO3⁻   = 24 + 1 × ((PCO2 − 40) / 10)     Tolerance: ± 4
Chronic expected HCO3⁻ = 24 + N × ((PCO2 − 40) / 10)     Tolerance: ± 4
```
Where N = `advancedSettings.chronRespAcid` (default 4.0, configurable 3.5)

**Acuity logic (lines 428–460):**
1. If HCO3 matches BOTH acute and chronic ranges AND acuity = "unknown" → prompt user to select
2. If user selected "chronic" and chronic matches → Chronic
3. If user selected "acute" and acute matches → Acute
4. If only chronic matches → Chronic
5. If only acute matches → Acute
6. HCO3 > chronic + 4 → Concurrent Metabolic Alkalosis
7. HCO3 < acute − 4 → Concurrent Metabolic Acidosis
8. Otherwise → Subacute

**Source:** [StatPearls](https://www.ncbi.nlm.nih.gov/books/NBK482430/) (4.0), [LITFL](https://litfl.com/respiratory-acidosis/) (3–4 range)

#### Respiratory Alkalosis — Acute vs Chronic
```
Acute expected HCO3⁻   = 24 − 2 × ((40 − PCO2) / 10)     Tolerance: ± 4
Chronic expected HCO3⁻ = 24 − 5 × ((40 − PCO2) / 10)     Tolerance: ± 4
```
Same acuity logic as respiratory acidosis.

**Source:** [LITFL — Respiratory Alkalosis](https://litfl.com/respiratory-alkalosis/)

### Step 4: Anion Gap (lines 538–580, conditional on Na⁺ and Cl⁻)

```
AG = Na⁺ − (Cl⁻ + HCO3⁻)
```

Normal range: 4–12 mmol/L (ion-selective electrode)

| AG | Interpretation |
|---|---|
| > 30 | HAGMA invariably present |
| 20–30 | Likely HAGMA |
| 12–20 | Mildly elevated, possible HAGMA |
| 4–12 | Normal |
| < 4 | Low (hypoalbuminemia, myeloma, lithium) |

#### Albumin-Corrected AG
```
Corrected AG = AG + 0.25 × (40 − albumin_g/L)
```
Every 1 g/L decrease in albumin decreases AG by 0.25. Critical in ICU patients.

**Source:** [LITFL — Anion Gap](https://litfl.com/anion-gap/)

### Step 5: Delta Ratio & Delta-Delta (lines 581–575, if HAGMA)

```
Delta Ratio = (AG − 12) / (24 − HCO3⁻)
Corrected HCO3⁻ (delta-delta) = HCO3⁻ + (AG − 12)
```

| Delta Ratio | Interpretation |
|---|---|
| < 0.4 | Pure NAGMA (hyperchloremic) |
| 0.4 – `drLower` | Combined HAGMA + NAGMA |
| `drLower` – 2.0 | See corrected HCO3 check below |
| > 2.0 | Pre-existing metabolic alkalosis or chronic resp acidosis |

Where `drLower` = `advancedSettings.drLower` (default 1.0, configurable to 0.8)

**When delta ratio is in the `drLower`–2.0 range, corrected HCO3⁻ is checked:**
- Corrected HCO3⁻ < 22 → HAGMA with concurrent NAGMA
- Corrected HCO3⁻ > 26 → Consider concurrent metabolic alkalosis (confirmed if > 28 AND deltaAG < 20)
- 22–26 → Pure/uncomplicated HAGMA

**Source:** [LITFL — Delta Ratio](https://litfl.com/delta-ratio/)

### Step 6: Oxygenation Assessment (lines ~594–660, if PaO2 provided and not VBG)

#### PaO2 Classification
| PaO2 | Status |
|---|---|
| < 60 | Severe Hypoxemia |
| 60–80 | Mild Hypoxemia |
| 80–100 | Normal |
| > 100 | Elevated |

#### A-a Gradient
```
PAO2 = FiO2 × (760 − 47) − (PCO2 / 0.8)
A-a Gradient = PAO2 − PaO2
```
Constants: Patm = 760 mmHg (sea level), PH2O = 47 mmHg, RQ = 0.8

Expected A-a gradient (configurable):
- **Linear formula:** 2.5 + 0.21 × age ([LITFL](https://litfl.com/a-a-gradient/))
- **Quarter formula:** (age + 10) / 4 ([StatPearls](https://www.ncbi.nlm.nih.gov/books/NBK545153/))

If FiO2 not provided, assumes 0.21 (room air).

#### P/F Ratio (if FiO2 provided)
```
P/F = PaO2 / FiO2
```

| P/F | ARDS Severity (Berlin 2012) |
|---|---|
| ≥ 400 | Normal |
| 300–399 | Mild impairment |
| 200–299 | Mild ARDS |
| 100–199 | Moderate ARDS |
| < 100 | Severe ARDS |

### Osmolar Gap (lines ~674–710, if Na⁺ + glucose + BUN + measured osm all provided)

```
Calculated Osm = 2 × Na⁺ + Glucose(mg/dL) / 18 + BUN(mg/dL) / 2.8
Osmolar Gap = Measured Osm − Calculated Osm
```

| Gap | Interpretation |
|---|---|
| ≤ 10 | Normal |
| > 10 | Elevated — consider toxic alcohols (methanol, ethylene glycol, propylene glycol) |

If partial data (missing glucose or BUN), prompts user to add missing values.

### "Refine Your Analysis" Prompts (lines ~712–730)

Context-aware suggestions shown when data is missing AND an abnormality is detected:
- No Na⁺/Cl⁻ + any disorder → suggest for anion gap
- HAGMA + no measured osm → suggest for osmolar gap
- Metabolic acidosis + no lactate → suggest lactate
- Metabolic acidosis + no glucose → suggest glucose
- Electrolytes + no albumin → suggest for corrected AG
- No PaO2 → suggest for oxygenation
- Never shown for normal ABG

---

## Summary Banner Construction (lines ~660–672)

```
allDisorders = deduplicated(primaryDisorders + additionalDisorders)
```

If HAGMA detected, replaces generic "Metabolic Acidosis" with "HAGMA (Metabolic Acidosis)" in the banner.

Deduplication uses `new Set()` to prevent duplicate entries (e.g., when both primary detection and compensation check identify Respiratory Acidosis).

---

## Differential Diagnosis System

### DDx Database (lines 253–330)

63 diagnoses across 5 categories:

| Category Key | Label | Count |
|---|---|---|
| `hagma` | High AG Metabolic Acidosis | 16 |
| `nagma` | Normal AG Metabolic Acidosis | 10 |
| `metAlk` | Metabolic Alkalosis | 10 |
| `respAcidosis` | Respiratory Acidosis | 14 |
| `respAlkalosis` | Respiratory Alkalosis | 13 |

Each entry has:
```javascript
{
  name: string,        // Display name
  detail: string,      // Clinical description
  tags: string[],      // Classification tags
  category: string,    // Subcategory for grouping
  clues: {             // Optional — maps to narrowing context
    renal: true,       // boolean clues
    potassium: 'high', // value clues ('high' or 'low')
    glucose: 'high',
    // ... etc
  }
}
```

HAGMA list covers full CATMUDPILES mnemonic:
C (CO/CN), A (alcoholic KA), T (toluene), M (methanol), U (uremia), D (DKA), P (propylene glycol), I (iron, isoniazid), L (lactic acidosis), E (ethylene glycol), S (salicylates)

### DDx Activation Logic (lines ~825–852)

DDx categories are activated based on detected disorders. Uses `addDDx()` helper with `Set`-based deduplication to prevent duplicate categories.

| Condition | DDx Shown |
|---|---|
| AG > 12 | `hagma` |
| Concurrent NAGMA OR (MetAcid + normal AG) OR (DR < drLower) | `nagma` |
| MetAcid + no electrolytes | Both `hagma` and `nagma` (with note to add Na/Cl) |
| MetAlkalosis (primary or concurrent) | `metAlk` |
| RespAcidosis (primary or from compensation) | `respAcidosis` |
| RespAlkalosis (primary or from compensation) | `respAlkalosis` |
| Normal pH + AG > 12 (hidden HAGMA) | `hagma` |

### Narrowing UI — Clinical Context Checkboxes (lines 855–877)

18 checkboxes and 1 numeric input:

| Checkbox ID | Label | DDx Entries It Highlights |
|---|---|---|
| `n-diarrhea` | Diarrhea | Diarrhea (NAGMA) |
| `n-vomiting` | Vomiting / NG suction | Vomiting (MetAlk) |
| `n-renal` | Renal disease | Uremia, RTA 1/2/4 |
| `n-dm` | Diabetes mellitus | DKA |
| `n-alcohol` | Alcohol use | Alcoholic KA |
| `n-sepsis` | Sepsis / infection | Pyroglutamic acid, Sepsis/SIRS, Pneumonia |
| `n-ingestion` | Ingestion / overdose | Salicylates, iron, isoniazid, toluene, CO/CN, opioids, salicylate (RespAlk), acetazolamide |
| `n-hypotension` | Hypotension / shock | Addison, Sepsis/SIRS |
| `n-htn` | Hypertension | Conn syndrome, Cushing |
| `n-surgery` | Recent surgery | D-lactic, fistulas, uretero-sigmoidostomy, PE |
| `n-pregnancy` | Pregnancy | Pregnancy (RespAlk) |
| `n-liver` | Liver disease | Hepatic encephalopathy |
| `n-lung` | COPD / asthma / lung disease | COPD, asthma, pneumonia, pulmonary edema/ARDS, asthma (RespAlk), pulmonary edema (RespAlk) |
| `n-neuro` | Neuromuscular disease | GBS, MG, muscular dystrophy |
| `n-ventilator` | Mechanical ventilation | Inadequate vent, over-ventilation |
| `n-trauma` | Trauma / head injury | Pneumothorax, CNS lesion, flail chest, head injury, pain |
| `n-anxiety` | Anxiety / pain | Anxiety/hyperventilation, pain |
| `n-obesity` | Obesity | Obesity hypoventilation |

Numeric: **K⁺ (mmol/L)** — highlights entries with `potassium: 'high'` (>5.5) or `potassium: 'low'` (<3.5)

Lab values pulled from main form: **Glucose** (mg/dL, from main input via `getGlucoseMGDL()`), **Osmolar gap** (calculated, from `window._calcOsmGap`), **Lactate** (mmol/L, from ABG values)

### Scoring Algorithm — `scoreDDx()` (lines ~984–1060)

Returns `{ score: number, reasons: [{dir: number, text: string}] }`.

Each matching signal adds or subtracts points:

| Signal | Points | Condition |
|---|---|---|
| Direct clue match (checkbox) | +2 | `ctx.X && clues.X` for: diarrhea, vomiting, renal, alcohol, dm, lung, neuro, ventilator, trauma, anxiety, obesity, ingestion, hypotension, pregnancy, liver |
| Hypertension match | +2 | `ctx.htn && clues.hypertension` |
| DM + high glucose clue | +2 | `ctx.dm && clues.glucose === 'high'` |
| Glucose > 250 mg/dL + high glucose clue | +2 | Numeric glucose check |
| Glucose < 90 + high glucose clue | −1 | Makes DKA less likely |
| Lactate > 2 mmol/L + lactatElevated clue | +2 | From ABG values |
| Lactate ≤ 2 + lactatElevated clue | −1 | Makes lactic acidosis less likely |
| Osmolar gap > 10 + osmolarGap clue | +2 | From calculated gap |
| Osmolar gap ≤ 10 + osmolarGap clue | −1 | Makes toxic alcohols less likely |
| K⁺ > 5.5 + potassium 'high' clue | +1 | Numeric K check |
| K⁺ < 3.5 + potassium 'low' clue | +1 | |
| K⁺ mismatch | −1 | High K but expected low, or vice versa |
| Cl⁻ > 106 + chloride 'high' clue | +1 | From ABG values |
| Tag-based: sepsis, ingestion, shock, liver, surgical | +1 to +2 | Matches item tags when no direct clue |

**Score → Display:**
- Score > 0 → **Likely** (green highlight, ✓)
- Score < 0 → **Unlikely** (faded, ✗)
- Score = 0 → Neutral

### DDx Sorting (within `renderDDxItems`)

Items are sorted within each disorder category:
1. **Likely** items → top (alphabetical)
2. **Neutral** items → middle (alphabetical)
3. **Unlikely** items → bottom (alphabetical)

Re-sorts instantly when checkboxes change.

### Manual Click States

`manualDDxStates` object tracks user-clicked items separately from auto-scoring:
- Click 1 → Likely (manual, persists through checkbox changes)
- Click 2 → Unlikely (manual, persists)
- Click 3 → Back to auto-scoring (removed from manual states)
- New interpretation (click Interpret) → resets all manual states

Auto-scored states (from checkboxes/scoring) refresh immediately when context changes. Manual states persist until explicitly cycled back.

---

## Advanced Settings (lines 8–105)

Collapsible panel with 3 configurable parameters:

| Setting | Key | Default | Alternative | Effect |
|---|---|---|---|---|
| Chronic Resp Acidosis HCO3 rise | `chronRespAcid` | 4.0 ([StatPearls](https://www.ncbi.nlm.nih.gov/books/NBK482430/)) | 3.5 ([LITFL](https://litfl.com/respiratory-acidosis/)) | Changes chronic expected HCO3 in resp acidosis compensation |
| Delta Ratio lower threshold | `drLower` | 1.0 ([LITFL](https://litfl.com/delta-ratio/)) | 0.8 ([StatPearls](https://www.ncbi.nlm.nih.gov/books/NBK539753/)) | Changes boundary between "combined HAGMA+NAGMA" and "pure HAGMA" |
| Expected A-a gradient formula | `aaFormula` | `'linear'`: 2.5 + 0.21 × age ([LITFL](https://litfl.com/a-a-gradient/)) | `'quarter'`: (age + 10) / 4 ([StatPearls](https://www.ncbi.nlm.nih.gov/books/NBK545153/)) | Changes expected A-a gradient calculation |

---

## Sharing & URL Params (lines ~1080–1130)

### Copy Link
Encodes all non-empty input values as URL query params:
```
?pH=7.22&pco2=30&hco3=12&na=131&cl=90
```
Includes `type=vbg` if VBG mode is active.

### Copy as Text
Extracts banner + analysis steps as plain text to clipboard.

### Load from URL
On page load, `loadFromURL()` reads URL params, populates inputs, auto-expands sections with data, and auto-interprets if pH+PCO2+HCO3 are present.

---

## Normal Reference Ranges

| Parameter | Normal Range | Source |
|---|---|---|
| pH | 7.35–7.45 | StatPearls, LITFL |
| PaCO2 | 35–45 mmHg | StatPearls, LITFL |
| HCO3⁻ | 22–26 mmol/L | LITFL |
| Na⁺ | 135–145 mmol/L | StatPearls |
| Cl⁻ | 98–106 mmol/L | StatPearls |
| Albumin | 3.5–5.0 g/dL | StatPearls |
| Lactate | < 2 mmol/L (< 18 mg/dL) | Surviving Sepsis Campaign |
| PaO2 | 80–100 mmHg | StatPearls |
| Glucose | 70–100 mg/dL (3.9–5.6 mmol/L) | ADA |
| BUN | 7–20 mg/dL | StatPearls |
| Osmolality | 275–295 mOsm/kg | StatPearls |
| Anion Gap | 4–12 mmol/L (ISE) | LITFL |

---

## UI Structure

### Input Card (single card, `#step-values`)
1. **Sample type toggle** — ABG / VBG (inline)
2. **Blood Gas** — pH, PCO2, HCO3⁻ (always visible)
3. **Electrolytes & Anion Gap** — Na⁺, Cl⁻, Albumin (collapsible)
4. **Oxygenation** — PaO2, FiO2, Age (collapsible)
5. **Additional Labs** — Lactate, Glucose, BUN, Measured Osm (collapsible)
6. **Clinical Onset** — Unknown / Acute / Chronic (slider, always visible)
7. **Interpret / Clear** buttons

Collapsible sections use CSS `max-height` transition. Auto-expand when URL params populate them.

### Results Card (`#results`)
1. Summary banner (color-coded: red=acidemia, purple=alkalemia, green=normal)
2. Calculated values grid (pH, PCO2, HCO3, AG, DR, Lactate, A-a, P/F, OsmGap)
3. Analysis steps (Step 1–5 + Oxygenation + Lactate + Osmolar Gap + Refine prompts)
4. DDx section (narrowing checkboxes + sorted diagnosis list)
5. Share buttons (Copy Link, Copy as Text)
6. References (LITFL links)

---

## CSS Architecture

### Theme (CSS custom properties in `:root`)
- Dark background: `#0f1117`
- Card: `#1a1d27`
- Accent: `#6c8cff` (blue)
- Status colors: green (`#4caf84`), red (`#e85d6f`), orange (`#e8a44c`), purple (`#a06ce8`), blue (`#4ca8e8`)
- Each color has a 12% opacity background variant

### Responsive breakpoints
- 600px: 2-column input grid, reduced padding
- 380px: 1-column input grid

### Key CSS classes
- `.finding-acidosis` / `.finding-alkalosis` / `.finding-normal` / `.finding-mixed` / `.finding-info` — colored inline badges
- `.val-high` / `.val-low` / `.val-normal` / `.val-warn` — calc grid value colors
- `.ddx-item.likely` — green background
- `.ddx-item.unlikely` — 35% opacity
- `.reason-for` / `.reason-against` — green/red scoring reason tags
- `.collapsible` / `.collapsible.open` — expandable input sections

---

## Reference Sources

All algorithms and thresholds are based on:

| Source | URL | Used For |
|---|---|---|
| LITFL — Acid-Base | https://litfl.com/acid-base/ | Overall approach |
| LITFL — ABG | https://litfl.com/arterial-blood-gas-abg/ | ABG fundamentals |
| LITFL — Metabolic Acidosis | https://litfl.com/metabolic-acidosis/ | Winter's formula, HAGMA DDx |
| LITFL — Metabolic Alkalosis | https://litfl.com/metabolic-alkalosis/ | Met alk compensation, DDx |
| LITFL — Respiratory Acidosis | https://litfl.com/respiratory-acidosis/ | Compensation rules, DDx |
| LITFL — Respiratory Alkalosis | https://litfl.com/respiratory-alkalosis/ | Compensation rules, DDx |
| LITFL — Anion Gap | https://litfl.com/anion-gap/ | AG formula, albumin correction |
| LITFL — Delta Ratio | https://litfl.com/delta-ratio/ | DR thresholds |
| LITFL — VBG vs ABG | https://litfl.com/vbg-versus-abg/ | VBG conversion factors |
| StatPearls — ABG | https://www.ncbi.nlm.nih.gov/books/NBK482430/ | Chronic resp acid (4.0), pH ranges |
| StatPearls — A-a Gradient | https://www.ncbi.nlm.nih.gov/books/NBK545153/ | (age+10)/4 formula |
| StatPearls — Delta Ratio | https://www.ncbi.nlm.nih.gov/books/NBK539753/ | DR 0.8 threshold |
| Berlin Definition (2012) | JAMA 2012;307(23):2526-33 | ARDS P/F ratio criteria |
| Surviving Sepsis Campaign | Critical Care Medicine 2021 | Lactate thresholds |

---

## Debugging Guide

### Common issues and where to look:

| Symptom | Likely Location | What to Check |
|---|---|---|
| Wrong primary disorder | Lines 308–357 | pH thresholds (7.35/7.45), PCO2 (35/45), HCO3 (22/26) |
| Wrong compensation | Lines 380–530 | Formula constants, borderline zones, acuity logic |
| DDx not showing | Lines 825–852 | `addDDx()` conditions, flag variables (`hasMetAcidosis` etc.) |
| DDx not highlighting | `scoreDDx()` (~984) | Check if item has `clues` property, check context key names |
| Checkbox has no effect | `refilterDDx()` (~898) | Verify checkbox ID matches context key |
| Unit conversion wrong | `getLactateMMOL()` / `getGlucoseMGDL()` | Check `unitState` and conversion factors |
| A-a gradient wrong | Lines ~602–627 | FiO2 default (0.21), constants (760, 47, 0.8) |
| Osmolar gap wrong | Lines ~674–710 | Formula: 2×Na + Glu/18 + BUN/2.8 |
| Banner duplicates | Line ~661 | `new Set()` deduplication |
| DDx duplicates | Lines ~825–840 | `ddxAdded` Set in `addDDx()` |
| Stale DDx click states | `manualDDxStates` object | Reset on new interpretation (line ~344) |
| URL sharing broken | Lines ~1080–1100 | Check field ID list matches HTML |

### To test a specific case without the browser:
```bash
node -e "
// 1. Extract DDX from interpreter.js
// 2. Call the pure functions with test values
// 3. Check outputs

// Example: Is AG=20 with HCO3=10 classified as HAGMA+NAGMA?
const ag = 20, hco3 = 10, drLower = 1.0;
const dr = (ag - 12) / (24 - hco3);  // = 0.57
console.log('DR:', dr, dr < drLower ? 'HAGMA+NAGMA' : 'Pure HAGMA');
"
```

### Key global state variables:
- `sampleType` — 'abg' or 'vbg'
- `advancedSettings` — {chronRespAcid, drLower, aaFormula}
- `unitState` — {lactate, glucose} each 'mgdl' or 'mmol'
- `manualDDxStates` — {id: 'likely'|'unlikely'} for user-clicked DDx items
- `window._activeDDx` — current active DDx categories
- `window._abgValues` — current interpreted values
- `window._calcOsmGap` — calculated osmolar gap (NaN if not calculated)
