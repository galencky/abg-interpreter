import { neon } from '@neondatabase/serverless'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const payload = req.body || {}

    // Security check: Prevent massive JSON payload spams
    const payloadString = JSON.stringify(payload)
    if (payloadString.length > 50000) {
      return res.status(413).json({ error: 'Payload too large' })
    }

    // Capture geolocation from Vercel infrastructure headers
    const country = req.headers['x-vercel-ip-country'] || null
    const region = req.headers['x-vercel-ip-country-region'] || null

    // Initialize Neon client
    const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL)

    // We store the exact unaltered JSON inside the payload column.
    // This allows the frontend to mutate or send new data arrays/columns
    // seamlessly without needing to alter the database schema or api handler.
    await sql(
      `INSERT INTO submissions (country, region, payload) VALUES ($1, $2, $3)`,
      [country, region, payloadString]
    )

    res.json({ ok: true })
  } catch (err) {
    console.error('Submit error:', err)
    res.status(400).json({ error: 'invalid' })
  }
}
