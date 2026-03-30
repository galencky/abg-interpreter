import { sql } from '@vercel/postgres'

const ALLOWED = [
  'sample_type', 'ph', 'pco2', 'hco3', 'na', 'cl', 'albumin',
  'lactate', 'glucose', 'bun', 'pao2', 'fio2', 'age',
  'primary_disorder', 'compensation', 'anion_gap',
  'delta_ratio', 'device_type', 'browser', 'os',
  'browser_lang', 'timezone', 'referrer_domain',
  'time_to_submit_ms', 'interpret_count',
  'used_share', 'used_copy_text', 'used_vbg_convert',
  'fields_filled', 'diff_dx_count', 'schema_v'
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const data = req.body
    const clean = {}
    for (const key of ALLOWED) {
      if (data[key] !== undefined) clean[key] = data[key]
    }

    // Geo from Vercel headers
    clean.country = req.headers['x-vercel-ip-country'] || null
    clean.region = req.headers['x-vercel-ip-country-region'] || null

    const cols = Object.keys(clean)
    const vals = Object.values(clean)
    const placeholders = cols.map((_, i) => `$${i + 1}`)

    if (cols.length > 0) {
      await sql.query(
        `INSERT INTO submissions (${cols.join(',')}) VALUES (${placeholders.join(',')})`,
        vals
      )
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('Submit error:', err)
    res.status(400).json({ error: 'invalid' })
  }
}
