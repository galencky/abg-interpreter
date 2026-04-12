import { neon } from '@neondatabase/serverless'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL)

    // Fetch recent submissions — only anonymous lab data and diagnoses
    // Excludes geo, browser, device info for privacy
    const rows = await sql(`
      SELECT
        created_at,
        payload->>'sample_type' AS sample_type,
        payload->>'ph' AS ph,
        payload->>'pco2' AS pco2,
        payload->>'hco3' AS hco3,
        payload->>'na' AS na,
        payload->>'cl' AS cl,
        payload->>'albumin' AS albumin,
        payload->>'lactate' AS lactate,
        payload->>'glucose' AS glucose,
        payload->>'anion_gap' AS anion_gap,
        payload->>'delta_ratio' AS delta_ratio,
        payload->>'primary_disorder' AS primary_disorder,
        payload->'diff_dx_details' AS diff_dx_details
      FROM submissions
      ORDER BY created_at DESC
      LIMIT 50
    `)

    res.json({ cases: rows })
  } catch (err) {
    console.error('Community fetch error:', err)
    res.status(500).json({ error: 'failed' })
  }
}
