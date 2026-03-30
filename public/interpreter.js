// ============================================================
//  ABG / VBG Interpreter — Clinical Logic
//  Based on LITFL Acid-Base resources (litfl.com/acid-base/)
// ============================================================

let sampleType = 'abg';

// ---- Advanced settings (configurable clinical parameters) ----
let advancedSettings = {
    chronRespAcid: 4.0,    // default: StatPearls (updated from 3.5)
    drLower: 1.0,          // default: LITFL (updated from 0.8)
    aaFormula: 'linear',   // default: 2.5 + 0.21 * age
};

// ---- Unit toggle state ----
let unitState = {
    lactate: 'mmol',   // 'mgdl' (left) or 'mmol' (right)
    glucose: 'mgdl',   // 'mgdl' (left) or 'mmol' (right)
};

function setUnit(field, unit) {
    const range = document.getElementById(field + '-range');
    const input = document.getElementById(field);
    const slider = document.getElementById(field + '-slider');
    const currentVal = parseFloat(input.value);
    const oldUnit = unitState[field];

    if (oldUnit === unit) return;  // no change
    unitState[field] = unit;

    // Update slider visual
    const opts = slider.querySelectorAll('.unit-opt');
    opts.forEach(o => o.classList.remove('active'));

    // Both fields: mg/dL = left (pos 0), mmol/L = right (pos 1)
    if (unit === 'mgdl') {
        slider.setAttribute('data-pos', '0');
        opts[0].classList.add('active');
        if (field === 'lactate') {
            range.innerHTML = '&lt; 18';
            if (!isNaN(currentVal) && oldUnit === 'mmol') input.value = (currentVal * 9.01).toFixed(1);
            input.step = '1';
        } else {
            range.innerHTML = '70 &ndash; 100';
            if (!isNaN(currentVal) && oldUnit === 'mmol') input.value = (currentVal * 18.02).toFixed(0);
            input.step = '1';
        }
    } else {
        slider.setAttribute('data-pos', '1');
        opts[1].classList.add('active');
        if (field === 'lactate') {
            range.innerHTML = '&lt; 2';
            if (!isNaN(currentVal) && oldUnit === 'mgdl') input.value = (currentVal / 9.01).toFixed(1);
            input.step = '0.1';
        } else {
            range.innerHTML = '3.9 &ndash; 5.6';
            if (!isNaN(currentVal) && oldUnit === 'mgdl') input.value = (currentVal / 18.02).toFixed(1);
            input.step = '0.1';
        }
    }
}

// Convert input to internal units (lactate → mmol/L, glucose → mg/dL)
function getLactateMMOL() {
    const val = parseFloat(document.getElementById('lactate').value);
    if (isNaN(val)) return NaN;
    return unitState.lactate === 'mgdl' ? val / 9.01 : val;
}

function getGlucoseMGDL() {
    const val = parseFloat(document.getElementById('glucose').value);
    if (isNaN(val)) return NaN;
    return unitState.glucose === 'mmol' ? val * 18.02 : val;
}

// ---- Acuity slider ----
function setAcuity(value) {
    document.getElementById('acuity').value = value;
    document.querySelectorAll('.acuity-option').forEach(b => b.classList.remove('active'));
    const active = document.querySelector(`.acuity-option[data-acuity="${value}"]`);
    if (active) active.classList.add('active');
    const posMap = { unknown: '0', acute: '1', chronic: '2' };
    const slider = document.getElementById('acuity-slider');
    if (slider) slider.setAttribute('data-pos', posMap[value] || '0');
}

function toggleSection(id) {
    document.getElementById(id).classList.toggle('open');
}

function toggleAdvanced() {
    const panel = document.getElementById('advanced-panel');
    const arrow = document.getElementById('adv-arrow');
    panel.classList.toggle('hidden');
    arrow.classList.toggle('open');
}

function updateAdvanced() {
    const chronEl = document.querySelector('input[name="chronRespAcid"]:checked');
    const drEl = document.querySelector('input[name="drLower"]:checked');
    const aaEl = document.querySelector('input[name="aaFormula"]:checked');
    if (chronEl) advancedSettings.chronRespAcid = parseFloat(chronEl.value);
    if (drEl) advancedSettings.drLower = parseFloat(drEl.value);
    if (aaEl) advancedSettings.aaFormula = aaEl.value;
}

function setSampleType(type) {
    sampleType = type;
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-sample="${type}"]`).classList.add('active');
    document.getElementById('vbg-note').classList.toggle('hidden', type === 'abg');
    document.getElementById('pco2-label').textContent = type === 'abg' ? 'PaCO2 (mmHg)' : 'PvCO2 (mmHg)';
    document.getElementById('po2-label').textContent = type === 'abg' ? 'PaO2 (mmHg)' : 'PvO2 (mmHg)';
}

// ---- Value getters with VBG conversion ----
// Input units: albumin in g/dL, lactate in mmol/L
// Internal units: albumin in g/L (for AG correction), lactate in mmol/L
function getValues() {
    const albInput = parseFloat(document.getElementById('albumin').value);   // g/dL

    const raw = {
        pH: parseFloat(document.getElementById('pH').value),
        pco2: parseFloat(document.getElementById('pco2').value),
        hco3: parseFloat(document.getElementById('hco3').value),
        na: parseFloat(document.getElementById('na').value),
        cl: parseFloat(document.getElementById('cl').value),
        albumin: isNaN(albInput) ? NaN : albInput * 10,        // g/dL → g/L
        albumin_display: albInput,                               // keep original for display
        lactate: getLactateMMOL(),                               // always mmol/L internally
        po2: parseFloat(document.getElementById('po2').value),
        fio2: parseFloat(document.getElementById('fio2').value),
        age: parseFloat(document.getElementById('age').value),
        acuity: document.getElementById('acuity').value,  // 'unknown', 'acute', 'chronic'
        glucose: getGlucoseMGDL(),                               // always mg/dL internally
        bun: parseFloat(document.getElementById('bun').value),               // mg/dL
        measOsm: parseFloat(document.getElementById('measOsm').value),       // mOsm/kg
    };

    // Convert VBG → arterial-equivalent values
    if (sampleType === 'vbg') {
        return {
            pH: isNaN(raw.pH) ? NaN : raw.pH + 0.035,
            pco2: isNaN(raw.pco2) ? NaN : raw.pco2 - 5.7,
            hco3: raw.hco3,
            na: raw.na,
            cl: raw.cl,
            albumin: raw.albumin,
            albumin_display: raw.albumin_display,
            lactate: raw.lactate,
            po2: NaN,
            fio2: raw.fio2,
            age: raw.age,
            acuity: raw.acuity,
            glucose: raw.glucose,
            bun: raw.bun,
            measOsm: raw.measOsm,
            rawPH: raw.pH,
            rawPCO2: raw.pco2,
            isVBG: true,
        };
    }
    return { ...raw, isVBG: false };
}

// ---- Clear all inputs ----
function clearAll() {
    ['pH', 'pco2', 'hco3', 'na', 'cl', 'albumin', 'lactate', 'po2', 'fio2', 'age', 'glucose', 'bun', 'measOsm'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('results').classList.add('hidden');
    setSampleType('abg');
    setAcuity('unknown');
    // Reset unit toggles to defaults (mg/dL for both)
    if (unitState.lactate !== 'mgdl') setUnit('lactate', 'mgdl');
    if (unitState.glucose !== 'mgdl') setUnit('glucose', 'mgdl');
    // Collapse all sections
    document.querySelectorAll('.collapsible.open').forEach(el => el.classList.remove('open'));
}

// ---- Validation ----
function validate(v) {
    const errors = [];
    if (isNaN(v.pH)) errors.push('pH is required');
    if (isNaN(v.pco2)) errors.push('PCO2 is required');
    if (isNaN(v.hco3)) errors.push('HCO3⁻ is required');
    // Na+ and Cl- are optional — needed only for anion gap analysis
    return errors;
}

// ---- Physiological plausibility & consistency warnings ----
function getWarnings(v) {
    const warnings = [];
    if (!isNaN(v.pH) && (v.pH < 6.8 || v.pH > 7.8))
        warnings.push(`pH ${v.pH.toFixed(2)} is extreme — please verify the value`);
    if (!isNaN(v.pco2) && (v.pco2 < 10 || v.pco2 > 120))
        warnings.push(`PCO2 ${v.pco2.toFixed(0)} mmHg is extreme — please verify`);
    if (!isNaN(v.hco3) && (v.hco3 < 3 || v.hco3 > 50))
        warnings.push(`HCO3⁻ ${v.hco3.toFixed(1)} is extreme — please verify`);
    // Henderson-Hasselbalch consistency check
    if (!isNaN(v.pH) && !isNaN(v.pco2) && !isNaN(v.hco3) && v.pco2 > 0) {
        const calcPH = 6.1 + Math.log10(v.hco3 / (0.03 * v.pco2));
        if (Math.abs(calcPH - v.pH) > 0.15)
            warnings.push(`Values may be internally inconsistent (calculated pH ${calcPH.toFixed(2)} vs entered ${v.pH.toFixed(2)}) — check for transcription error`);
    }
    return warnings;
}

// ---- Core calculations ----
function calcAnionGap(na, cl, hco3) {
    return na - (cl + hco3);
}

function calcCorrectedAG(ag, albumin) {
    if (isNaN(albumin)) return ag;                          // no correction
    return ag + 0.25 * (40 - albumin);
}

function calcDeltaRatio(ag, hco3, normalAG) {
    const deltaAG = ag - normalAG;
    const deltaHCO3 = 24 - hco3;
    if (deltaHCO3 <= 0) return Infinity;
    return deltaAG / deltaHCO3;
}

function wintersFormula(hco3) {
    const expected = 1.5 * hco3 + 8;
    return { expected, low: expected - 2, high: expected + 2 };
}

function metAlkCompensation(hco3) {
    const expected = 0.7 * hco3 + 20;
    return { expected, low: expected - 5, high: expected + 5 };
}

function acuteRespAcidosisHCO3(pco2) {
    return 24 + 1 * ((pco2 - 40) / 10);
}

function chronicRespAcidosisHCO3(pco2) {
    return 24 + advancedSettings.chronRespAcid * ((pco2 - 40) / 10);
}

function acuteRespAlkalosisHCO3(pco2) {
    return 24 - 2 * ((40 - pco2) / 10);
}

function chronicRespAlkalosisHCO3(pco2) {
    return 24 - 5 * ((40 - pco2) / 10);
}

// ---- Differential Diagnosis Database ----
const DDX = {
    hagma: [
        { name: 'Lactic Acidosis', detail: 'Tissue hypoxia, sepsis, shock, seizures, liver failure, metformin, linezolid', tags: ['lactate', 'shock', 'sepsis'], category: 'Endogenous Acids', clues: { lactatElevated: true } },
        { name: 'Diabetic Ketoacidosis (DKA)', detail: 'Type 1 (or 2) DM, hyperglycemia, ketonemia, ketonuria', tags: ['ketones', 'glucose', 'DM'], category: 'Endogenous Acids', clues: { glucose: 'high', dm: true } },
        { name: 'Alcoholic Ketoacidosis', detail: 'Chronic alcohol use, recent binge + poor intake, low/normal glucose', tags: ['ketones', 'alcohol'], category: 'Endogenous Acids', clues: { alcohol: true } },
        { name: 'Starvation Ketoacidosis', detail: 'Prolonged fasting, usually mild', tags: ['ketones'], category: 'Endogenous Acids' },
        { name: 'Uremia (Renal Failure)', detail: 'Elevated BUN/creatinine, CKD or AKI', tags: ['renal'], category: 'Endogenous Acids', clues: { renal: true } },
        { name: 'Methanol Poisoning', detail: 'Visual disturbance, elevated osmolar gap, formate accumulation', tags: ['toxic alcohol', 'osmolar gap'], category: 'Toxins', clues: { osmolarGap: true } },
        { name: 'Ethylene Glycol Poisoning', detail: 'Calcium oxalate crystals in urine, AKI, elevated osmolar gap', tags: ['toxic alcohol', 'osmolar gap'], category: 'Toxins', clues: { osmolarGap: true } },
        { name: 'Salicylate Toxicity', detail: 'Tinnitus, mixed respiratory alkalosis + HAGMA, often early hyperventilation', tags: ['drug', 'mixed disorder'], category: 'Toxins', clues: { ingestion: true } },
        { name: 'Pyroglutamic Acidosis (5-oxoproline)', detail: 'Chronic paracetamol use + sepsis/malnutrition/renal impairment', tags: ['drug', 'paracetamol'], category: 'Toxins', clues: { ingestion: true, sepsis: true } },
        { name: 'Metformin-associated Lactic Acidosis', detail: 'Metformin + renal impairment, lactic acidosis', tags: ['drug', 'lactate', 'renal'], category: 'Toxins', clues: { lactatElevated: true } },
        { name: 'Iron Poisoning', detail: 'Direct GI mucosal injury, mitochondrial toxin', tags: ['drug', 'ingestion'], category: 'Toxins', clues: { ingestion: true } },
        { name: 'Isoniazid Toxicity', detail: 'Seizures, lactic acidosis', tags: ['drug', 'seizures'], category: 'Toxins', clues: { ingestion: true, lactatElevated: true } },
        { name: 'Propylene Glycol Toxicity', detail: 'IV lorazepam or other vehicle, elevated osmolar gap', tags: ['drug', 'osmolar gap'], category: 'Toxins', clues: { osmolarGap: true } },
        { name: 'Toluene Inhalation', detail: 'Can cause HAGMA or NAGMA (distal RTA)', tags: ['inhalant'], category: 'Toxins', clues: { ingestion: true } },
        { name: 'Carbon Monoxide / Cyanide', detail: 'Fire/smoke inhalation, cherry-red skin (CO), lactic acidosis', tags: ['inhalation', 'lactate'], category: 'Toxins', clues: { lactatElevated: true, ingestion: true } },
        { name: 'D-Lactic Acidosis', detail: 'Short bowel syndrome, bacterial overgrowth', tags: ['lactate', 'GI'], category: 'Endogenous Acids', clues: { surgery: true } },
    ],
    nagma: [
        { name: 'Diarrhea (GI HCO3⁻ Loss)', detail: 'Most common cause; large volume watery stool', tags: ['GI', 'HCO3 loss'], category: 'GI Losses', clues: { diarrhea: true } },
        { name: 'Pancreatic / Biliary / Small Bowel Fistula', detail: 'Surgical patients, drainage of alkaline fluids', tags: ['GI', 'HCO3 loss', 'surgical'], category: 'GI Losses', clues: { surgery: true } },
        { name: 'Uretero-sigmoidostomy', detail: 'Urinary diversion → colonic Cl⁻/HCO3⁻ exchange', tags: ['GI', 'surgical'], category: 'GI Losses', clues: { surgery: true } },
        { name: 'Renal Tubular Acidosis Type 1 (Distal)', detail: 'Unable to acidify urine, urine pH > 5.5, hypokalemia, nephrocalcinosis', tags: ['renal', 'RTA'], category: 'Renal', clues: { renal: true } },
        { name: 'Renal Tubular Acidosis Type 2 (Proximal)', detail: 'Impaired proximal HCO3⁻ reabsorption, Fanconi syndrome', tags: ['renal', 'RTA'], category: 'Renal', clues: { renal: true } },
        { name: 'Renal Tubular Acidosis Type 4', detail: 'Hypoaldosteronism, hyperkalemia, diabetic nephropathy, ACEi/ARB/K-sparing diuretics', tags: ['renal', 'RTA', 'hyperkalemia'], category: 'Renal', clues: { renal: true, potassium: 'high' } },
        { name: 'Acetazolamide', detail: 'Carbonic anhydrase inhibitor → renal HCO3⁻ wasting', tags: ['drug', 'renal'], category: 'Drugs', clues: { ingestion: true } },
        { name: 'Normal Saline Excess', detail: 'Large-volume NS resuscitation → dilutional / hyperchloremic acidosis', tags: ['iatrogenic', 'chloride'], category: 'Iatrogenic', clues: { chloride: 'high' } },
        { name: 'Addison Disease', detail: 'Adrenal insufficiency → reduced aldosterone → type 4 RTA picture', tags: ['endocrine', 'hyperkalemia'], category: 'Endocrine', clues: { potassium: 'high', hypotension: true } },
        { name: 'Ammonium Chloride / HCl infusion', detail: 'Exogenous acid load', tags: ['iatrogenic'], category: 'Iatrogenic' },
    ],
    metAlk: [
        { name: 'Vomiting / NG Suction', detail: 'Loss of gastric HCl → Cl⁻ depletion; urine Cl⁻ < 10', tags: ['GI', 'chloride-responsive'], category: 'Chloride-Responsive (UCl < 10)', clues: { vomiting: true } },
        { name: 'Diuretics (Loop / Thiazide)', detail: 'Contraction alkalosis, Cl⁻/K⁺ depletion; urine Cl⁻ variable (low if prior use, high if current)', tags: ['drug', 'K depletion'], category: 'Chloride-Responsive (UCl < 10)', clues: { potassium: 'low' } },
        { name: 'Post-hypercapnic Alkalosis', detail: 'After correction of chronic respiratory acidosis; elevated HCO3⁻ persists', tags: ['post-respiratory'], category: 'Chloride-Responsive (UCl < 10)' },
        { name: 'Primary Hyperaldosteronism (Conn)', detail: 'Hypertension, hypokalemia, urine Cl⁻ > 20', tags: ['endocrine', 'chloride-resistant', 'HTN'], category: 'Chloride-Resistant (UCl > 20)', clues: { potassium: 'low', hypertension: true } },
        { name: 'Cushing Syndrome', detail: 'Excess glucocorticoids with mineralocorticoid activity', tags: ['endocrine', 'chloride-resistant'], category: 'Chloride-Resistant (UCl > 20)', clues: { hypertension: true, potassium: 'low' } },
        { name: 'Bartter Syndrome', detail: 'Autosomal recessive, mimics loop diuretic; normotensive', tags: ['genetic', 'chloride-resistant'], category: 'Chloride-Resistant (UCl > 20)' },
        { name: 'Gitelman Syndrome', detail: 'Autosomal recessive, mimics thiazide; normotensive', tags: ['genetic', 'chloride-resistant'], category: 'Chloride-Resistant (UCl > 20)' },
        { name: 'Severe K⁺ Depletion (< 2 mmol/L)', detail: 'Any cause of profound hypokalemia', tags: ['K depletion', 'chloride-resistant'], category: 'Chloride-Resistant (UCl > 20)', clues: { potassium: 'low' } },
        { name: 'Exogenous Alkali (NaHCO3, Citrate)', detail: 'IV NaHCO3, massive blood transfusion (citrate → HCO3⁻)', tags: ['iatrogenic'], category: 'Exogenous' },
        { name: 'Milk-Alkali Syndrome', detail: 'Excess calcium + alkali intake', tags: ['ingestion'], category: 'Exogenous' },
    ],
    respAcidosis: [
        { name: 'COPD (Acute Exacerbation)', detail: 'Most common cause of chronic respiratory acidosis', tags: ['airway', 'chronic'], category: 'Airway / Lung', clues: { lung: true } },
        { name: 'Severe Asthma', detail: 'Near-fatal asthma with respiratory muscle fatigue', tags: ['airway', 'acute'], category: 'Airway / Lung', clues: { lung: true } },
        { name: 'Pneumonia', detail: 'Severe pneumonia with V/Q mismatch and hypoventilation', tags: ['infection', 'acute'], category: 'Airway / Lung', clues: { sepsis: true, lung: true } },
        { name: 'Pulmonary Edema / ARDS', detail: 'Reduced compliance, increased dead space', tags: ['acute'], category: 'Airway / Lung', clues: { lung: true } },
        { name: 'Pneumothorax', detail: 'Tension pneumothorax → decreased ventilation', tags: ['acute', 'emergency'], category: 'Airway / Lung', clues: { trauma: true } },
        { name: 'Airway Obstruction', detail: 'Foreign body, laryngospasm, angioedema', tags: ['acute', 'emergency'], category: 'Airway / Lung' },
        { name: 'Opioid / Sedative Overdose', detail: 'Central respiratory depression', tags: ['drug', 'CNS'], category: 'CNS / Neuromuscular', clues: { ingestion: true } },
        { name: 'CNS Lesion (Stroke, Trauma)', detail: 'Brainstem respiratory center dysfunction', tags: ['CNS', 'acute'], category: 'CNS / Neuromuscular', clues: { trauma: true } },
        { name: 'Guillain-Barré Syndrome', detail: 'Ascending paralysis → diaphragmatic weakness', tags: ['neuromuscular'], category: 'CNS / Neuromuscular', clues: { neuro: true } },
        { name: 'Myasthenia Gravis (Crisis)', detail: 'Neuromuscular junction failure', tags: ['neuromuscular'], category: 'CNS / Neuromuscular', clues: { neuro: true } },
        { name: 'Muscular Dystrophy', detail: 'Chronic respiratory muscle weakness', tags: ['neuromuscular', 'chronic'], category: 'CNS / Neuromuscular', clues: { neuro: true } },
        { name: 'Chest Wall Defect / Flail Chest', detail: 'Trauma, kyphoscoliosis', tags: ['mechanical'], category: 'Mechanical', clues: { trauma: true } },
        { name: 'Obesity Hypoventilation (Pickwickian)', detail: 'Morbid obesity → chronic hypoventilation', tags: ['chronic', 'obesity'], category: 'Mechanical', clues: { obesity: true } },
        { name: 'Inadequate Mechanical Ventilation', detail: 'Low tidal volume / rate on ventilator', tags: ['iatrogenic'], category: 'Iatrogenic', clues: { ventilator: true } },
    ],
    respAlkalosis: [
        { name: 'Anxiety / Hyperventilation Syndrome', detail: 'Psychogenic hyperventilation, perioral tingling, carpopedal spasm', tags: ['psychogenic', 'common'], category: 'Central', clues: { anxiety: true } },
        { name: 'Pain', detail: 'Stimulates respiratory center', tags: ['central'], category: 'Central', clues: { anxiety: true, trauma: true } },
        { name: 'Sepsis / SIRS', detail: 'Cytokine-driven central hyperventilation; often early sign', tags: ['infection', 'acute'], category: 'Central', clues: { sepsis: true, hypotension: true } },
        { name: 'Salicylate Toxicity', detail: 'Direct respiratory center stimulation; may coexist with HAGMA', tags: ['drug', 'mixed'], category: 'Central', clues: { ingestion: true } },
        { name: 'Hepatic Encephalopathy / Liver Failure', detail: 'Progesterone-like substances and toxins stimulate ventilation', tags: ['liver'], category: 'Central', clues: { liver: true } },
        { name: 'Pregnancy', detail: 'Progesterone-mediated chronic respiratory alkalosis', tags: ['physiologic', 'chronic'], category: 'Central', clues: { pregnancy: true } },
        { name: 'Head Injury / Stroke', detail: 'Central neurogenic hyperventilation', tags: ['CNS'], category: 'Central', clues: { trauma: true } },
        { name: 'Pulmonary Embolism', detail: 'V/Q mismatch → hypoxemia → hyperventilation', tags: ['pulmonary', 'acute'], category: 'Pulmonary', clues: { surgery: true } },
        { name: 'Pneumonia', detail: 'Intrapulmonary receptor stimulation', tags: ['pulmonary', 'infection'], category: 'Pulmonary', clues: { sepsis: true, lung: true } },
        { name: 'Asthma (Early/Mild)', detail: 'Hyperventilation with air trapping', tags: ['pulmonary'], category: 'Pulmonary', clues: { lung: true } },
        { name: 'Pulmonary Edema', detail: 'J-receptor stimulation', tags: ['pulmonary'], category: 'Pulmonary', clues: { lung: true } },
        { name: 'High Altitude', detail: 'Hypoxemia-driven hyperventilation', tags: ['physiologic'], category: 'Environmental' },
        { name: 'Mechanical Over-ventilation', detail: 'Excessive minute ventilation on ventilator', tags: ['iatrogenic'], category: 'Iatrogenic', clues: { ventilator: true } },
    ],
};

// ---- Main Interpretation ----
function interpret() {
    const v = getValues();
    const errors = validate(v);
    if (errors.length) {
        alert('Please enter: ' + errors.join(', '));
        return;
    }

    const results = document.getElementById('results');
    results.classList.remove('hidden');
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });

    window._calcOsmGap = NaN;
    manualDDxStates = {};  // reset manual clicks on new interpretation

    // Show warnings if any
    const warnings = getWarnings(v);
    let warningDiv = document.getElementById('warnings');
    if (!warningDiv) {
        warningDiv = document.createElement('div');
        warningDiv.id = 'warnings';
        results.insertBefore(warningDiv, results.firstChild.nextSibling);
    }
    if (warnings.length) {
        warningDiv.className = 'warning-box';
        warningDiv.innerHTML = warnings.map(w => `<p>&#9888; ${w}</p>`).join('');
    } else {
        warningDiv.className = 'hidden';
        warningDiv.innerHTML = '';
    }

    const { pH, pco2, hco3, na, cl, albumin, lactate, po2 } = v;

    // ---- Calculated values ----
    const hasElectrolytes = !isNaN(na) && !isNaN(cl);
    const ag = hasElectrolytes ? calcAnionGap(na, cl, hco3) : NaN;
    const agCorrected = hasElectrolytes ? calcCorrectedAG(ag, albumin) : NaN;
    const useAG = hasElectrolytes ? (!isNaN(albumin) ? agCorrected : ag) : NaN;
    const normalAG = 12;

    const disorders = [];
    const steps = [];

    // ---- Step 1: pH Assessment ----
    let phStatus, bannerClass;
    if (pH < 7.35) {
        phStatus = 'Acidemia';
        bannerClass = 'banner-acidemia';
    } else if (pH > 7.45) {
        phStatus = 'Alkalemia';
        bannerClass = 'banner-alkalemia';
    } else {
        phStatus = 'Normal pH';
        bannerClass = 'banner-normal';
    }

    // ---- Step 2: Primary Disorder ----
    let primary = '';
    let primaryDisorders = [];

    if (pH < 7.35) {
        if (pco2 > 45) primaryDisorders.push('Respiratory Acidosis');
        if (hco3 < 22) primaryDisorders.push('Metabolic Acidosis');
        if (primaryDisorders.length === 0) {
            // borderline — decide by dominance
            if (pco2 > 40) primaryDisorders.push('Respiratory Acidosis');
            else primaryDisorders.push('Metabolic Acidosis');
        }
    } else if (pH > 7.45) {
        if (pco2 < 35) primaryDisorders.push('Respiratory Alkalosis');
        if (hco3 > 26) primaryDisorders.push('Metabolic Alkalosis');
        if (primaryDisorders.length === 0) {
            if (pco2 < 40) primaryDisorders.push('Respiratory Alkalosis');
            else primaryDisorders.push('Metabolic Alkalosis');
        }
    } else {
        // Normal pH — could be normal or mixed/compensated
        if (pco2 > 45 && hco3 > 26) {
            primaryDisorders.push('Compensated Respiratory Acidosis or Metabolic Alkalosis');
        } else if (pco2 < 35 && hco3 < 22) {
            primaryDisorders.push('Compensated Respiratory Alkalosis or Metabolic Acidosis');
        } else if (pco2 > 45) {
            primaryDisorders.push('Compensated Respiratory Acidosis');
        } else if (pco2 < 35) {
            primaryDisorders.push('Compensated Respiratory Alkalosis');
        } else if (hco3 > 26) {
            primaryDisorders.push('Compensated Metabolic Alkalosis');
        } else if (hco3 < 22) {
            primaryDisorders.push('Compensated Metabolic Acidosis');
        }
        // else: all values normal — primaryDisorders stays empty
    }

    // Handle truly normal ABG
    let isNormalABG = false;
    if (primaryDisorders.length === 0 && pH >= 7.35 && pH <= 7.45 && pco2 >= 35 && pco2 <= 45 && hco3 >= 22 && hco3 <= 26) {
        isNormalABG = true;
        phStatus = 'Normal Acid-Base Status';
    }

    primary = primaryDisorders.join(' + ');

    steps.push({
        title: 'Step 1: Assess pH',
        html: `<p>pH = <strong>${pH.toFixed(2)}</strong> → <span class="finding ${pH < 7.35 ? 'finding-acidosis' : pH > 7.45 ? 'finding-alkalosis' : 'finding-normal'}">${phStatus}</span></p>`
    });

    steps.push({
        title: 'Step 2: Identify Primary Disorder',
        html: `<p>PaCO2 = <strong>${pco2.toFixed(1)}</strong> mmHg &nbsp;|&nbsp; HCO3⁻ = <strong>${hco3.toFixed(1)}</strong> mmol/L</p>
               ${isNormalABG ? '<p><span class="finding finding-normal">No acid-base disorder identified</span></p>' :
               primaryDisorders.length === 0 ? '<p><span class="finding finding-normal">Normal acid-base status</span></p>' :
               '<p>Primary: ' + primaryDisorders.map(d => `<span class="finding ${d.includes('Acidosis') ? 'finding-acidosis' : d.includes('Alkalosis') ? 'finding-alkalosis' : 'finding-info'}">${d}</span>`).join(' ') + '</p>'
               }${primaryDisorders.some(d => d.startsWith('Compensated') && d.includes(' or ')) ? '<p class="calc-note" style="color:var(--text-muted)">Cannot distinguish primary from ABG alone — clinical context needed</p>' : ''}`
    });

    // ---- Step 3: Compensation ----
    let compensationHTML = '';
    let additionalDisorders = [];

    // For combined "X or Y" entries, both flags get set so both DDx show, but compensation is skipped
    const isAmbiguousCompensated = primaryDisorders.some(d => d.startsWith('Compensated') && d.includes(' or '));
    const hasMetAcidosis = primaryDisorders.some(d => d.includes('Metabolic Acidosis'));
    const hasMetAlkalosis = primaryDisorders.some(d => d.includes('Metabolic Alkalosis'));
    const hasRespAcidosis = primaryDisorders.some(d => d.includes('Respiratory Acidosis'));
    const hasRespAlkalosis = primaryDisorders.some(d => d.includes('Respiratory Alkalosis'));

    if (isAmbiguousCompensated) {
        compensationHTML += '<p class="calc-note" style="color:var(--text-muted)">Compensation analysis deferred — cannot determine primary disorder from ABG alone. Review clinical history to distinguish.</p>';
    }

    if (hasMetAcidosis && !isAmbiguousCompensated) {
        const w = wintersFormula(hco3);
        compensationHTML += `<p><strong>Winter's Formula:</strong></p>
            <span class="formula">Expected PaCO2 = 1.5 × ${hco3.toFixed(1)} + 8 = ${w.expected.toFixed(1)} mmHg (range ${w.low.toFixed(1)}–${w.high.toFixed(1)})</span>
            <p>Actual PaCO2 = ${pco2.toFixed(1)} mmHg → `;
        if (pco2 < w.low - 2) {
            compensationHTML += '<span class="finding finding-alkalosis">Concurrent Respiratory Alkalosis</span>';
            additionalDisorders.push('Respiratory Alkalosis');
        } else if (pco2 < w.low) {
            compensationHTML += '<span class="finding finding-normal">Borderline — likely appropriate compensation</span>';
        } else if (pco2 > w.high + 2) {
            compensationHTML += '<span class="finding finding-acidosis">Concurrent Respiratory Acidosis</span>';
            additionalDisorders.push('Respiratory Acidosis');
        } else if (pco2 > w.high) {
            compensationHTML += '<span class="finding finding-normal">Borderline — likely appropriate compensation</span>';
        } else {
            compensationHTML += '<span class="finding finding-normal">Appropriate Compensation</span>';
        }
        compensationHTML += '</p>';
    }

    if (hasMetAlkalosis && !isAmbiguousCompensated) {
        const comp = metAlkCompensation(hco3);
        compensationHTML += `<p><strong>Metabolic Alkalosis Compensation:</strong></p>
            <span class="formula">Expected PaCO2 = 0.7 × ${hco3.toFixed(1)} + 20 = ${comp.expected.toFixed(1)} mmHg (range ${comp.low.toFixed(1)}–${comp.high.toFixed(1)})</span>
            <p>Actual PaCO2 = ${pco2.toFixed(1)} mmHg → `;
        if (pco2 > comp.high + 3) {
            compensationHTML += '<span class="finding finding-acidosis">Concurrent Respiratory Acidosis</span>';
            additionalDisorders.push('Respiratory Acidosis');
        } else if (pco2 > comp.high) {
            compensationHTML += '<span class="finding finding-normal">Borderline — likely appropriate compensation</span>';
        } else if (pco2 < comp.low - 3) {
            compensationHTML += '<span class="finding finding-alkalosis">Concurrent Respiratory Alkalosis</span>';
            additionalDisorders.push('Respiratory Alkalosis');
        } else if (pco2 < comp.low) {
            compensationHTML += '<span class="finding finding-normal">Borderline — likely appropriate compensation</span>';
        } else {
            compensationHTML += '<span class="finding finding-normal">Appropriate Compensation</span>';
        }
        compensationHTML += '</p>';
    }

    if (hasRespAcidosis && !isAmbiguousCompensated) {
        const acuteExp = acuteRespAcidosisHCO3(pco2);
        const chronicExp = chronicRespAcidosisHCO3(pco2);
        const acuity = v.acuity || 'unknown';
        const matchAcute = Math.abs(hco3 - acuteExp) <= 4;
        const matchChronic = Math.abs(hco3 - chronicExp) <= 4;

        compensationHTML += `<p><strong>Respiratory Acidosis Compensation:</strong></p>
            <span class="formula">Acute expected HCO3⁻ ≈ ${acuteExp.toFixed(1)} mmol/L (↑1 per 10 mmHg ↑PCO2)</span><br>
            <span class="formula">Chronic expected HCO3⁻ ≈ ${chronicExp.toFixed(1)} mmol/L (↑${advancedSettings.chronRespAcid} per 10 mmHg ↑PCO2)</span>
            <p>Actual HCO3⁻ = ${hco3.toFixed(1)} → `;

        if (matchAcute && matchChronic && acuity === 'unknown') {
            compensationHTML += '<span class="finding finding-info">Compatible with both acute and chronic process</span></p>';
            compensationHTML += '<p class="calc-note" style="color:var(--orange)">Select "Acute" or "Chronic" under <strong>Clinical onset</strong> above to refine interpretation</p>';
        } else if (acuity === 'chronic' && matchChronic) {
            compensationHTML += '<span class="finding finding-info">Consistent with Chronic Process</span>';
        } else if (acuity === 'acute' && matchAcute) {
            compensationHTML += '<span class="finding finding-info">Consistent with Acute Process</span>';
        } else if (matchChronic) {
            compensationHTML += '<span class="finding finding-info">Consistent with Chronic Process</span>';
        } else if (matchAcute) {
            compensationHTML += '<span class="finding finding-info">Consistent with Acute Process</span>';
        } else if (hco3 > chronicExp + 4) {
            compensationHTML += '<span class="finding finding-alkalosis">Concurrent Metabolic Alkalosis</span>';
            additionalDisorders.push('Metabolic Alkalosis');
        } else if (hco3 < acuteExp - 4) {
            compensationHTML += '<span class="finding finding-acidosis">Concurrent Metabolic Acidosis</span>';
            additionalDisorders.push('Metabolic Acidosis');
        } else {
            compensationHTML += '<span class="finding finding-info">Subacute / Partially Compensated</span>';
        }
        compensationHTML += '</p>';
    }

    if (hasRespAlkalosis && !isAmbiguousCompensated) {
        const acuteExp = acuteRespAlkalosisHCO3(pco2);
        const chronicExp = chronicRespAlkalosisHCO3(pco2);
        const acuity = v.acuity || 'unknown';
        const matchAcute = Math.abs(hco3 - acuteExp) <= 4;
        const matchChronic = Math.abs(hco3 - chronicExp) <= 4;

        compensationHTML += `<p><strong>Respiratory Alkalosis Compensation:</strong></p>
            <span class="formula">Acute expected HCO3⁻ ≈ ${acuteExp.toFixed(1)} mmol/L (↓2 per 10 mmHg ↓PCO2)</span><br>
            <span class="formula">Chronic expected HCO3⁻ ≈ ${chronicExp.toFixed(1)} mmol/L (↓5 per 10 mmHg ↓PCO2)</span>
            <p>Actual HCO3⁻ = ${hco3.toFixed(1)} → `;

        if (matchAcute && matchChronic && acuity === 'unknown') {
            compensationHTML += '<span class="finding finding-info">Compatible with both acute and chronic process</span></p>';
            compensationHTML += '<p class="calc-note" style="color:var(--orange)">Select "Acute" or "Chronic" under <strong>Clinical onset</strong> above to refine interpretation</p>';
        } else if (acuity === 'chronic' && matchChronic) {
            compensationHTML += '<span class="finding finding-info">Consistent with Chronic Process</span>';
        } else if (acuity === 'acute' && matchAcute) {
            compensationHTML += '<span class="finding finding-info">Consistent with Acute Process</span>';
        } else if (matchChronic) {
            compensationHTML += '<span class="finding finding-info">Consistent with Chronic Process</span>';
        } else if (matchAcute) {
            compensationHTML += '<span class="finding finding-info">Consistent with Acute Process</span>';
        } else if (hco3 > acuteExp + 4) {
            compensationHTML += '<span class="finding finding-alkalosis">Concurrent Metabolic Alkalosis</span>';
            additionalDisorders.push('Metabolic Alkalosis');
        } else if (hco3 < chronicExp - 4) {
            compensationHTML += '<span class="finding finding-acidosis">Concurrent Metabolic Acidosis</span>';
            additionalDisorders.push('Metabolic Acidosis');
        } else {
            compensationHTML += '<span class="finding finding-info">Subacute / Partially Compensated</span>';
        }
        compensationHTML += '</p>';
    }

    if (compensationHTML) {
        steps.push({ title: 'Step 3: Assess Compensation', html: compensationHTML });
    } else if (isNormalABG) {
        // skip compensation step for normal ABG
    }

    // ---- Step 4: Anion Gap (only if electrolytes provided) ----
    let isHAGMA = false;
    let deltaRatio = null;
    let hasConcurrentNAGMA = false;
    let hasConcurrentMetAlk = false;

    if (hasElectrolytes) {
        let agHTML = `<p><strong>Anion Gap</strong> = Na⁺ − (Cl⁻ + HCO3⁻) = ${na} − (${cl} + ${hco3.toFixed(1)}) = <strong>${ag.toFixed(1)}</strong> mmol/L</p>`;
        if (!isNaN(albumin)) {
            agHTML += `<p><strong>Albumin-corrected AG</strong> = ${ag.toFixed(1)} + 0.25 × (40 − ${albumin.toFixed(0)}) = <strong>${agCorrected.toFixed(1)}</strong> mmol/L <span class="calc-note">(albumin ${v.albumin_display} g/dL = ${albumin.toFixed(0)} g/L)</span></p>`;
        } else {
            agHTML += `<p class="calc-note" style="color:var(--orange)">Add albumin for corrected AG — critical in ICU patients with hypoalbuminemia</p>`;
        }

        isHAGMA = useAG > 12;
        let agFinding = '';
        if (useAG > 30) {
            agFinding = 'Elevated (HAGMA invariably present)';
        } else if (useAG > 20) {
            agFinding = 'Elevated (likely HAGMA)';
        } else if (useAG > 12) {
            agFinding = 'Mildly elevated (possible HAGMA)';
        } else if (useAG < 4) {
            agFinding = 'Low (consider hypoalbuminemia, myeloma, lithium)';
        } else {
            agFinding = 'Normal';
        }
        agHTML += `<p>→ <span class="finding ${isHAGMA ? 'finding-acidosis' : useAG < 4 ? 'finding-info' : 'finding-normal'}">${agFinding}</span></p>`;

        steps.push({ title: 'Step 4: Calculate Anion Gap', html: agHTML });

        // ---- Step 5: Delta Ratio (if HAGMA) ----
        if (isHAGMA) {
            let deltaHTML = '';
            deltaRatio = calcDeltaRatio(useAG, hco3, normalAG);
            const deltaAG = useAG - normalAG;
            const correctedHCO3 = hco3 + deltaAG;  // delta-delta method

            deltaHTML = `<p><strong>Delta Ratio</strong> = (AG − 12) / (24 − HCO3⁻) = (${useAG.toFixed(1)} − 12) / (24 − ${hco3.toFixed(1)}) = <strong>${deltaRatio === Infinity ? '∞' : deltaRatio.toFixed(2)}</strong></p>`;
            deltaHTML += `<p><strong>Corrected HCO3⁻</strong> (delta-delta) = HCO3⁻ + ΔAG = ${hco3.toFixed(1)} + ${deltaAG.toFixed(1)} = <strong>${correctedHCO3.toFixed(1)}</strong> mmol/L <span class="calc-note">(expected 22–26 if pure HAGMA)</span></p>`;

            const drLower = advancedSettings.drLower;
            if (deltaRatio < 0.4) {
                deltaHTML += '<p>→ <span class="finding finding-acidosis">Pure NAGMA (hyperchloremic)</span></p>';
                hasConcurrentNAGMA = true;
            } else if (deltaRatio < drLower) {
                deltaHTML += '<p>→ <span class="finding finding-mixed">Combined HAGMA + NAGMA</span></p>';
                hasConcurrentNAGMA = true;
            } else if (deltaRatio <= 2) {
                if (correctedHCO3 < 22) {
                    deltaHTML += '<p>→ <span class="finding finding-mixed">HAGMA with concurrent NAGMA</span>';
                    deltaHTML += ` (corrected HCO3⁻ = ${correctedHCO3.toFixed(1)} < 22 — additional non-AG acid or HCO3⁻ loss)</p>`;
                    hasConcurrentNAGMA = true;
                } else if (correctedHCO3 > 26) {
                    deltaHTML += '<p>→ <span class="finding finding-info">HAGMA — consider concurrent metabolic alkalosis</span>';
                    deltaHTML += ` (corrected HCO3⁻ = ${correctedHCO3.toFixed(1)} > 26 suggests pre-existing elevated HCO3⁻)</p>`;
                    if (correctedHCO3 > 28 && deltaAG < 20) {
                        hasConcurrentMetAlk = true;
                    }
                } else {
                    deltaHTML += '<p>→ <span class="finding finding-normal">Pure / uncomplicated HAGMA</span>';
                    if (deltaRatio < 1.2) deltaHTML += ' (ratio close to 1: consider DKA with urinary ketone loss)';
                    else if (deltaRatio > 1.4) deltaHTML += ' (ratio ~1.6: typical of lactic acidosis)';
                    deltaHTML += '</p>';
                }
            } else {
                deltaHTML += '<p>→ <span class="finding finding-alkalosis">Pre-existing metabolic alkalosis or compensated chronic respiratory acidosis</span></p>';
                hasConcurrentMetAlk = true;
            }
            steps.push({ title: 'Step 5: Delta Ratio & Delta-Delta', html: deltaHTML });
        }

        // Hidden HAGMA check even with normal pH
        if (!isHAGMA && pH >= 7.35 && pH <= 7.45 && useAG > 12) {
            isHAGMA = true;
        }
    } else {
        // No electrolytes — prompt user
        steps.push({ title: 'Step 4: Anion Gap', html: '<p class="calc-note" style="color:var(--orange)">Enter Na⁺ and Cl⁻ to calculate anion gap, delta ratio, and access the full differential diagnosis</p>' });
    }

    // ---- Build summary ----
    let allDisorders = [...new Set([...primaryDisorders, ...additionalDisorders])];
    // Replace generic "Metabolic Acidosis" with HAGMA label when AG is elevated
    if (isHAGMA) {
        const idx = allDisorders.indexOf('Metabolic Acidosis');
        if (idx !== -1) allDisorders[idx] = 'HAGMA (Metabolic Acidosis)';
        else if (!allDisorders.some(d => d.includes('HAGMA'))) allDisorders.push('HAGMA');
    }
    if (hasConcurrentNAGMA) allDisorders.push('NAGMA component');
    if (hasConcurrentMetAlk && !allDisorders.some(d => d.includes('Metabolic Alkalosis'))) allDisorders.push('Metabolic Alkalosis component');

    const summaryBanner = document.getElementById('summary-banner');
    summaryBanner.className = bannerClass;
    summaryBanner.innerHTML = `${phStatus}${allDisorders.length ? `<span class="banner-subtitle">${allDisorders.join('  •  ')}</span>` : ''}`;

    // ---- Initialize calc items early (oxygenation section pushes to it) ----
    let calcItems = [
        { label: 'pH (arterial-eq)', value: pH.toFixed(2), cls: pH < 7.35 ? 'val-low' : pH > 7.45 ? 'val-high' : 'val-normal' },
        { label: 'PaCO2', value: pco2.toFixed(1) + ' mmHg', cls: pco2 > 45 ? 'val-high' : pco2 < 35 ? 'val-low' : 'val-normal' },
        { label: 'HCO3⁻', value: hco3.toFixed(1) + ' mmol/L', cls: hco3 < 22 ? 'val-low' : hco3 > 26 ? 'val-high' : 'val-normal' },
    ];
    if (hasElectrolytes) {
        calcItems.push({ label: 'Anion Gap', value: ag.toFixed(1), cls: ag > 12 ? 'val-high' : ag < 4 ? 'val-low' : 'val-normal', note: !isNaN(albumin) ? `Corrected: ${agCorrected.toFixed(1)}` : null });
    }
    if (deltaRatio !== null && deltaRatio !== Infinity) {
        calcItems.push({ label: 'Delta Ratio', value: deltaRatio.toFixed(2), cls: deltaRatio < advancedSettings.drLower ? 'val-warn' : deltaRatio > 2 ? 'val-warn' : 'val-normal' });
    }
    if (!isNaN(lactate)) {
        calcItems.push({ label: 'Lactate', value: lactate.toFixed(1) + ' mmol/L', cls: lactate > 2 ? 'val-high' : 'val-normal' });
    }

    // ---- Oxygenation Assessment ----
    if (!isNaN(po2) && !v.isVBG) {
        let o2HTML = `<p>PaO2 = <strong>${po2}</strong> mmHg → `;
        if (po2 < 60) o2HTML += '<span class="finding finding-acidosis">Severe Hypoxemia</span>';
        else if (po2 < 80) o2HTML += '<span class="finding finding-mixed">Mild Hypoxemia</span>';
        else if (po2 <= 100) o2HTML += '<span class="finding finding-normal">Normal</span>';
        else o2HTML += '<span class="finding finding-info">Elevated (supplemental O2?)</span>';
        o2HTML += '</p>';

        // A-a gradient
        const fio2 = !isNaN(v.fio2) ? v.fio2 : 0.21;
        const pAtm = 760, pH2O = 47, RQ = 0.8;
        const pAO2 = fio2 * (pAtm - pH2O) - (pco2 / RQ);
        const aaGrad = pAO2 - po2;
        const age = v.age;
        const expectedAA = !isNaN(age) ? (advancedSettings.aaFormula === 'quarter' ? (age + 10) / 4 : 2.5 + 0.21 * age) : NaN;

        o2HTML += `<p><strong>A-a Gradient</strong> = PAO2 − PaO2 = ${pAO2.toFixed(1)} − ${po2} = <strong>${aaGrad.toFixed(1)}</strong> mmHg`;
        if (!isNaN(v.fio2)) {
            o2HTML += ` <span class="calc-note">(FiO2 = ${fio2})</span>`;
        } else {
            o2HTML += ` <span class="calc-note">(assuming room air FiO2 0.21)</span>`;
        }
        o2HTML += '</p>';

        if (!isNaN(expectedAA)) {
            o2HTML += `<p>Expected A-a for age ${age}: <strong>${expectedAA.toFixed(1)}</strong> mmHg → `;
            if (aaGrad > expectedAA + 10) o2HTML += '<span class="finding finding-acidosis">Significantly elevated</span> (V/Q mismatch, shunt, or diffusion impairment)';
            else if (aaGrad > expectedAA) o2HTML += '<span class="finding finding-mixed">Mildly elevated</span>';
            else o2HTML += '<span class="finding finding-normal">Normal</span>';
            o2HTML += '</p>';
        } else {
            if (aaGrad > 15) o2HTML += `<p>→ <span class="finding finding-mixed">Elevated</span> (add age for expected A-a calculation)</p>`;
            else o2HTML += `<p>→ <span class="finding finding-normal">Normal</span></p>`;
        }

        // P/F ratio
        if (!isNaN(v.fio2) && v.fio2 > 0) {
            const pf = po2 / v.fio2;
            o2HTML += `<p><strong>P/F Ratio</strong> = ${po2} / ${v.fio2} = <strong>${pf.toFixed(0)}</strong> → `;
            if (pf >= 400) o2HTML += '<span class="finding finding-normal">Normal</span>';
            else if (pf >= 300) o2HTML += '<span class="finding finding-mixed">Mild impairment</span>';
            else if (pf >= 200) o2HTML += '<span class="finding finding-acidosis">Mild ARDS (Berlin)</span>';
            else if (pf >= 100) o2HTML += '<span class="finding finding-acidosis">Moderate ARDS (Berlin)</span>';
            else o2HTML += '<span class="finding finding-acidosis">Severe ARDS (Berlin)</span>';
            o2HTML += '</p>';
            calcItems.push({ label: 'P/F Ratio', value: pf.toFixed(0), cls: pf >= 300 ? 'val-normal' : pf >= 200 ? 'val-warn' : 'val-high' });
        }

        calcItems.push({ label: 'A-a Gradient', value: aaGrad.toFixed(1), cls: aaGrad > 15 ? 'val-high' : 'val-normal' });
        steps.push({ title: 'Oxygenation Assessment', html: o2HTML });
    }

    // ---- Lactate ----
    if (!isNaN(lactate)) {
        let lactHTML = `<p>Lactate = <strong>${lactate.toFixed(1)}</strong> mmol/L → `;
        if (lactate > 4) lactHTML += '<span class="finding finding-acidosis">Severely elevated</span>';
        else if (lactate > 2) lactHTML += '<span class="finding finding-mixed">Elevated</span>';
        else lactHTML += '<span class="finding finding-normal">Normal</span>';
        lactHTML += '</p>';
        steps.push({ title: 'Lactate', html: lactHTML });
    }

    // ---- Osmolar Gap ----
    let calcOsmGap = NaN;
    if (!isNaN(na)) {
        const glu = v.glucose;  // mg/dL
        const bun = v.bun;      // mg/dL
        const measOsm = v.measOsm;
        // Calculate expected osmolality: 2*Na + Glucose/18 + BUN/2.8
        const hasGlu = !isNaN(glu);
        const hasBUN = !isNaN(bun);
        const calcOsm = 2 * na + (hasGlu ? glu / 18 : 0) + (hasBUN ? bun / 2.8 : 0);

        if (!isNaN(measOsm) && hasGlu && hasBUN) {
            calcOsmGap = measOsm - calcOsm;
            window._calcOsmGap = calcOsmGap;
            let osmHTML = `<p><strong>Calculated Osmolality</strong> = 2 × ${na} + ${glu}/18 + ${bun}/2.8 = <strong>${calcOsm.toFixed(0)}</strong> mOsm/kg</p>`;
            osmHTML += `<p><strong>Osmolar Gap</strong> = ${measOsm} − ${calcOsm.toFixed(0)} = <strong>${calcOsmGap.toFixed(0)}</strong> mOsm/kg → `;
            if (calcOsmGap > 10) {
                osmHTML += '<span class="finding finding-acidosis">Elevated</span> (consider toxic alcohols: methanol, ethylene glycol, propylene glycol)';
            } else {
                osmHTML += '<span class="finding finding-normal">Normal</span>';
            }
            osmHTML += '</p>';
            steps.push({ title: 'Osmolar Gap', html: osmHTML });
        } else if (!isNaN(measOsm)) {
            // Partial data — show what we can
            let missing = [];
            if (!hasGlu) missing.push('glucose');
            if (!hasBUN) missing.push('BUN');
            let osmHTML = `<p class="calc-note" style="color:var(--orange)">Add ${missing.join(' and ')} to calculate osmolar gap (measured osmolality provided: ${measOsm})</p>`;
            steps.push({ title: 'Osmolar Gap', html: osmHTML });
        }
    }

    // ---- "Add more data" prompts ----
    let promptsHTML = '';
    const missingPrompts = [];
    if (!hasElectrolytes) missingPrompts.push('Na⁺ and Cl⁻ for anion gap analysis');
    if (hasElectrolytes && isHAGMA && isNaN(v.measOsm)) missingPrompts.push('measured osmolality to calculate osmolar gap (rule out toxic alcohols)');
    if (isNaN(lactate) && (hasMetAcidosis || (hasElectrolytes && isHAGMA))) missingPrompts.push('lactate to differentiate HAGMA causes');
    if (isNaN(v.glucose) && hasMetAcidosis) missingPrompts.push('glucose to evaluate for DKA');
    if (isNaN(albumin) && hasElectrolytes) missingPrompts.push('albumin for corrected anion gap');
    if (isNaN(po2)) missingPrompts.push('PaO2 for oxygenation assessment');
    if (missingPrompts.length > 0 && !isNormalABG) {
        promptsHTML = '<div class="analysis-step"><h4>Refine Your Analysis</h4><p>Consider adding:</p><ul style="margin:6px 0 0 18px; font-size:0.9rem; color:var(--text-muted)">';
        missingPrompts.forEach(p => { promptsHTML += `<li>${p}</li>`; });
        promptsHTML += '</ul></div>';
    }

    // ---- Render calculated values ----
    const calcDiv = document.getElementById('calc-values');

    if (!isNaN(calcOsmGap)) {
        calcItems.push({ label: 'Osmolar Gap', value: calcOsmGap.toFixed(0), cls: calcOsmGap > 10 ? 'val-high' : 'val-normal' });
    }

    calcDiv.innerHTML = calcItems.map(c =>
        `<div class="calc-item"><div class="calc-label">${c.label}</div><div class="calc-value ${c.cls}">${c.value}</div>${c.note ? `<div class="calc-note">${c.note}</div>` : ''}</div>`
    ).join('');

    // ---- Render analysis steps ----
    const stepsDiv = document.getElementById('analysis-steps');
    stepsDiv.innerHTML = steps.map(s =>
        `<div class="analysis-step"><h4>${s.title}</h4>${s.html}</div>`
    ).join('') + promptsHTML;

    // ---- Render DDx ----
    const ddxSection = document.getElementById('ddx-section');
    const ddxList = document.getElementById('ddx-list');
    const ddxFilters = document.getElementById('ddx-filters');

    let activeDDx = [];
    const ddxAdded = new Set();
    function addDDx(type, label) {
        if (!ddxAdded.has(type)) { ddxAdded.add(type); activeDDx.push({ type, label }); }
    }

    if (isHAGMA) addDDx('hagma', 'High AG Metabolic Acidosis');
    if (hasConcurrentNAGMA || (hasMetAcidosis && !isHAGMA && hasElectrolytes) || (hasMetAcidosis && isHAGMA && deltaRatio !== null && deltaRatio < advancedSettings.drLower)) addDDx('nagma', 'Normal AG Metabolic Acidosis');
    // When metabolic acidosis present but no electrolytes → show both HAGMA and NAGMA DDx
    if (hasMetAcidosis && !hasElectrolytes) {
        addDDx('hagma', 'High AG Metabolic Acidosis (add Na⁺/Cl⁻ to confirm)');
        addDDx('nagma', 'Normal AG Metabolic Acidosis (add Na⁺/Cl⁻ to confirm)');
    }
    if (hasMetAlkalosis || hasConcurrentMetAlk || allDisorders.some(d => d.includes('Metabolic Alkalosis'))) addDDx('metAlk', 'Metabolic Alkalosis');
    if (hasRespAcidosis || additionalDisorders.includes('Respiratory Acidosis')) addDDx('respAcidosis', 'Respiratory Acidosis');
    if (hasRespAlkalosis || additionalDisorders.includes('Respiratory Alkalosis')) addDDx('respAlkalosis', 'Respiratory Alkalosis');

    if (activeDDx.length === 0 && primaryDisorders.length === 0 && hasElectrolytes) {
        if (useAG > 12) {
            addDDx('hagma', 'High AG Metabolic Acidosis (Hidden)');
        }
    }

    window._lastScoredDDx = [];
    if (activeDDx.length === 0) {
        ddxSection.classList.add('hidden');
    } else {
        ddxSection.classList.remove('hidden');
        renderDDx(activeDDx, v);
    }

    // ---- Telemetry Submission ----
    try {
        let fieldsFilled = 0;
        const allKeys = ['pH', 'pco2', 'hco3', 'na', 'cl', 'albumin', 'lactate', 'glucose', 'bun', 'po2', 'fio2', 'age'];
        allKeys.forEach(k => { if (!isNaN(v[k])) fieldsFilled++; });
        
        let iCount = parseInt(localStorage.getItem('interpret_count') || '0', 10) + 1;
        localStorage.setItem('interpret_count', iCount);

        fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sample_type: v.isVBG ? 'vbg' : 'abg',
                ph: v.pH,
                pco2: v.pco2,
                hco3: v.hco3,
                na: !isNaN(v.na) ? v.na : null,
                cl: !isNaN(v.cl) ? v.cl : null,
                albumin: !isNaN(v.albumin) ? v.albumin : null,
                pao2: !isNaN(v.po2) ? v.po2 : null,
                fio2: !isNaN(v.fio2) ? v.fio2 : null,
                age: !isNaN(v.age) ? v.age : null,
                lactate: !isNaN(v.lactate) ? v.lactate : null,
                glucose: !isNaN(v.glucose) ? v.glucose : null,
                bun: !isNaN(v.bun) ? v.bun : null,
                meas_osm: !isNaN(v.measOsm) ? v.measOsm : null,
                acuity: v.acuity || 'unknown',
                primary_disorder: primaryDisorders ? primaryDisorders.join(', ') : '',
                anion_gap: !isNaN(useAG) ? useAG : null,
                delta_ratio: deltaRatio !== null && deltaRatio !== Infinity ? deltaRatio : null,
                schema_v: 1,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                browser_lang: navigator.language,
                device_type: /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'mobile/tablet' : 'desktop',
                fields_filled: fieldsFilled,
                diff_dx_count: activeDDx.length,
                diff_dx_details: window._lastScoredDDx || [],
                interpret_count: iCount
            })
        }).catch(() => {});
    } catch (e) {}
}

function renderDDx(activeDDx, values) {
    const ddxList = document.getElementById('ddx-list');
    const ddxFilters = document.getElementById('ddx-filters');

    // Build narrowing UI
    let narrowHTML = `<div class="narrow-section"><h4>Narrow the Differential — Clinical Context</h4><div class="narrow-grid">`;
    const narrowFields = [
        { id: 'n-diarrhea', label: 'Diarrhea' },
        { id: 'n-vomiting', label: 'Vomiting / NG suction' },
        { id: 'n-renal', label: 'Renal disease' },
        { id: 'n-dm', label: 'Diabetes mellitus' },
        { id: 'n-alcohol', label: 'Alcohol use' },
        { id: 'n-sepsis', label: 'Sepsis / infection' },
        { id: 'n-ingestion', label: 'Ingestion / overdose' },
        { id: 'n-hypotension', label: 'Hypotension / shock' },
        { id: 'n-htn', label: 'Hypertension' },
        { id: 'n-surgery', label: 'Recent surgery' },
        { id: 'n-pregnancy', label: 'Pregnancy' },
        { id: 'n-liver', label: 'Liver disease' },
        { id: 'n-lung', label: 'COPD / asthma / lung disease' },
        { id: 'n-neuro', label: 'Neuromuscular disease' },
        { id: 'n-ventilator', label: 'Mechanical ventilation' },
        { id: 'n-trauma', label: 'Trauma / head injury' },
        { id: 'n-anxiety', label: 'Anxiety / pain' },
        { id: 'n-obesity', label: 'Obesity' },
    ];

    narrowFields.forEach(f => {
        narrowHTML += `<div class="narrow-item"><input type="checkbox" id="${f.id}" onchange="refilterDDx()"><label for="${f.id}">${f.label}</label></div>`;
    });

    narrowHTML += `</div>
        <div class="inline-input-group" style="margin-top:12px">
            <label for="n-potassium">K⁺ (mmol/L):</label>
            <input type="number" id="n-potassium" step="0.1" placeholder="" onchange="refilterDDx()">
        </div>
    </div>`;

    // Store active DDx globally for re-filtering
    window._activeDDx = activeDDx;
    window._abgValues = values;

    // Render DDx list
    ddxFilters.innerHTML = narrowHTML;
    renderDDxItems(activeDDx, {});
}

function refilterDDx() {
    const ctx = {
        diarrhea: document.getElementById('n-diarrhea').checked,
        vomiting: document.getElementById('n-vomiting').checked,
        renal: document.getElementById('n-renal').checked,
        dm: document.getElementById('n-dm').checked,
        alcohol: document.getElementById('n-alcohol').checked,
        sepsis: document.getElementById('n-sepsis').checked,
        ingestion: document.getElementById('n-ingestion').checked,
        hypotension: document.getElementById('n-hypotension').checked,
        htn: document.getElementById('n-htn').checked,
        surgery: document.getElementById('n-surgery').checked,
        pregnancy: document.getElementById('n-pregnancy').checked,
        liver: document.getElementById('n-liver').checked,
        lung: document.getElementById('n-lung').checked,
        neuro: document.getElementById('n-neuro').checked,
        ventilator: document.getElementById('n-ventilator').checked,
        trauma: document.getElementById('n-trauma').checked,
        anxiety: document.getElementById('n-anxiety').checked,
        obesity: document.getElementById('n-obesity').checked,
        potassium: parseFloat(document.getElementById('n-potassium').value),
        glucose: getGlucoseMGDL(),
        osmgap: window._calcOsmGap,
    };
    renderDDxItems(window._activeDDx, ctx);
}

// Track manually clicked DDx items (survives re-render, but NOT checkbox changes)
let manualDDxStates = {};

function renderDDxItems(activeDDx, ctx) {
    const ddxList = document.getElementById('ddx-list');
    let html = '';
    window._lastScoredDDx = [];

    activeDDx.forEach(group => {
        const items = DDX[group.type] || [];
        html += `<h4 style="margin: 16px 0 10px; color: var(--accent); font-size: 0.95rem">${group.label}</h4>`;

        const categories = {};
        items.forEach(item => {
            if (!categories[item.category]) categories[item.category] = [];
            categories[item.category].push(item);
        });

        // Score all items first, then sort: likely → neutral → unlikely, alphabetically within each
        const scored = items.map(item => {
            const { score, reasons } = scoreDDx(item, ctx, window._abgValues);
            const id = `ddx-${group.type}-${item.name.replace(/[^a-zA-Z0-9]/g, '')}`;
            const manual = manualDDxStates[id];
            const cls = manual || (score > 0 ? 'likely' : score < 0 ? 'unlikely' : '');
            
            window._lastScoredDDx.push({ name: item.name, category: item.category, score: score, status: cls });
            
            return { item, score, reasons, id, cls };
        });

        scored.sort((a, b) => {
            const order = { likely: 0, '': 1, unlikely: 2 };
            const oa = order[a.cls] ?? 1, ob = order[b.cls] ?? 1;
            if (oa !== ob) return oa - ob;
            return a.item.name.localeCompare(b.item.name);
        });

        scored.forEach(({ item, score, reasons, id, cls }) => {
            const icon = cls === 'likely' ? '✓' : cls === 'unlikely' ? '✗' : '';

            const reasonHTML = reasons.length ? `<div class="ddx-reasons">${reasons.map(r =>
                `<span class="ddx-reason ${r.dir > 0 ? 'reason-for' : 'reason-against'}">${r.text}</span>`
            ).join('')}</div>` : '';

            html += `<div class="ddx-item ${cls}" id="${id}" onclick="toggleDDx('${id}')">
                <div class="ddx-status">${icon}</div>
                <div>
                    <div class="ddx-name">${item.name}</div>
                    <div class="ddx-detail">${item.detail}</div>
                    ${reasonHTML}
                    <div class="ddx-tags">${item.tags.map(t => `<span class="ddx-tag">${t}</span>`).join('')}</div>
                </div>
            </div>`;
        });
    });

    ddxList.innerHTML = html;
}

function scoreDDx(item, ctx, values) {
    let score = 0;
    const reasons = [];
    const c = item.clues || {};

    function add(pts, text) { score += pts; reasons.push({ dir: pts, text }); }

    // Positive signals
    if (ctx.diarrhea && c.diarrhea) add(2, 'diarrhea present');
    if (ctx.vomiting && c.vomiting) add(2, 'vomiting present');
    if (ctx.renal && c.renal) add(2, 'renal disease');
    if (ctx.alcohol && c.alcohol) add(2, 'alcohol use');
    if (ctx.htn && c.hypertension) add(2, 'hypertension');

    if (ctx.dm && c.glucose === 'high') add(2, 'diabetes mellitus');
    if (!isNaN(ctx.glucose) && ctx.glucose > 250 && c.glucose === 'high') add(2, 'glucose > 250');
    if (!isNaN(ctx.glucose) && ctx.glucose < 90 && c.glucose === 'high') add(-1, 'glucose normal');

    if (values && !isNaN(values.lactate) && values.lactate > 2 && c.lactatElevated) add(2, 'lactate elevated');
    if (values && !isNaN(values.lactate) && values.lactate <= 2 && c.lactatElevated) add(-1, 'lactate normal');

    if (!isNaN(ctx.osmgap) && ctx.osmgap > 10 && c.osmolarGap) add(2, 'osmolar gap elevated');
    if (!isNaN(ctx.osmgap) && ctx.osmgap <= 10 && c.osmolarGap) add(-1, 'osmolar gap normal');

    if (!isNaN(ctx.potassium)) {
        if (ctx.potassium > 5.5 && c.potassium === 'high') add(1, 'K⁺ elevated');
        if (ctx.potassium < 3.5 && c.potassium === 'low') add(1, 'K⁺ low');
        if (ctx.potassium > 5.5 && c.potassium === 'low') add(-1, 'K⁺ elevated (expected low)');
        if (ctx.potassium < 3.5 && c.potassium === 'high') add(-1, 'K⁺ low (expected high)');
    }

    if (values && !isNaN(values.cl) && values.cl > 106 && c.chloride === 'high') add(1, 'Cl⁻ elevated');
    if (ctx.hypotension && c.hypotension) add(2, 'hypotension');
    if (ctx.dm && c.dm) add(2, 'diabetes mellitus');
    if (ctx.lung && c.lung) add(2, 'lung disease');
    if (ctx.neuro && c.neuro) add(2, 'neuromuscular disease');
    if (ctx.ventilator && c.ventilator) add(2, 'mechanical ventilation');
    if (ctx.trauma && c.trauma) add(2, 'trauma/injury');
    if (ctx.anxiety && c.anxiety) add(2, 'anxiety/pain');
    if (ctx.obesity && c.obesity) add(2, 'obesity');

    // Tag-based matching
    if (ctx.pregnancy && item.name === 'Pregnancy') add(2, 'pregnancy');
    if (ctx.pregnancy && c.pregnancy) add(2, 'pregnancy');
    if (ctx.sepsis && (item.tags.includes('sepsis') || item.tags.includes('infection'))) add(1, 'sepsis context');
    if (ctx.sepsis && c.sepsis) add(1, 'sepsis context');
    if (ctx.ingestion && c.ingestion) add(2, 'ingestion/overdose');
    if (ctx.ingestion && !c.ingestion && (item.tags.includes('drug') || item.tags.includes('toxic alcohol'))) add(1, 'ingestion context');
    if (ctx.hypotension && (item.tags.includes('shock') || item.tags.includes('sepsis'))) add(1, 'shock/hypotension');
    if (ctx.liver && (item.tags.includes('liver') || c.liver)) add(2, 'liver disease');
    if (ctx.surgery && (item.tags.includes('surgical') || c.surgery)) add(1, 'surgical history');

    return { score, reasons };
}

function toggleDDx(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.classList.contains('likely')) {
        el.classList.remove('likely');
        el.classList.add('unlikely');
        el.querySelector('.ddx-status').textContent = '✗';
        manualDDxStates[id] = 'unlikely';
    } else if (el.classList.contains('unlikely')) {
        el.classList.remove('unlikely');
        el.querySelector('.ddx-status').textContent = '';
        delete manualDDxStates[id];  // back to auto-scoring
    } else {
        el.classList.add('likely');
        el.querySelector('.ddx-status').textContent = '✓';
        manualDDxStates[id] = 'likely';
    }
}

// Allow Enter key to trigger interpretation
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
        interpret();
    }
});

// ---- 2.6: Share / Copy functions ----
function copyLink() {
    const fields = ['pH', 'pco2', 'hco3', 'na', 'cl', 'albumin', 'lactate', 'po2', 'fio2', 'age', 'glucose', 'bun', 'measOsm'];
    const params = new URLSearchParams();
    if (sampleType === 'vbg') params.set('type', 'vbg');
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value !== '') params.set(id, el.value);
    });
    const url = window.location.origin + window.location.pathname + '?' + params.toString();
    navigator.clipboard.writeText(url).then(() => {
        showToast('Link copied to clipboard');
    });
}

function copyText() {
    const banner = document.getElementById('summary-banner');
    const steps = document.getElementById('analysis-steps');
    let text = '=== ABG/VBG Interpretation ===\n';
    text += banner.textContent.trim() + '\n\n';
    steps.querySelectorAll('.analysis-step').forEach(step => {
        const title = step.querySelector('h4');
        if (title) text += title.textContent + '\n';
        text += step.textContent.replace(title ? title.textContent : '', '').trim() + '\n\n';
    });
    navigator.clipboard.writeText(text).then(() => {
        showToast('Text copied to clipboard');
    });
}

function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = 'toast show';
    setTimeout(() => { toast.className = 'toast'; }, 2000);
}

// Load from URL params on page load
// Auto-expand collapsed sections that have data
function autoExpandSections() {
    const groups = {
        'grp-electrolytes': ['na', 'cl', 'albumin'],
        'grp-oxygenation': ['po2', 'fio2', 'age'],
        'grp-labs': ['lactate', 'glucose', 'bun', 'measOsm'],
        // acuity is now inline, no collapsible group
    };
    Object.entries(groups).forEach(([grpId, fields]) => {
        const hasData = fields.some(id => {
            const el = document.getElementById(id);
            return el && el.value && el.value !== '' && el.value !== 'unknown';
        });
        const grp = document.getElementById(grpId);
        if (grp && hasData) grp.classList.add('open');
    });
}

(function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    if (params.size === 0) return;
    if (params.get('type') === 'vbg') setSampleType('vbg');
    ['pH', 'pco2', 'hco3', 'na', 'cl', 'albumin', 'lactate', 'po2', 'fio2', 'age', 'glucose', 'bun', 'measOsm'].forEach(id => {
        const val = params.get(id);
        const el = document.getElementById(id);
        if (val && el) el.value = val;
    });
    autoExpandSections();
    if (params.has('pH') && params.has('pco2') && params.has('hco3')) {
        setTimeout(interpret, 100);
    }
})();
